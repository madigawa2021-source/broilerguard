/*
 * DHT22 driver for ESP-IDF
 */

#include "dht.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "driver/gpio.h"
#include "rom/ets_sys.h"

static const char *TAG = "DHT";

#define DHT_TIMEOUT_US 100

static int wait_for_level(gpio_num_t gpio, int level, int timeout_us)
{
    int elapsed = 0;
    while (gpio_get_level(gpio) != level) {
        if (elapsed >= timeout_us) return -1;
        ets_delay_us(1);
        elapsed++;
    }
    return elapsed;
}

esp_err_t dht_read_float_data(dht_sensor_type_t sensor_type, gpio_num_t gpio_num,
                               float *humidity, float *temperature)
{
    uint8_t data[5] = {0};

    // Send start signal
    gpio_set_direction(gpio_num, GPIO_MODE_OUTPUT);
    gpio_set_level(gpio_num, 0);
    vTaskDelay(pdMS_TO_TICKS(20));   // Hold low 20ms
    gpio_set_level(gpio_num, 1);
    ets_delay_us(30);
    gpio_set_direction(gpio_num, GPIO_MODE_INPUT);

    // Wait for sensor response
    if (wait_for_level(gpio_num, 0, DHT_TIMEOUT_US) < 0) {
        ESP_LOGW(TAG, "Timeout waiting for response low");
        return ESP_ERR_TIMEOUT;
    }
    if (wait_for_level(gpio_num, 1, DHT_TIMEOUT_US) < 0) {
        ESP_LOGW(TAG, "Timeout waiting for response high");
        return ESP_ERR_TIMEOUT;
    }
    if (wait_for_level(gpio_num, 0, DHT_TIMEOUT_US) < 0) {
        ESP_LOGW(TAG, "Timeout waiting for data start");
        return ESP_ERR_TIMEOUT;
    }

    // Read 40 bits
    for (int i = 0; i < 40; i++) {
        // Each bit starts with 50us low
        if (wait_for_level(gpio_num, 1, DHT_TIMEOUT_US) < 0) {
            ESP_LOGW(TAG, "Timeout on bit %d low", i);
            return ESP_ERR_TIMEOUT;
        }

        // High duration: ~26-28us = 0, ~70us = 1
        int duration = wait_for_level(gpio_num, 0, DHT_TIMEOUT_US);
        if (duration < 0) {
            ESP_LOGW(TAG, "Timeout on bit %d high", i);
            return ESP_ERR_TIMEOUT;
        }

        data[i / 8] <<= 1;
        if (duration > 35) {
            data[i / 8] |= 1;
        }
    }

    // Verify checksum
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) {
        ESP_LOGW(TAG, "Checksum mismatch: calc=0x%02x got=0x%02x", checksum, data[4]);
        return ESP_ERR_INVALID_CRC;
    }

    if (sensor_type == DHT_TYPE_DHT22) {
        *humidity    = ((data[0] << 8) | data[1]) / 10.0f;
        *temperature = (((data[2] & 0x7F) << 8) | data[3]) / 10.0f;
        if (data[2] & 0x80) *temperature = -*temperature;
    } else {
        // DHT11
        *humidity    = data[0];
        *temperature = data[2];
    }

    ESP_LOGD(TAG, "Read OK: temp=%.1f hum=%.1f", *temperature, *humidity);
    return ESP_OK;
}
