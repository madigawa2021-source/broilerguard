# BroilerGuard — Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `broilerguard`
3. Disable Google Analytics → Create project
4. Go to Realtime Database → Create Database
5. Choose "Start in test mode"
6. Select server region (europe-west1 is closest to Nigeria)

---

## Step 2: Get Your Firebase Web Config

1. Firebase Console → Project Settings (gear icon top left)
2. Scroll to "Your apps" → click "</> Web"
3. Register app as `broilerguard-web`
4. Copy the firebaseConfig object shown

---

## Step 3: Update lib/firebase.ts

Paste your config values into lib/firebase.ts.

---

## Step 4: Set Firebase Rules (development)

Firebase Console → Realtime Database → Rules tab:

{
  "rules": {
    ".read": true,
    ".write": true
  }
}

---

## Step 5: Get Database Secret (for ESP32)

1. Firebase Console → Project Settings
2. Click "Service accounts" tab
3. Scroll to "Database secrets" → Show → Copy

---

## Step 6: Configure ESP-IDF Firmware

Open esp32-firmware/main/main.c and update:

  #define WIFI_SSID       "YourWiFiName"
  #define WIFI_PASSWORD   "YourWiFiPass"
  #define FIREBASE_HOST   "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
  #define FIREBASE_AUTH   "your_database_secret"

Pin defaults:
  DHT22 data  → GPIO4
  HC-SR04 trigger → GPIO5
  HC-SR04 echo    → GPIO18
  Power ADC       → GPIO34 (ADC1_CH6)

---

## Step 7: Build and Flash (ESP-IDF)

  cd esp32-firmware
  idf.py set-target esp32
  idf.py build
  idf.py -p PORT flash monitor

Expected serial output:
  I BroilerGuard: WiFi connected.
  I BroilerGuard: Temp=31.5C  Hum=62%  Water=75%  Power=grid
  I BroilerGuard: Firebase OK [/sensors] → 200

---

## Step 8: Run the Web Dashboard

  npm install
  npm run dev

Open http://localhost:3000/dashboard
The "Live Firebase" badge turns green once ESP32 is sending.

---

## Firebase Data Structure

/sensors
  /temperature    → 31.5       (PUT every 5s)
  /humidity       → 62
  /water_level    → 75
  /power_status   → "grid"

/history/-key                  (POST every 1hr)
  /temperature  → 31.2
  /humidity     → 60
  /timestamp    → 1714000000000

/alerts/-key                   (POST on threshold breach)
  /type         → "warning"
  /category     → "temperature"
  /title        → "High Temperature Alert"
  /message      → "..."
  /penId        → "A"

---

## Testing Without ESP32

In Firebase Console → Realtime Database, manually create:
  sensors/temperature: 31.5
  sensors/humidity: 62
  sensors/water_level: 75
  sensors/power_status: "grid"

Watch the dashboard update live.

---

## ESP-IDF Components Used (all built-in, no external libs)

  esp_wifi, esp_http_client, esp_tls, mbedtls, driver, esp_timer
  DHT22 driver is included as main/dht.c + main/dht.h
