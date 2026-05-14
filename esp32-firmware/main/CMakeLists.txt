idf_component_register(
    SRCS "main.c" "dht.c"
    INCLUDE_DIRS "."
    REQUIRES
        nvs_flash esp_wifi esp_event esp_netif
        esp_http_client driver esp_timer esp_adc
        freertos log mbedtls
    PRIV_REQUIRES
        esp-tls json
)