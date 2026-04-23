/*
 * DHT22 driver for ESP-IDF
 * Lightweight single-bus implementation
 */

#pragma once
#include "esp_err.h"
#include "driver/gpio.h"

typedef enum {
    DHT_TYPE_DHT11 = 11,
    DHT_TYPE_DHT22 = 22,
} dht_sensor_type_t;

/**
 * @brief Read temperature and humidity from DHT sensor
 *
 * @param sensor_type  DHT_TYPE_DHT11 or DHT_TYPE_DHT22
 * @param gpio_num     GPIO pin connected to DHT data line
 * @param humidity     Output: relative humidity in %
 * @param temperature  Output: temperature in °C
 * @return ESP_OK on success
 */
esp_err_t dht_read_float_data(dht_sensor_type_t sensor_type, gpio_num_t gpio_num,
                               float *humidity, float *temperature);
