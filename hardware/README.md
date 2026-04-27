# VitalGlove — ESP32 Firmware

## Hardware Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | ESP32-C3 | WiFi + processing |
| Heart Rate + SpO2 | MAX30102 | Optical pulse oximetry |
| Temperature | DS18B20 | Body temperature |
| Accelerometer | MPU6050 | Fall detection + motion |
| Display | SSD1306 OLED | Real-time status |
| Feedback | Vibration motor | Alert notifications |

## Pin Configuration

Defined in `glove.cpp` — see `SENSOR PINS` section.

## Uploading

1. Install [Arduino IDE](https://www.arduino.cc/en/software) or PlatformIO
2. Install ESP32 board package
3. Install libraries: `Wire`, `Adafruit_SSD1306`, `DallasTemperature`, `MAX30105`, `MPU6050`, `WiFi`, `HTTPClient`
4. Set your WiFi credentials in `glove.cpp` (`WIFI_SSID`, `WIFI_PASS`)
5. Set the server IP (`SERVER_URL`)
6. Upload to ESP32

## Communication

- **Sends**: `POST /api/telemetry` every 500ms with `{hr, spo2, temp, gforce, fall, accelX, accelY, accelZ}`
- **Receives**: `GET /api/glove/command` every 3s to sync active scenario from UI
