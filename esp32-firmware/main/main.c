/*
 * BroilerGuard ESP32 Firmware — ESP-IDF
 * AI-Powered Broiler Chicken Pen Monitor
 *
 * Hardware:
 *   - DHT11        → Temperature + Humidity        (GPIO4)
 *   - Float switch → Water level low/ok            (GPIO14)
 *   - LDR          → Light/power outage detection  (GPIO34 ADC)
 *   - Fan relay    → Auto cooling                  (GPIO26)
 *   - Lamp relay   → Auto heating                  (GPIO27)
 *   - Buzzer       → Local alarm                   (GPIO12)
 *
 * Firebase paths:
 *   PUT  /sensors.json   → live values   (every 60s)
 *   POST /history.json   → chart data    (every 1hr)
 *   POST /alerts.json    → alert events  (on threshold breach)
 *
 * Behavior:
 *   IDLE  → read all sensors every 60s, control relay automatically
 *   ALERT → buzzer + immediate Firebase push + relay action
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
#include "esp_adc/adc_oneshot.h"
#include "esp_http_client.h"
//#include "esp_tls.h"
#include "esp_timer.h"
#include "dht.h"
#include "esp_crt_bundle.h"

static const char *TAG = "BroilerGuard";

// ─── USER CONFIGURATION — CHANGE THESE ───────────────────────────────────────
#define WIFI_SSID           "Redmi 9C"
#define WIFI_PASSWORD       "10987654321"
#define FIREBASE_HOST       "https://broilerguard-default-rtdb.europe-west1.firebasedatabase.app"
#define FIREBASE_AUTH       "iauTh0i8FbK9evb2azrzvMPzdFgt3WiYHo13faiJ"

// ─── PIN DEFINITIONS ─────────────────────────────────────────────────────────
#define DHT11_GPIO          GPIO_NUM_4
#define FLOAT_SW_GPIO       GPIO_NUM_14   // HIGH=water ok, LOW=water low
#define LDR_ADC_CHANNEL     ADC_CHANNEL_6 // GPIO34
#define FAN_RELAY_GPIO      GPIO_NUM_26   // HIGH=ON
#define LAMP_RELAY_GPIO     GPIO_NUM_27   // HIGH=ON
#define BUZZER_GPIO         GPIO_NUM_12   // HIGH=ON

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────
#define TEMP_MAX            33.0f
#define TEMP_MIN            28.0f
#define TEMP_CRITICAL_HIGH  37.0f
#define TEMP_CRITICAL_LOW   25.0f
#define HUMIDITY_MAX        80.0f
#define HUMIDITY_MIN        40.0f
#define LDR_DARK_THRESHOLD  500

// ─── TIMING ───────────────────────────────────────────────────────────────────
#define SENSOR_INTERVAL_MS      60000
#define HISTORY_INTERVAL_MS     3600000
#define BUZZER_SHORT_MS         200
#define BUZZER_LONG_MS          1000

// ─── WIFI ─────────────────────────────────────────────────────────────────────
static EventGroupHandle_t wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0

// ─── HTTP BUFFER ──────────────────────────────────────────────────────────────
#define HTTP_BUF_SIZE 512
static char http_response_buf[HTTP_BUF_SIZE];
static int  http_response_len = 0;

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
static bool g_water_ok  = true;
static bool g_power_ok  = true;
static bool g_fan_on    = false;
static bool g_lamp_on   = false;

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
    esp_netif_create_default_wifi_sta();

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
    ESP_LOGI(TAG, "Connecting to WiFi: %s ...", WIFI_SSID);
    xEventGroupWaitBits(wifi_event_group, WIFI_CONNECTED_BIT,
                        pdFALSE, pdTRUE, portMAX_DELAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP / FIREBASE
// ─────────────────────────────────────────────────────────────────────────────

static esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    switch (evt->event_id) {
        case HTTP_EVENT_ON_DATA:
            if (!esp_http_client_is_chunked_response(evt->client)) {
                int copy_len = (evt->data_len < HTTP_BUF_SIZE - http_response_len - 1)
                               ? evt->data_len
                               : HTTP_BUF_SIZE - http_response_len - 1;
                memcpy(http_response_buf + http_response_len, evt->data, copy_len);
                http_response_len += copy_len;
                http_response_buf[http_response_len] = '\0';
            }
            break;
        case HTTP_EVENT_ON_FINISH:
            http_response_len = 0;
            break;
        default:
            break;
    }
    return ESP_OK;
}

static esp_err_t firebase_request(const char *path, const char *json_body,
                                   esp_http_client_method_t method)
{
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
    } else {
        ESP_LOGE(TAG, "Firebase request failed: %s", esp_err_to_name(err));
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
// AGENTIC TEMPERATURE CONTROL
// ─────────────────────────────────────────────────────────────────────────────

static void temperature_agent(float temp)
{
    if (temp > TEMP_MAX) {
        // Too hot — turn fan ON, lamp OFF
        if (!g_fan_on) {
            gpio_set_level(FAN_RELAY_GPIO,  1);
            gpio_set_level(LAMP_RELAY_GPIO, 0);
            g_fan_on  = true;
            g_lamp_on = false;
            ESP_LOGI(TAG, "AGENT: Temp HIGH (%.1fC) → Fan ON, Lamp OFF", temp);
            buzzer_alert(2);
        }
    } else if (temp < TEMP_MIN) {
        // Too cold — turn lamp ON, fan OFF
        if (!g_lamp_on) {
            gpio_set_level(LAMP_RELAY_GPIO, 1);
            gpio_set_level(FAN_RELAY_GPIO,  0);
            g_lamp_on = true;
            g_fan_on  = false;
            ESP_LOGI(TAG, "AGENT: Temp LOW (%.1fC) → Lamp ON, Fan OFF", temp);
            buzzer_alert(2);
        }
    } else {
        // Optimal — everything off
        if (g_fan_on || g_lamp_on) {
            gpio_set_level(FAN_RELAY_GPIO,  0);
            gpio_set_level(LAMP_RELAY_GPIO, 0);
            g_fan_on  = false;
            g_lamp_on = false;
            ESP_LOGI(TAG, "AGENT: Temp OK (%.1fC) → Fan OFF, Lamp OFF", temp);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────────────────────

static void push_alert(const char *type, const char *category,
                        const char *title, const char *message)
{
    char json[512];
    int64_t ts = esp_timer_get_time() / 1000;
    snprintf(json, sizeof(json),
             "{\"type\":\"%s\",\"category\":\"%s\","
             "\"title\":\"%s\",\"message\":\"%s\","
             "\"timestamp\":%lld,\"penId\":\"A\"}",
             type, category, title, message, ts);
    firebase_request("/alerts", json, HTTP_METHOD_POST);
}

static void check_and_alert(float temp, float hum, bool water_ok, bool power_ok)
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
                   "Temperature below optimal. Lamp activated automatically.");
    }

    // Humidity
    if (hum > HUMIDITY_MAX) {
        push_alert("warning", "humidity",
                   "High Humidity Warning",
                   "Humidity above 80%. Improve ventilation.");
        buzzer_alert(1);
    } else if (hum < HUMIDITY_MIN) {
        push_alert("warning", "humidity",
                   "Low Humidity Warning",
                   "Humidity below 40%. Risk of respiratory issues.");
        buzzer_alert(1);
    }

    // Water — alert only on transition to low
    if (!water_ok && g_water_ok) {
        push_alert("critical", "water",
                   "Water Level Critical",
                   "Drinker water low. Refill immediately.");
        buzzer_alert(3);
    }

    // Power — alert only on transition to outage
    if (!power_ok && g_power_ok) {
        push_alert("critical", "power",
                   "Power Outage Detected",
                   "Light/power loss in pen. Check power supply.");
        buzzer_beep(BUZZER_LONG_MS);
        vTaskDelay(pdMS_TO_TICKS(200));
        buzzer_beep(BUZZER_LONG_MS);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SENSOR TASK
// ─────────────────────────────────────────────────────────────────────────────

static void sensor_task(void *pvParameters)
{
    // Float switch — input with pull-up
    gpio_config_t float_conf = {
        .pin_bit_mask = (1ULL << FLOAT_SW_GPIO),
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    gpio_config(&float_conf);

    // Fan relay — output
    gpio_config_t fan_conf = {
        .pin_bit_mask = (1ULL << FAN_RELAY_GPIO),
        .mode         = GPIO_MODE_OUTPUT,
    };
    gpio_config(&fan_conf);
    gpio_set_level(FAN_RELAY_GPIO, 0);

    // Lamp relay — output
    gpio_config_t lamp_conf = {
        .pin_bit_mask = (1ULL << LAMP_RELAY_GPIO),
        .mode         = GPIO_MODE_OUTPUT,
    };
    gpio_config(&lamp_conf);
    gpio_set_level(LAMP_RELAY_GPIO, 0);

    // Buzzer — output
    gpio_config_t buzz_conf = {
        .pin_bit_mask = (1ULL << BUZZER_GPIO),
        .mode         = GPIO_MODE_OUTPUT,
    };
    gpio_config(&buzz_conf);
    gpio_set_level(BUZZER_GPIO, 0);

    // ADC for LDR
    adc_oneshot_unit_handle_t adc1_handle;
adc_oneshot_unit_init_cfg_t adc_init_cfg = {
    .unit_id = ADC_UNIT_1,
};
adc_oneshot_new_unit(&adc_init_cfg, &adc1_handle);
adc_oneshot_chan_cfg_t chan_cfg = {
    .atten    = ADC_ATTEN_DB_12,
    .bitwidth = ADC_BITWIDTH_12,
};
adc_oneshot_config_channel(adc1_handle, LDR_ADC_CHANNEL, &chan_cfg);

    // Startup beep — 3 short beeps = system ready
    buzzer_alert(3);
    ESP_LOGI(TAG, "All hardware initialized. Monitoring started.");

    int64_t last_history_ms = 0;

    while (1) {
        // ── Read sensors ──────────────────────────────────────────────────────
        float temp = 0.0f, hum = 0.0f;
        esp_err_t dht_err = dht_read_float_data(DHT_TYPE_DHT11, DHT11_GPIO,
                                                  &hum, &temp);
        if (dht_err != ESP_OK) {
            ESP_LOGW(TAG, "DHT11 read failed — retrying in 2s");
            vTaskDelay(pdMS_TO_TICKS(2000));
            continue;
        }

        bool water_ok = (gpio_get_level(FLOAT_SW_GPIO) == 1);
        int ldr_raw = 0;
        adc_oneshot_read(adc1_handle, LDR_ADC_CHANNEL, &ldr_raw);
        bool power_ok = (ldr_raw > LDR_DARK_THRESHOLD);

        ESP_LOGI(TAG, "Temp=%.1fC  Hum=%.0f%%  Water=%s  Power=%s  Fan=%s  Lamp=%s",
                 temp, hum,
                 water_ok ? "OK"     : "LOW",
                 power_ok ? "ON"     : "OUTAGE",
                 g_fan_on  ? "ON"    : "off",
                 g_lamp_on ? "ON"    : "off");

        // ── Agentic control ───────────────────────────────────────────────────
        temperature_agent(temp);

        // ── Threshold alerts ──────────────────────────────────────────────────
        check_and_alert(temp, hum, water_ok, power_ok);

        // ── Update global state ───────────────────────────────────────────────
        g_water_ok = water_ok;
        g_power_ok = power_ok;

        // ── Push to Firebase ──────────────────────────────────────────────────
        char sensors_json[256];
        snprintf(sensors_json, sizeof(sensors_json),
                 "{\"temperature\":%.1f,\"humidity\":%.0f,"
                 "\"water_level\":%s,\"power_status\":\"%s\","
                 "\"fan\":%s,\"lamp\":%s}",
                 temp, hum,
                 water_ok ? "100" : "10",
                 power_ok ? "grid" : "outage",
                 g_fan_on  ? "true" : "false",
                 g_lamp_on ? "true" : "false");

        firebase_request("/sensors", sensors_json, HTTP_METHOD_PUT);

        // ── Hourly history ────────────────────────────────────────────────────
        int64_t now_ms = esp_timer_get_time() / 1000;
        if (now_ms - last_history_ms >= HISTORY_INTERVAL_MS) {
            last_history_ms = now_ms;
            char history_json[128];
            snprintf(history_json, sizeof(history_json),
                     "{\"temperature\":%.1f,\"humidity\":%.0f,\"timestamp\":%lld}",
                     temp, hum, now_ms);
            firebase_request("/history", history_json, HTTP_METHOD_POST);
            ESP_LOGI(TAG, "History point pushed.");
        }

        vTaskDelay(pdMS_TO_TICKS(SENSOR_INTERVAL_MS));
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

    xTaskCreatePinnedToCore(sensor_task, "sensor_task", 8192, NULL, 5, NULL, 1);
}