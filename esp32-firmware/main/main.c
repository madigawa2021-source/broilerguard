/*
 * BroilerGuard ESP32-S3 Firmware — ESP-IDF
 * AI-Powered Broiler Chicken Pen Monitor
 *
 * Hardware:
 *   - DHT11          → Temperature + Humidity         (GPIO4)
 *   - Vibration      → Intrusion detection            (GPIO13)
 *   - LDR            → Light/power outage detection   (GPIO34 ADC)
 *   - Fan relay      → Auto cooling                   (GPIO26)
 *   - Water mister   → Auto humidity control          (GPIO25)
 *   - Light relay    → Pen lighting                   (GPIO27)
 *   - Heater relay   → Auto heating                   (GPIO33)
 *   - Buzzer         → Local alarm                    (GPIO12)
 *   - Servo motor    → Camera angle rotation (LEDC)   (GPIO32)
 *   - OV5640 camera  → AI vision (onboard ESP32-S3)
 *
 * Firebase paths:
 *   PUT  /sensors.json   → live values   (every 60s)
 *   POST /history.json   → chart data    (every 1hr)
 *   POST /alerts.json    → alert events  (on threshold breach)
 *
 * Behavior:
 *   IDLE      → read all sensors every 60s, control relays automatically
 *   ALERT     → buzzer + immediate Firebase push + relay action
 *   INTRUSION → vibration detected → buzzer + Firebase alert
 */

#include <stdio.h>
#include <string.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_http_client.h"
//#include "esp_tls.h"
#include "esp_timer.h"
#include "dht.h"
#include "esp_crt_bundle.h"
#include "cJSON.h"
#include "mbedtls/base64.h"
#include "esp_camera.h"
#include "lwip/dns.h"
#include "lwip/netdb.h"
#include "lwip/ip_addr.h"

static const char *TAG = "BroilerGuard";

// ─── USER CONFIGURATION — CHANGE THESE ───────────────────────────────────────
#define WIFI_SSID           "Redmi 9C"
#define WIFI_PASSWORD       "10987654321"
#define FIREBASE_HOST       "https://broilerguard-default-rtdb.europe-west1.firebasedatabase.app"
#define FIREBASE_AUTH       "iauTh0i8FbK9evb2azrzvMPzdFgt3WiYHo13faiJ"

// ─── GEMINI CONFIGURATION ─────────────────────────────────────────────────────
#define GEMINI_API_KEY   "AIzaSyBN6Fms35wo3I4ed2bp571inJw-6VGvCUg"
#define GEMINI_HOST      "generativelanguage.googleapis.com"
#define GEMINI_PORT      443
#define GEMINI_MODEL     "gemini-3.1-flash-lite-preview"
#define GEMINI_PATH      "/v1beta/models/" GEMINI_MODEL ":generateContent?key=" GEMINI_API_KEY

// ─── PIN DEFINITIONS ─────────────────────────────────────────────────────────
#define DHT11_GPIO          GPIO_NUM_41
#define VIBRATION_GPIO      GPIO_NUM_39
#define LDR_ADC_CHANNEL     ADC_CHANNEL_2 // GPIO 3
#define FAN_RELAY_GPIO      GPIO_NUM_48
#define MISTER_RELAY_GPIO   GPIO_NUM_47
#define LIGHT_RELAY_GPIO    GPIO_NUM_21
#define HEATER_RELAY_GPIO   GPIO_NUM_45
#define BUZZER_GPIO         GPIO_NUM_38
#define SERVO_GPIO          GPIO_NUM_40

// ─── CAMERA PINS (ESP32-S3-CAM) ──────────────────────────────────────────────
#define CAM_PIN_PWDN    -1
#define CAM_PIN_RESET   -1
#define CAM_PIN_XCLK    15
#define CAM_PIN_SIOD    4
#define CAM_PIN_SIOC    5
#define CAM_PIN_D7      16
#define CAM_PIN_D6      17
#define CAM_PIN_D5      18
#define CAM_PIN_D4      12
#define CAM_PIN_D3      10
#define CAM_PIN_D2      8
#define CAM_PIN_D1      9
#define CAM_PIN_D0      11
#define CAM_PIN_VSYNC   6
#define CAM_PIN_HREF    7
#define CAM_PIN_PCLK    13

// ─── SERVO (LEDC) ─────────────────────────────────────────────────────────────
#define SERVO_LEDC_CH       LEDC_CHANNEL_0
#define SERVO_LEDC_TIMER    LEDC_TIMER_0
#define SERVO_FREQ_HZ       50
#define SERVO_RESOLUTION    LEDC_TIMER_14_BIT  // 16384 ticks = 20ms
// Pulse widths at 50Hz 14-bit: 0°=819, 90°=1229, 180°=1638

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────
#define TEMP_MAX            33.0f
#define TEMP_MIN            28.0f
#define TEMP_CRITICAL_HIGH  37.0f
#define TEMP_CRITICAL_LOW   25.0f
#define HUMIDITY_MAX        80.0f
#define HUMIDITY_MIN        40.0f
#define LDR_DARK_THRESHOLD  500  // Increased threshold for internal pull-down1
// ─── TIMING ───────────────────────────────────────────────────────────────────
#define SENSOR_INTERVAL_MS      5000
#define HISTORY_INTERVAL_MS     3600000
#define BUZZER_SHORT_MS         200
#define BUZZER_LONG_MS          1000

// ─── WIFI ─────────────────────────────────────────────────────────────────────
static EventGroupHandle_t wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0

// ─── HTTP BUFFER ──────────────────────────────────────────────────────────────
#define HTTP_BUF_SIZE 8192
static char http_response_buf[HTTP_BUF_SIZE];
static int  http_response_len = 0;

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
static bool g_power_ok      = true;
static bool g_fan_on        = false;
static bool g_mister_on     = false;
static bool g_light_on      = false;
static bool g_heater_on     = false;
static bool g_vibration     = false;
static int  g_servo_angle   = 90;

static TaskHandle_t security_task_handle = NULL;
static volatile bool g_gemini_active = false;

// ─────────────────────────────────────────────────────────────────────────────
// WIFI
// ─────────────────────────────────────────────────────────────────────────────

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                                int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "WiFi disconnected — retrying...");
        esp_wifi_connect();
        xEventGroupClearBits(wifi_event_group, WIFI_CONNECTED_BIT);
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "WiFi connected. IP: " IPSTR, IP2STR(&event->ip_info.ip));
        xEventGroupSetBits(wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

static void wifi_init(void)
{
    wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    
    esp_netif_t *sta_netif = esp_netif_create_default_wifi_sta();
    esp_netif_set_hostname(sta_netif, "broilerguard"); // CRITICAL for Android Hotspots!

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler, NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler, NULL,
                                                        &instance_got_ip));
    wifi_config_t wifi_config = {
        .sta = {
            .ssid     = WIFI_SSID,
            .password = WIFI_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_MIN_MODEM)); // Restore normal power save (fixes ESP32 overheating)
    
    // REDUCE WIFI TX POWER TO PREVENT HARDWARE BROWNOUT!
    // Set to 56 (14dBm) for better stability during high-current tasks (TLS/Camera)
    ESP_ERROR_CHECK(esp_wifi_set_max_tx_power(56)); 
    
    ESP_LOGI(TAG, "Connecting to WiFi: %s ...", WIFI_SSID);
    xEventGroupWaitBits(wifi_event_group, WIFI_CONNECTED_BIT,
                        pdFALSE, pdTRUE, portMAX_DELAY);

    // Force Static DNS (Google 8.8.8.8) to bypass hotspot DNS issues
    esp_netif_dns_info_t dns;
    ip4addr_aton("8.8.8.8", (ip4_addr_t *)&dns.ip.u_addr.ip4);
    dns.ip.type = IPADDR_TYPE_V4;
    esp_netif_set_dns_info(sta_netif, ESP_NETIF_DNS_MAIN, &dns);

    // Backup DNS → Cloudflare
    IP4_ADDR(&dns.ip.u_addr.ip4, 1, 1, 1, 1);
    ESP_ERROR_CHECK(esp_netif_set_dns_info(sta_netif, ESP_NETIF_DNS_BACKUP, &dns));

    ESP_LOGI(TAG, "DNS Server forced to 8.8.8.8 / 1.1.1.1");
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP / FIREBASE
// ─────────────────────────────────────────────────────────────────────────────

static esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    switch (evt->event_id) {
        case HTTP_EVENT_ON_DATA:
            {
                int copy_len = (evt->data_len < HTTP_BUF_SIZE - http_response_len - 1)
                               ? evt->data_len
                               : HTTP_BUF_SIZE - http_response_len - 1;
                memcpy(http_response_buf + http_response_len, evt->data, copy_len);
                http_response_len += copy_len;
                http_response_buf[http_response_len] = '\0';
            }
            break;
            break;
        default:
            break;
    }
    return ESP_OK;
}

static esp_err_t firebase_request(const char *path, const char *json_body,
                                   esp_http_client_method_t method)
{
    if (g_gemini_active) {
        ESP_LOGW(TAG, "Firebase skipped — Gemini active");
        return ESP_ERR_INVALID_STATE;
    }
    char url[300];
    snprintf(url, sizeof(url), "%s%s.json?auth=%s",
             FIREBASE_HOST, path, FIREBASE_AUTH);

    esp_http_client_config_t config = {
    .url                        = url,
    .event_handler              = http_event_handler,
    .transport_type             = HTTP_TRANSPORT_OVER_SSL,
    .skip_cert_common_name_check = true,
    .crt_bundle_attach          = esp_crt_bundle_attach,
    .buffer_size                = 1024,
    .timeout_ms                 = 10000,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_method(client, method);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, json_body, strlen(json_body));

    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        int status = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "Firebase [%s] → HTTP %d", path, status);
    }
    esp_http_client_cleanup(client);
    return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUZZER
// ─────────────────────────────────────────────────────────────────────────────

static void buzzer_beep(int duration_ms)
{
    gpio_set_level(BUZZER_GPIO, 1);
    vTaskDelay(pdMS_TO_TICKS(duration_ms));
    gpio_set_level(BUZZER_GPIO, 0);
}

static void buzzer_alert(int beeps)
{
    for (int i = 0; i < beeps; i++) {
        buzzer_beep(BUZZER_SHORT_MS);
        vTaskDelay(pdMS_TO_TICKS(150));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS & PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

static void push_alert(const char *type, const char *category,
                        const char *title, const char *message)
{
    char json[512];
    snprintf(json, sizeof(json),
             "{\"type\":\"%s\",\"category\":\"%s\","
             "\"title\":\"%s\",\"message\":\"%s\","
             "\"timestamp\":{\".sv\":\"timestamp\"},\"penId\":\"A\"}",
             type, category, title, message);
    firebase_request("/alerts", json, HTTP_METHOD_POST);
}

static void check_and_alert(float temp, float hum, bool power_ok)
{
    // Critical temperature
    if (temp >= TEMP_CRITICAL_HIGH) {
        push_alert("critical", "temperature",
                   "Critical Temperature Alert",
                   "Temperature critically high. Flock at risk.");
        buzzer_beep(BUZZER_LONG_MS);
    } else if (temp <= TEMP_CRITICAL_LOW) {
        push_alert("critical", "temperature",
                   "Critical Low Temperature",
                   "Temperature critically low. Chicks may die.");
        buzzer_beep(BUZZER_LONG_MS);
    } else if (temp > TEMP_MAX) {
        push_alert("warning", "temperature",
                   "High Temperature Warning",
                   "Temperature above optimal. Fan activated automatically.");
    } else if (temp < TEMP_MIN) {
        push_alert("warning", "temperature",
                   "Low Temperature Warning",
                   "Temperature below optimal. Heater activated automatically.");
    }

    // Humidity
    if (hum > HUMIDITY_MAX) {
        push_alert("warning", "humidity",
                   "High Humidity Warning",
                   "Humidity above 80%. Water mister disabled.");
        buzzer_alert(1);
    } else if (hum < HUMIDITY_MIN) {
        push_alert("warning", "humidity",
                   "Low Humidity Warning",
                   "Humidity below 40%. Water mister activated.");
        buzzer_alert(1);
    }

    // Power outage — alert only on transition
    if (!power_ok && g_power_ok) {
        push_alert("critical", "power",
                   "Power Outage Detected",
                   "Light/power loss in pen. Check power supply.");
        buzzer_beep(BUZZER_LONG_MS);
        vTaskDelay(pdMS_TO_TICKS(200));
        buzzer_beep(BUZZER_LONG_MS);
    }
}

// ─── VIBRATION INTERRUPT HANDLER ─────────────────────────────────────────────
static void IRAM_ATTR vibration_isr_handler(void* arg)
{
    if (security_task_handle == NULL)
        return;

    // Notify the security task
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    vTaskNotifyGiveFromISR(security_task_handle, &xHigherPriorityTaskWoken);
    if (xHigherPriorityTaskWoken) {
        portYIELD_FROM_ISR();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA INITIALIZATION (Skeleton)
// ─────────────────────────────────────────────────────────────────────────────

static esp_err_t camera_init(void)
{
    ESP_LOGI(TAG, "Camera initialization starting...");
    
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_1;
    config.ledc_timer = LEDC_TIMER_1;
    config.pin_d0 = CAM_PIN_D0;
    config.pin_d1 = CAM_PIN_D1;
    config.pin_d2 = CAM_PIN_D2;
    config.pin_d3 = CAM_PIN_D3;
    config.pin_d4 = CAM_PIN_D4;
    config.pin_d5 = CAM_PIN_D5;
    config.pin_d6 = CAM_PIN_D6;
    config.pin_d7 = CAM_PIN_D7;
    config.pin_xclk = CAM_PIN_XCLK;
    config.pin_pclk = CAM_PIN_PCLK;
    config.pin_vsync = CAM_PIN_VSYNC;
    config.pin_href = CAM_PIN_HREF;
    config.pin_sccb_sda = CAM_PIN_SIOD;
    config.pin_sccb_scl = CAM_PIN_SIOC;
    config.pin_pwdn = CAM_PIN_PWDN;
    config.pin_reset = CAM_PIN_RESET;
    config.xclk_freq_hz = 10000000; // REDUCED FROM 20MHz TO PREVENT 2.4GHz WiFi JAMMING!
    config.frame_size = FRAMESIZE_QVGA;
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location = CAMERA_FB_IN_DRAM;
    config.jpeg_quality = 20;
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Camera init failed with error 0x%x", err);
        return err;
    }
    ESP_LOGI(TAG, "Camera Ready!");
    return ESP_OK;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & ALERTS TASK (Interrupt Driven)
// ─────────────────────────────────────────────────────────────────────────────

static void security_task(void *pvParameters)
{
    while (1) {
        // Wait for vibration interrupt
        uint32_t ulNotificationValue = ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        if (ulNotificationValue > 0) {
            ESP_LOGW(TAG, "SECURITY ALERT: Vibration detected via ISR!");
            g_vibration = true;
            
            // Immediate local alarm
            buzzer_beep(BUZZER_LONG_MS);
            
            // Immediate Firebase push
            push_alert("critical", "security", 
                       "Intrusion Detected!", 
                       "Vibration sensor triggered. Immediate action required.");
            
            // Cooldown to prevent spamming
            vTaskDelay(pdMS_TO_TICKS(2000));
            g_vibration = false;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGHTING CONTROL (LDR)
// ─────────────────────────────────────────────────────────────────────────────

static void update_lighting(int ldr_raw)
{
    // Logic: Dark -> Light ON, Bright -> Light OFF
    if (ldr_raw < LDR_DARK_THRESHOLD) {
        if (!g_light_on) {
            gpio_set_level(LIGHT_RELAY_GPIO, 1);
            g_light_on = true;
            ESP_LOGI(TAG, "LDR: Dark detected (%d) -> Light ON", ldr_raw);
        }
    } else {
        if (g_light_on) {
            gpio_set_level(LIGHT_RELAY_GPIO, 0);
            g_light_on = false;
            ESP_LOGI(TAG, "LDR: Light detected (%d) -> Light OFF", ldr_raw);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVO CONTROL
// ─────────────────────────────────────────────────────────────────────────────

static void servo_init(void)
{
    ledc_timer_config_t timer_cfg = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .timer_num       = SERVO_LEDC_TIMER,
        .duty_resolution = SERVO_RESOLUTION,
        .freq_hz         = SERVO_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ledc_timer_config(&timer_cfg);

    ledc_channel_config_t ch_cfg = {
        .gpio_num   = SERVO_GPIO,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = SERVO_LEDC_CH,
        .timer_sel  = SERVO_LEDC_TIMER,
        .duty       = 1229,  // 90 degrees center
        .hpoint     = 0,
    };
    ledc_channel_config(&ch_cfg);
    ESP_LOGI(TAG, "Servo initialized at 90 degrees");
}

static void servo_set_angle(int angle)
{
    if (angle < 0)   angle = 0;
    if (angle > 180) angle = 180;
    uint32_t duty = 819 + (uint32_t)(angle * (1638 - 819) / 180);
    ledc_set_duty(LEDC_LOW_SPEED_MODE, SERVO_LEDC_CH, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, SERVO_LEDC_CH);
    g_servo_angle = angle;
    ESP_LOGI(TAG, "Servo → %d degrees (duty=%lu)", angle, duty);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENTIC CLIMATE CONTROL (4-relay: fan, mister, light, heater)
// ─────────────────────────────────────────────────────────────────────────────

static void climate_agent(float temp, float hum)
{
    // — Temperature control ————————————————————————————————————————————————
    if (temp > TEMP_MAX) {
        if (!g_fan_on) {
            gpio_set_level(FAN_RELAY_GPIO,    1);
            gpio_set_level(HEATER_RELAY_GPIO, 0);
            g_fan_on    = true;
            g_heater_on = false;
            ESP_LOGI(TAG, "AGENT: Temp HIGH (%.1fC) → Fan ON, Heater OFF", temp);
            buzzer_alert(2);
        }
    } else if (temp < TEMP_MIN) {
        if (!g_heater_on) {
            gpio_set_level(HEATER_RELAY_GPIO, 1);
            gpio_set_level(FAN_RELAY_GPIO,    0);
            g_heater_on = true;
            g_fan_on    = false;
            ESP_LOGI(TAG, "AGENT: Temp LOW (%.1fC) → Heater ON, Fan OFF", temp);
            buzzer_alert(2);
        }
    } else {
        if (g_fan_on || g_heater_on) {
            gpio_set_level(FAN_RELAY_GPIO,    0);
            gpio_set_level(HEATER_RELAY_GPIO, 0);
            g_fan_on    = false;
            g_heater_on = false;
            ESP_LOGI(TAG, "AGENT: Temp OK (%.1fC) → Fan OFF, Heater OFF", temp);
        }
    }

    // — Humidity control ————————————————————————————————————————————————————
    if (hum < HUMIDITY_MIN && !g_mister_on) {
        gpio_set_level(MISTER_RELAY_GPIO, 1);
        g_mister_on = true;
        ESP_LOGI(TAG, "AGENT: Hum LOW (%.0f%%) → Mister ON", hum);
    } else if (hum >= HUMIDITY_MIN && g_mister_on) {
        gpio_set_level(MISTER_RELAY_GPIO, 0);
        g_mister_on = false;
        ESP_LOGI(TAG, "AGENT: Hum OK (%.0f%%) → Mister OFF", hum);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// SENSOR TASK
// ─────────────────────────────────────────────────────────────────────────────

static void gemini_analysis_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Gemini Analysis Task Started. Waiting 15s before first capture...");
    vTaskDelay(pdMS_TO_TICKS(15000)); 

    while (1) {
        g_gemini_active = true;
        // RELAY LOCKDOWN: Turn off power-hungry motors to prevent WiFi brownout
        gpio_set_level(FAN_RELAY_GPIO, 0);
        gpio_set_level(MISTER_RELAY_GPIO, 0);
        gpio_set_level(HEATER_RELAY_GPIO, 0);
        
        ESP_LOGI(TAG, "Starting Gemini Analysis Cycle (Relays Locked)...");
        
        // DISABLE WIFI POWER SAVE DURING CAMERA/ANALYSIS CYCLE TO PREVENT BEACON DROPS
        ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));
        
        vTaskDelay(pdMS_TO_TICKS(3000)); // Let any in-flight Firebase TLS session finish before starting Gemini
        
        // Capturing Image (Camera is already initialized at boot)
        ESP_LOGI(TAG, "Gemini Cycle: Capturing Image...");
        
        // Grab a dummy frame to discard dark/under-exposed frames
        camera_fb_t *fb = esp_camera_fb_get();
        if (fb) esp_camera_fb_return(fb);

        // 1. Capture Real Image
        fb = esp_camera_fb_get();
        if (!fb) {
            ESP_LOGE(TAG, "Camera capture failed");
            g_gemini_active = false;
            vTaskDelay(pdMS_TO_TICKS(60000));
            continue;
        }

        // 2. Base64 Encode
        size_t base64_len = 0;
        mbedtls_base64_encode(NULL, 0, &base64_len, fb->buf, fb->len);
        char *base64_buf = malloc(base64_len + 1);
        if (!base64_buf) {
            ESP_LOGE(TAG, "Failed to allocate memory for Base64");
            esp_camera_fb_return(fb);
            g_gemini_active = false;
            vTaskDelay(pdMS_TO_TICKS(60000));
            continue;
        }
        
        size_t written_len = 0;
        mbedtls_base64_encode((unsigned char*)base64_buf, base64_len, &written_len, fb->buf, fb->len);
        base64_buf[written_len] = '\0';
        
        esp_camera_fb_return(fb);
        ESP_LOGI(TAG, "Image captured and encoded. Settling power...");

        // Wait for power rail to recover after camera burst
        vTaskDelay(pdMS_TO_TICKS(4000)); 

        // 3. Construct Gemini JSON Payload
        const char *prompt = "You are an expert poultry veterinarian. Analyze this image of a broiler chicken pen. "
                             "Check the chickens' physical appearance (ruffled feathers, pale wattles) and any visible droppings "
                             "(bloody/red = Coccidiosis, watery/green = Newcastle, normal = brown/firm). "
                             "Return ONLY a JSON object exactly like this, no markdown or code blocks: "
                             "{\\\"totalCount\\\": 150, \\\"activePercentage\\\": 40, \\\"feedingPercentage\\\": 30, \\\"restingPercentage\\\": 30, "
                             "\\\"healthScore\\\": 85, \\\"alerts\\\": [{\\\"type\\\": \\\"warning\\\", \\\"message\\\": \\\"Possible watery dropping detected.\\\"}]}";

        // Manual construction to avoid cJSON memory overhead for huge strings
        const char *json_part1 = "{\"contents\":[{\"parts\":[{\"text\":\"";
        const char *json_part2 = "\"},{\"inline_data\":{\"mime_type\":\"image/jpeg\",\"data\":\"";
        const char *json_part3 = "\"}}]}]}";
        
        size_t payload_size = strlen(json_part1) + strlen(prompt) + strlen(json_part2) + written_len + strlen(json_part3) + 1;
        char *payload = malloc(payload_size);
        if (!payload) {
            ESP_LOGE(TAG, "Failed to allocate memory for Gemini Payload");
            if (base64_buf) free(base64_buf);
            g_gemini_active = false;
            vTaskDelay(pdMS_TO_TICKS(10000));
            continue;
        }
        
        snprintf(payload, payload_size, "%s%s%s%s%s", json_part1, prompt, json_part2, base64_buf, json_part3);


        // 4. DNS Resolve & Send to Gemini
        struct addrinfo hints = { .ai_family = AF_INET, .ai_socktype = SOCK_STREAM };
        struct addrinfo *res;
        bool dns_ok = false;
        for (int i = 0; i < 3; i++) {
            if (getaddrinfo(GEMINI_HOST, NULL, &hints, &res) == 0) {
                freeaddrinfo(res);
                dns_ok = true;
                break;
            }
            ESP_LOGW(TAG, "DNS lookup failed for %s (attempt %d/3). Retrying...", GEMINI_HOST, i + 1);
            vTaskDelay(pdMS_TO_TICKS(2000));
        }

        if (!dns_ok) {
            ESP_LOGE(TAG, "Could not resolve Gemini host. Skipping cycle.");
            if (base64_buf) free(base64_buf);
            g_gemini_active = false;
            vTaskDelay(pdMS_TO_TICKS(60000));
            continue;
        }

        char gemini_url[400];
        snprintf(gemini_url, sizeof(gemini_url), "https://%s%s", GEMINI_HOST, GEMINI_PATH);

        esp_http_client_config_t config = {
            .url               = gemini_url,
            .method            = HTTP_METHOD_POST,
            .transport_type    = HTTP_TRANSPORT_OVER_SSL,
            .crt_bundle_attach = esp_crt_bundle_attach,
            .event_handler     = http_event_handler,
            .timeout_ms        = 60000,
            .buffer_size       = 4096,
            .buffer_size_tx    = 4096,
        };

        http_response_len = 0; // Reset global response buffer
        memset(http_response_buf, 0, HTTP_BUF_SIZE);

        esp_http_client_handle_t client = esp_http_client_init(&config);
        esp_http_client_set_method(client, HTTP_METHOD_POST);
        esp_http_client_set_header(client, "Content-Type", "application/json");
        esp_http_client_set_post_field(client, payload, strlen(payload));
        
        ESP_LOGI(TAG, "Sending request to Gemini... (Payload size: %u bytes)", strlen(payload));
        
        esp_err_t err = esp_http_client_perform(client);
        free(payload); // Free ~10KB of heap before mbedTLS handshake allocations

        if (err == ESP_OK) {
            int status = esp_http_client_get_status_code(client);
            ESP_LOGI(TAG, "Gemini HTTP Status: %d", status);
            
            if (status == 200 && http_response_len > 0) {
                // 5. Parse Gemini Response
                cJSON *root = cJSON_Parse(http_response_buf);
                if (root) {
                    cJSON *candidates = cJSON_GetObjectItem(root, "candidates");
                    if (candidates && cJSON_GetArraySize(candidates) > 0) {
                        cJSON *candidate = cJSON_GetArrayItem(candidates, 0);
                        cJSON *content = cJSON_GetObjectItem(candidate, "content");
                        cJSON *parts = cJSON_GetObjectItem(content, "parts");
                        if (parts && cJSON_GetArraySize(parts) > 0) {
                            cJSON *part = cJSON_GetArrayItem(parts, 0);
                            cJSON *text = cJSON_GetObjectItem(part, "text");
                            if (text && text->valuestring) {
                                ESP_LOGI(TAG, "Gemini Analysis:\n%s", text->valuestring);
                                
                                // 6. Push to Firebase
                                char *clean_json = text->valuestring;
                                if (strncmp(clean_json, "```json\n", 8) == 0) {
                                    clean_json += 8;
                                    char *end = strstr(clean_json, "```");
                                    if (end) *end = '\0';
                                } else if (strncmp(clean_json, "```\n", 4) == 0) {
                                    clean_json += 4;
                                    char *end = strstr(clean_json, "```");
                                    if (end) *end = '\0';
                                }

                                g_gemini_active = false;
                                
                                char fb_payload[512];
                                snprintf(fb_payload, sizeof(fb_payload),
                                    "{\"analysis\":%s,\"lastUpdated\":{\".sv\":\"timestamp\"}}",
                                    clean_json);
                                firebase_request("/camera_analysis", fb_payload, HTTP_METHOD_PUT);
                            }
                        }
                    }
                    cJSON_Delete(root);
                } else {
                    ESP_LOGE(TAG, "Failed to parse Gemini JSON response");
                }
            } else {
                 ESP_LOGE(TAG, "Gemini API error. Status: %d, Response: %s", status, http_response_buf);
            }
        } else {
            ESP_LOGE(TAG, "Gemini Request Failed: %s", esp_err_to_name(err));
        }

        esp_http_client_cleanup(client);
        if (base64_buf) free(base64_buf);
        g_gemini_active = false;
        
        // RESTORE WIFI POWER SAVE TO PREVENT OVERHEATING DURING IDLE
        ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_MIN_MODEM));

        // Run every 15 minutes
        vTaskDelay(pdMS_TO_TICKS(15 * 60 * 1000));
    }
}

static void sensor_task(void *pvParameters)
{
    ESP_LOGI(TAG, "sensor_task: starting hardware init on safe pins...");

    // ── Relays ────────────────────────────────────────────────────────────────
    gpio_reset_pin(FAN_RELAY_GPIO);
    gpio_set_direction(FAN_RELAY_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(FAN_RELAY_GPIO, 0);

    gpio_reset_pin(MISTER_RELAY_GPIO);
    gpio_set_direction(MISTER_RELAY_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(MISTER_RELAY_GPIO, 0);

    gpio_reset_pin(LIGHT_RELAY_GPIO);
    gpio_set_direction(LIGHT_RELAY_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(LIGHT_RELAY_GPIO, 0);

    gpio_reset_pin(HEATER_RELAY_GPIO);
    gpio_set_direction(HEATER_RELAY_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(HEATER_RELAY_GPIO, 0);

    // ── Sensors ───────────────────────────────────────────────────────────────
    gpio_reset_pin(VIBRATION_GPIO);
    gpio_set_direction(VIBRATION_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(VIBRATION_GPIO, GPIO_PULLDOWN_ONLY);

    gpio_reset_pin(BUZZER_GPIO);
    gpio_set_direction(BUZZER_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(BUZZER_GPIO, 0);

    // ── ADC for LDR (Power Detect) ────────────────────────────────────────────
    adc_oneshot_unit_handle_t adc1_handle;
    adc_oneshot_unit_init_cfg_t adc_init_cfg = { .unit_id = ADC_UNIT_1 };
    adc_oneshot_new_unit(&adc_init_cfg, &adc1_handle);
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten    = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_oneshot_config_channel(adc1_handle, LDR_ADC_CHANNEL, &chan_cfg);

    // ── Internal Pull-down for LDR (since user lacks external resistor) ──────
    gpio_reset_pin(GPIO_NUM_3);
    gpio_set_direction(GPIO_NUM_3, GPIO_MODE_INPUT);
    gpio_set_pull_mode(GPIO_NUM_3, GPIO_PULLDOWN_ONLY);

    // ── Vibration Interrupt ──────────────────────────────────────────────────
    gpio_reset_pin(VIBRATION_GPIO);
    gpio_set_direction(VIBRATION_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(VIBRATION_GPIO, GPIO_PULLDOWN_ONLY);
    gpio_set_intr_type(VIBRATION_GPIO, GPIO_INTR_POSEDGE);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(VIBRATION_GPIO, vibration_isr_handler, NULL);

    // ── Servo (LEDC PWM) ──────────────────────────────────────────────────────
    servo_init();
    servo_set_angle(90);

    // Camera is now initialized in app_main for stability

    buzzer_alert(2); // 2 beeps = ready
    ESP_LOGI(TAG, "BroilerGuard ESP32-S3: Hardware ready. Monitoring...");
    vTaskDelay(pdMS_TO_TICKS(3000)); // 3s warm up

    int64_t last_periodic_ms = 0;
    int64_t last_history_ms = 0;

    while (1) {
        if (g_gemini_active) {
            ESP_LOGD(TAG, "Sensor task yielding for Gemini analysis...");
            vTaskDelay(pdMS_TO_TICKS(10000));
            continue;
        }

        // ── 1. FAST POLLING: LDR (Light Control) ──────────────────────────────
        int ldr_raw = 0;
        adc_oneshot_read(adc1_handle, LDR_ADC_CHANNEL, &ldr_raw);
        update_lighting(ldr_raw);
        
        // Update power status global based on LDR
        g_power_ok = (ldr_raw > LDR_DARK_THRESHOLD); // Assuming LDR sees pen lights

        // ── 2. PERIODIC POLLING (Every 1 Minute) ──────────────────────────────
        int64_t now_ms = esp_timer_get_time() / 1000;
        if (now_ms - last_periodic_ms >= SENSOR_INTERVAL_MS) {
            last_periodic_ms = now_ms;

            float temp = 0.0f, hum = 0.0f;
            esp_err_t dht_err = dht_read_float_data(DHT_TYPE_DHT11, DHT11_GPIO, &hum, &temp);
            
            if (dht_err == ESP_OK) {
                ESP_LOGI(TAG, "Temp=%.1fC  Hum=%.0f%% | Fan=%s Mist=%s Light=%s Heat=%s",
                         temp, hum,
                         g_fan_on    ? "ON" : "off",
                         g_mister_on ? "ON" : "off",
                         g_light_on  ? "ON" : "off",
                         g_heater_on ? "ON" : "off");

                climate_agent(temp, hum);
                check_and_alert(temp, hum, g_power_ok);

                // Push status to Firebase
                char sensors_json[512];
                snprintf(sensors_json, sizeof(sensors_json),
                         "{\"temperature\":%.1f,\"humidity\":%.0f,"
                         "\"power_status\":\"%s\",\"fan\":%s,"
                         "\"water_mister\":%s,\"light\":%s,\"heater\":%s,"
                         "\"vibration\":%s,\"servo_angle\":%d,"
                         "\"last_updated\":{\".sv\":\"timestamp\"}}",
                         temp, hum,
                         g_power_ok  ? "grid"  : "outage",
                         g_fan_on    ? "true"  : "false",
                         g_mister_on ? "true"  : "false",
                         g_light_on  ? "true"  : "false",
                         g_heater_on ? "true"  : "false",
                         g_vibration ? "true"  : "false",
                         g_servo_angle);
                firebase_request("/sensors", sensors_json, HTTP_METHOD_PUT);
            } else {
                ESP_LOGW(TAG, "DHT11 read failed.");
            }
        }

        // ── 3. HISTORY LOGGING (Every 1 Hour) ─────────────────────────────────
        if (now_ms - last_history_ms >= HISTORY_INTERVAL_MS) {
            last_history_ms = now_ms;
            // (Read sensors again or use cached values)
            float temp, hum;
            if (dht_read_float_data(DHT_TYPE_DHT11, DHT11_GPIO, &hum, &temp) == ESP_OK) {
                char history_json[256];
                snprintf(history_json, sizeof(history_json),
                         "{\"temperature\":%.1f,\"humidity\":%.0f,\"timestamp\":{\".sv\":\"timestamp\"}}",
                         temp, hum);
                firebase_request("/history", history_json, HTTP_METHOD_POST);
            }
        }

        vTaskDelay(pdMS_TO_TICKS(1000)); // Poll LDR every 1 second
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// APP MAIN
// ─────────────────────────────────────────────────────────────────────────────

void app_main(void)
{
    ESP_LOGI(TAG, "==============================");
    ESP_LOGI(TAG, "  BroilerGuard v1.0 Starting ");
    ESP_LOGI(TAG, "==============================");

    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    wifi_init();

    vTaskDelay(pdMS_TO_TICKS(5000));

    if (camera_init() == ESP_OK) {
        ESP_LOGI(TAG, "Camera System Online.");
    } else {
        ESP_LOGE(TAG, "Camera Hardware Error! Check connections.");
    }

    // Start Security Task (High Priority for instant alerts)
    xTaskCreatePinnedToCore(security_task, "security_task", 4096, NULL, 10, &security_task_handle, 1);

    // Start Sensor Task
    xTaskCreatePinnedToCore(sensor_task, "sensor_task", 16384, NULL, 5, NULL, 1);

    // Start Gemini Task
    xTaskCreatePinnedToCore(gemini_analysis_task, "gemini_task", 24576, NULL, 6, NULL, 1);
}