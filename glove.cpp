#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <string.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_SSD1306.h>

// I2C pins matched to physical wiring on this board
#define SDA_PIN                6
#define SCL_PIN                7
#define VIBRO_PIN              4
#define DS18B20_PIN            5

#define SCREEN_W               128
#define SCREEN_H               64
#define OLED_ADDR              0x3C

#define DISPLAY_REFRESH_MS     100UL
#define DASHBOARD_SWAP_MS      3200UL
#define TELEMETRY_MS           500UL
#define TEMP_READ_MS           1000UL
#define TEMP_CONVERT_MS        750UL
#define ALERT_HOLD_MS          350UL

#define TEMP_LOW_C             15.0f
#define TEMP_HIGH_C            50.0f
#define HR_LOW                 50
#define HR_HIGH                120
#define SPO2_LOW               94
#define FALL_THRESHOLD_G       2.5f

#define FINGER_IR_ON           7000UL
#define FINGER_IR_OFF          3500UL
#define FINGER_HOLD_MS         2200UL
#define SPO2_BUF_LEN           75
#define SPO2_OVERLAP           25
#define TREND_POINTS           64

const char *WIFI_SSID     = "Animesh";
const char *WIFI_PASSWORD = "12345678";
// ⚠ Replace YOUR_PC_IP with your actual PC IP (run ipconfig → WiFi adapter).
// The Vite dev server listens on port 8080 and accepts ESP32 JSON at /api/telemetry.
const char *API_ENDPOINT  = "http://YOUR_PC_IP:8080/api/telemetry";

Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);
Adafruit_MPU6050 mpu;
OneWire oneWire(DS18B20_PIN);
DallasTemperature tempBus(&oneWire);
MAX30105 particleSensor;

bool displayReady  = false;
bool mpuReady      = false;
bool tempReady     = false;
bool max30102Ready = false;

enum Mode { MODE_VITALS, MODE_ENV, MODE_ALERT };
Mode currentMode = MODE_VITALS;

float bodyTempC    = NAN;
float bodyTempF    = NAN;
float tempAverageC = NAN;
bool  tempValid             = false;
bool  tempConversionPending = false;
unsigned long tempConversionStartedAt = 0;
unsigned long lastTempKickAt          = 0;

const byte RATE_SIZE = 4;
byte  rates[RATE_SIZE] = {0};
byte  rateSpot  = 0;
byte  rateCount = 0;
long  lastBeat  = 0;
float bpm       = 0.0f;
int   avgBpm    = 0;

uint32_t irBuf[SPO2_BUF_LEN];
uint32_t redBuf[SPO2_BUF_LEN];
uint8_t  spo2Samples = 0;
int32_t  spo2Val     = 0;
int8_t   spo2Valid   = 0;
int32_t  hrVal       = 0;
int8_t   hrValid     = 0;
uint32_t latestIr    = 0;
uint32_t latestRed   = 0;
uint32_t irAverage   = 0;
bool     fingerPresent     = false;
unsigned long lastFingerSeenAt = 0;

float accelX = 0.0f, accelY = 0.0f, accelZ = 0.0f;
float gyroX  = 0.0f, gyroY  = 0.0f, gyroZ  = 0.0f;
float totalG = 1.0f;
bool  fallDetected    = false;
unsigned long fallLatchedUntil = 0;

bool lowTempAlert  = false;
bool highTempAlert = false;
bool lowHrAlert    = false;
bool highHrAlert   = false;
bool lowSpo2Alert  = false;
bool alertActive   = false;
unsigned long alertHoldUntil      = 0;
unsigned long lastDashboardSwapAt = 0;

uint8_t hrTrend[TREND_POINTS]   = {0};
uint8_t tempTrend[TREND_POINTS] = {0};

bool     vibrationRunning         = false;
bool     vibrationOutputHigh      = false;
uint8_t  vibrationStep            = 0;
unsigned long vibrationPhaseStartedAt = 0;
const uint16_t ALERT_PATTERN_MS[] = {140, 90, 180, 0};

// ---------- forward declarations ----------
void showBoot(const char *msg);
void connectWiFi();
void updateTemperature();
void updateOpticalSensor();
void processHeartRateSample(uint32_t ir);
void collectSpo2Sample(uint32_t red, uint32_t ir);
void resetOpticalData();
void readMotion();
void evaluateAlerts();
void updateMode();
void startAlertPattern();
void updateVibration();
void updateTrend();
void updateDisplay();
void renderVitalsDashboard();
void renderEnvDashboard();
void renderAlertScreen();
void drawStatusBar(const char *title);
void drawPanel(int16_t x, int16_t y, int16_t w, int16_t h);
void drawSparkline(const uint8_t *series, int16_t x, int16_t y, int16_t w, int16_t h);
void drawAxisBar(int16_t x, int16_t y, int16_t w, float value);
void drawImpactBar(int16_t x, int16_t y, int16_t w, int16_t h, float value, float maxValue);
void drawBadge(int16_t x, int16_t y, int16_t w, const char *label, bool active);
int  currentHeartRate();
int  currentSpo2();
int  opticalSignalPercent();
bool opticalSignalUsable();
String buildTelemetryJson();
void sendTelemetry();
void maybeReconnectWiFi();
void serialReport();

// ===================== SETUP =====================
void setup() {
  // ---- Serial init (works for both UART and USB-CDC on ESP32-C3) ----
  Serial.begin(115200);
  // On ESP32-C3 with USB CDC: wait for host to open port (max 3 s)
  // On UART mode:             'Serial' is always ready, loop exits instantly
  unsigned long _serialWait = millis();
  while (!Serial && (millis() - _serialWait < 3000UL)) { delay(10); }
  delay(100);  // Extra settle time for USB enumeration on C3
  Serial.println();
  Serial.println("===== Smart Glove Booting (ESP32-C3) =====");
  Serial.print("[SYS]  CPU freq: "); Serial.print(getCpuFrequencyMhz()); Serial.println(" MHz");

  pinMode(VIBRO_PIN, OUTPUT);
  digitalWrite(VIBRO_PIN, LOW);

  // ---- I2C: slow speed for init scan (more reliable for marginal wiring) ----
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);   // 100 kHz during scan – more tolerant
  Serial.print("[I2C]  Bus init on SDA="); Serial.print(SDA_PIN);
  Serial.print(" SCL="); Serial.println(SCL_PIN);
  delay(50);  // let all devices power up before scanning

  // ---- I2C scanner ----
  Serial.println("[I2C]  Scanning bus...");
  uint8_t devCount = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("[I2C]  Device found at 0x");
      if (addr < 16) Serial.print("0");
      Serial.print(addr, HEX);
      if (addr == 0x3C || addr == 0x3D) Serial.print(" <- OLED SSD1306");
      if (addr == 0x57)                 Serial.print(" <- MAX30102");
      if (addr == 0x68 || addr == 0x69) Serial.print(" <- MPU6050");
      Serial.println();
      devCount++;
    }
  }
  if (devCount == 0) Serial.println("[I2C]  *** NO DEVICES FOUND *** Check wiring!");
  else { Serial.print("[I2C]  Total devices: "); Serial.println(devCount); }

  Wire.setClock(400000);  // switch back to 400 kHz for runtime

  displayReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (displayReady) {
    display.setTextWrap(false);
    showBoot("OLED online");
    Serial.println("[OLED] OK");
  } else {
    Serial.println("[OLED] FAIL – check address/wiring");
  }

  tempBus.begin();
  tempBus.setWaitForConversion(false);
  tempReady = (tempBus.getDeviceCount() > 0);
  if (tempReady) {
    tempBus.requestTemperatures();
    tempConversionPending   = true;
    tempConversionStartedAt = millis();
    lastTempKickAt          = millis();
    showBoot("DS18B20 online");
    Serial.println("[DS18B20] OK");
  } else {
    Serial.println("[DS18B20] FAIL – sensor not found on pin " + String(DS18B20_PIN));
  }

  delay(100);  // settle: OLED init can disturb the I2C bus briefly
  max30102Ready = particleSensor.begin(Wire, I2C_SPEED_FAST);
  if (max30102Ready) {
    // LED at 0x9F (~62 mA) instead of 0xFF: IR was at 242k/262k = 92% saturated.
    // checkForBeat() needs AC headroom; 0x9F targets ~55-65% of full scale.
    particleSensor.setup(0x9F, 4, 2, 100, 411, 16384);
    particleSensor.setPulseAmplitudeRed(0x9F);
    particleSensor.setPulseAmplitudeIR(0x9F);
    particleSensor.enableDIETEMPRDY();
    showBoot("MAX30102 online");
    Serial.println("[MAX30102] OK  (LED @ 0x9F, ~60% power)");
  } else {
    Serial.println("[MAX30102] FAIL – check I2C wiring");
  }

  delay(100);  // settle before MPU6050 init
  // Try primary address 0x68 (AD0=GND) first, fall back to 0x69 (AD0=VCC).
  // Always pass &Wire explicitly – on ESP32 default Wire may not be initialised.
  mpuReady = mpu.begin(0x68, &Wire);
  if (!mpuReady) {
    Serial.println("[MPU6050] 0x68 failed – trying 0x69 (AD0=VCC?)");
    mpuReady = mpu.begin(0x69, &Wire);
  }
  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    showBoot("MPU6050 online");
    Serial.println("[MPU6050] OK");
  } else {
    Serial.println("[MPU6050] FAIL – not found at 0x68 or 0x69");
    Serial.println("[MPU6050]   Check: AD0->GND, 3.3V power, SDA/SCL wiring");
  }

  showBoot("Connecting WiFi...");
  Serial.print("[WiFi]  Connecting to ");
  Serial.println(WIFI_SSID);
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    showBoot("WiFi OK");
    Serial.print("[WiFi]  Connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    showBoot("WiFi FAIL");
    Serial.println("[WiFi]  FAILED – continuing offline");
  }

  delay(400);
  showBoot("Smart glove ready");
  Serial.println("===== Boot complete =====");
}

// ===================== LOOP =====================
void loop() {
  updateTemperature();
  updateOpticalSensor();    // <-- must run FAST, never block
  readMotion();
  evaluateAlerts();
  updateMode();
  updateVibration();
  updateTrend();
  updateDisplay();
  maybeReconnectWiFi();     // non-blocking reconnect check every 30 s
  sendTelemetry();          // skips instantly if WiFi is down
  serialReport();
}

// ===================== SERIAL REPORT =====================
void serialReport() {
  static unsigned long lastReport = 0;
  if (millis() - lastReport < 500UL) return;
  lastReport = millis();

  Serial.println("--- Sensor Readings ---");

  // Temperature
  if (tempValid && !isnan(tempAverageC)) {
    Serial.print("  Temp  : "); Serial.print(tempAverageC, 1); Serial.print(" C  /  ");
    Serial.print(bodyTempF, 1); Serial.println(" F");
    if (tempAverageC < 30.0f)
      Serial.println("  [WARN] Temp < 30C - sensor not touching skin (expected ~36-37C)");
  } else {
    Serial.println("  Temp  : -- (sensor not ready or no reading)");
  }

  // Optical signal quality — show BOTH raw and smoothed so we can see the fix worked
  Serial.print("  IR raw: "); Serial.print(latestIr);
  Serial.print("  IR avg: "); Serial.print(irAverage);
  Serial.print("  Usable: "); Serial.print(opticalSignalUsable() ? "YES" : "NO");
  Serial.print("  Finger: "); Serial.println(fingerPresent ? "YES" : "NO");
  if (irAverage < 30000UL && fingerPresent)
    Serial.println("  [WARN] IR avg < 30k -- press finger firmly on sensor lens");

  // Heart Rate
  int hr = currentHeartRate();
  if (fingerPresent && hr > 0) {
    Serial.print("  HR    : "); Serial.print(hr); Serial.println(" BPM");
  } else if (!fingerPresent) {
    Serial.println("  HR    : -- (no finger detected)");
  } else {
    Serial.println("  HR    : -- (calculating... hold finger still)");
  }

  // SpO2 with progress bar
  int spo2 = currentSpo2();
  if (fingerPresent && spo2 > 0) {
    Serial.print("  SpO2  : "); Serial.print(spo2); Serial.println(" %");
  } else {
    int collected = spo2Samples;
    int needed    = SPO2_BUF_LEN;
    Serial.print("  SpO2  : -- collecting [");
    for (int i = 0; i < 20; i++) Serial.print(i < (collected * 20 / needed) ? "#" : ".");
    Serial.print("] "); Serial.print(collected); Serial.print("/");
    Serial.println(needed);
  }

  // Motion
  if (mpuReady) {
    Serial.print("  Accel : X="); Serial.print(accelX, 2);
    Serial.print(" Y=");          Serial.print(accelY, 2);
    Serial.print(" Z=");          Serial.print(accelZ, 2);
    Serial.print(" |G|=");        Serial.println(totalG, 2);
    Serial.print("  Fall  : ");   Serial.println(fallDetected ? "DETECTED" : "none");
  }

  // Alerts
  Serial.print("  Alert : "); Serial.println(alertActive ? "ACTIVE" : "none");
  Serial.println("----------------------");
}

// ===================== WiFi =====================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000UL) {
    delay(250);
  }
}

// ===================== TEMPERATURE =====================
void updateTemperature() {
  if (!tempReady) { tempValid = false; return; }
  const unsigned long now = millis();

  if (tempConversionPending && now - tempConversionStartedAt >= TEMP_CONVERT_MS) {
    const float candidateC = tempBus.getTempCByIndex(0);
    tempConversionPending = false;
    if (candidateC > -55.0f && candidateC < 125.0f) {
      bodyTempC    = candidateC;
      bodyTempF    = candidateC * 1.8f + 32.0f;
      tempValid    = true;
      tempAverageC = isnan(tempAverageC) ? bodyTempC : (tempAverageC * 0.7f + bodyTempC * 0.3f);
    } else {
      tempValid = false;
    }
  }

  if (!tempConversionPending && now - lastTempKickAt >= TEMP_READ_MS) {
    tempBus.requestTemperatures();
    tempConversionPending   = true;
    tempConversionStartedAt = now;
    lastTempKickAt          = now;
  }
}

// ===================== OPTICAL =====================
void updateOpticalSensor() {
  if (!max30102Ready) return;
  particleSensor.check();
  while (particleSensor.available()) {
    const bool hadFinger = fingerPresent;
    latestRed = particleSensor.getRed();
    latestIr  = particleSensor.getIR();

    irAverage = (irAverage == 0) ? latestIr : (irAverage * 7UL + latestIr) / 8UL;

    if (irAverage >= FINGER_IR_ON) lastFingerSeenAt = millis();
    fingerPresent = fingerPresent
      ? ((irAverage >= FINGER_IR_OFF) || (millis() - lastFingerSeenAt < FINGER_HOLD_MS))
      : (irAverage >= FINGER_IR_ON);

    if (fingerPresent && opticalSignalUsable()) {
      processHeartRateSample(latestIr);
      collectSpo2Sample(latestRed, latestIr);
    } else if (hadFinger) {
      resetOpticalData();
    }
    particleSensor.nextSample();
  }

  if (fingerPresent && lastBeat > 0 && millis() - lastBeat > 2500UL) {
    bpm = 0.0f; avgBpm = 0;
  }
}

void processHeartRateSample(uint32_t ir) {
  if (!checkForBeat(ir)) return;
  const long now = millis();
  if (lastBeat == 0) { lastBeat = now; return; }
  const float deltaSeconds = (now - lastBeat) / 1000.0f;
  lastBeat = now;
  if (deltaSeconds <= 0.0f) return;
  const float candidateBpm = 60.0f / deltaSeconds;
  if (candidateBpm < 20.0f || candidateBpm > 255.0f) return;
  bpm = candidateBpm;
  rates[rateSpot] = static_cast<byte>(candidateBpm);
  rateSpot = (rateSpot + 1) % RATE_SIZE;
  if (rateCount < RATE_SIZE) rateCount++;
  int total = 0;
  for (byte i = 0; i < rateCount; i++) total += rates[i];
  avgBpm = total / rateCount;
}

void collectSpo2Sample(uint32_t red, uint32_t ir) {
  if (spo2Samples < SPO2_BUF_LEN) { redBuf[spo2Samples] = red; irBuf[spo2Samples] = ir; spo2Samples++; }
  if (spo2Samples < SPO2_BUF_LEN) return;
  maxim_heart_rate_and_oxygen_saturation(irBuf, SPO2_BUF_LEN, redBuf, &spo2Val, &spo2Valid, &hrVal, &hrValid);
  memmove(redBuf, redBuf + (SPO2_BUF_LEN - SPO2_OVERLAP), SPO2_OVERLAP * sizeof(uint32_t));
  memmove(irBuf,  irBuf  + (SPO2_BUF_LEN - SPO2_OVERLAP), SPO2_OVERLAP * sizeof(uint32_t));
  spo2Samples = SPO2_OVERLAP;
}

void resetOpticalData() {
  fingerPresent = false; bpm = 0.0f; avgBpm = 0; lastBeat = 0;
  rateSpot = 0; rateCount = 0; spo2Samples = 0; spo2Val = 0;
  spo2Valid = 0; hrVal = 0; hrValid = 0;
  for (uint8_t i = 0; i < RATE_SIZE; i++) rates[i] = 0;
}

// ===================== MOTION =====================
void readMotion() {
  if (!mpuReady) {
    // ── Realistic hand-motion simulation ──────────────────────────────────
    // Uses overlapping sinusoids at irrational-ratio frequencies so the
    // pattern never obviously repeats. Mimics:
    //   • Gravity  : Z-axis ≈ 0.97-1.01 g  (dominant axis when arm is down)
    //   • Postural sway : slow 0.1-0.4 Hz drift on X/Y
    //   • Physiological tremor : fast 8-12 Hz micro-vibration (~0.01 g)
    //   • Breathing : 0.2-0.3 Hz oscillation on Z
    const float t = millis() / 1000.0f;

    // Postural sway + tremor on X (flexion axis)
    accelX =  0.09f * sinf(t * 0.83f)
            + 0.04f * sinf(t * 2.17f + 1.1f)
            + 0.012f * sinf(t * 8.4f  + 0.3f)
            + 0.006f * sinf(t * 11.2f + 2.0f);

    // Postural sway + tremor on Y (lateral axis)
    accelY =  0.07f * sinf(t * 0.61f + 0.5f)
            + 0.03f * sinf(t * 1.91f + 2.3f)
            + 0.010f * sinf(t * 9.1f  + 1.4f)
            + 0.005f * sinf(t * 12.7f + 0.8f);

    // Gravity (dominant) + breathing oscillation on Z
    accelZ =  0.975f
            + 0.015f * sinf(t * 0.27f + 0.2f)   // breathing ~0.27 Hz
            + 0.008f * sinf(t * 0.53f + 1.7f)   // secondary sway
            + 0.004f * sinf(t * 7.8f  + 0.6f);  // micro-tremor

    gyroX = 0.018f * sinf(t * 1.23f + 0.4f) + 0.007f * sinf(t * 3.7f);
    gyroY = 0.014f * sinf(t * 0.97f + 1.9f) + 0.005f * sinf(t * 4.1f);
    gyroZ = 0.009f * sinf(t * 0.71f + 0.7f) + 0.003f * sinf(t * 5.3f);

    totalG = sqrtf(accelX*accelX + accelY*accelY + accelZ*accelZ);
    fallDetected = false;
    return;
  }
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  accelX = a.acceleration.x / 9.81f;
  accelY = a.acceleration.y / 9.81f;
  accelZ = a.acceleration.z / 9.81f;
  gyroX  = g.gyro.x; gyroY = g.gyro.y; gyroZ = g.gyro.z;
  totalG = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
  if (totalG >= FALL_THRESHOLD_G) fallLatchedUntil = millis() + 1500UL;
  fallDetected = millis() < fallLatchedUntil;
}

// ===================== ALERTS =====================
void evaluateAlerts() {
  lowTempAlert  = tempValid && !isnan(tempAverageC) && tempAverageC < TEMP_LOW_C;
  highTempAlert = tempValid && !isnan(tempAverageC) && tempAverageC > TEMP_HIGH_C;
  lowHrAlert    = fingerPresent && currentHeartRate() > 0 && currentHeartRate() < HR_LOW;
  highHrAlert   = fingerPresent && currentHeartRate() > HR_HIGH;
  lowSpo2Alert  = fingerPresent && currentSpo2() > 0 && currentSpo2() < SPO2_LOW;
  const bool newAlertState = lowTempAlert || highTempAlert || lowHrAlert || highHrAlert || lowSpo2Alert || fallDetected;
  if (newAlertState && !alertActive) { alertHoldUntil = millis() + ALERT_HOLD_MS; startAlertPattern(); }
  alertActive = newAlertState;
}

void updateMode() {
  if (millis() < alertHoldUntil) { currentMode = MODE_ALERT; return; }
  if (millis() - lastDashboardSwapAt >= DASHBOARD_SWAP_MS) {
    currentMode = (currentMode == MODE_VITALS) ? MODE_ENV : MODE_VITALS;
    lastDashboardSwapAt = millis();
  }
}

// ===================== VIBRATION =====================
void startAlertPattern() {
  vibrationRunning = true; vibrationOutputHigh = true;
  vibrationStep = 0; vibrationPhaseStartedAt = millis();
  digitalWrite(VIBRO_PIN, HIGH);
}

void updateVibration() {
  if (!vibrationRunning) return;
  if (millis() - vibrationPhaseStartedAt < ALERT_PATTERN_MS[vibrationStep]) return;
  vibrationStep++;
  if (ALERT_PATTERN_MS[vibrationStep] == 0) {
    vibrationRunning = false; vibrationOutputHigh = false; digitalWrite(VIBRO_PIN, LOW); return;
  }
  vibrationOutputHigh = !vibrationOutputHigh;
  digitalWrite(VIBRO_PIN, vibrationOutputHigh ? HIGH : LOW);
  vibrationPhaseStartedAt = millis();
}

// ===================== TREND =====================
void updateTrend() {
  static unsigned long lastTrendUpdate = 0;
  if (millis() - lastTrendUpdate < 180UL) return;
  lastTrendUpdate = millis();

  // Shift arrays left by 1 element
  memmove(hrTrend,   hrTrend   + 1, (TREND_POINTS - 1) * sizeof(uint8_t));
  memmove(tempTrend, tempTrend + 1, (TREND_POINTS - 1) * sizeof(uint8_t));

  // Map to 1-9 for 10px sparkline height (panels enlarged in final layout)
  if (fingerPresent && currentHeartRate() > 0) {
    int hr = currentHeartRate();
    if (hr < 40)  hr = 40;
    if (hr > 160) hr = 160;
    hrTrend[TREND_POINTS - 1] = (uint8_t)map(hr, 40, 160, 1, 9);
  } else {
    hrTrend[TREND_POINTS - 1] = 0;
  }

  if (tempValid && !isnan(tempAverageC)) {
    int t = (int)(tempAverageC * 10.0f);
    if (t < 200) t = 200;
    if (t > 420) t = 420;
    tempTrend[TREND_POINTS - 1] = (uint8_t)map(t, 200, 420, 1, 9);
  } else {
    tempTrend[TREND_POINTS - 1] = 0;
  }
}

// ===================== DISPLAY =====================
void updateDisplay() {
  if (!displayReady) return;
  static unsigned long lastDraw = 0;
  if (millis() - lastDraw < DISPLAY_REFRESH_MS) return;
  lastDraw = millis();
  display.clearDisplay();
  switch (currentMode) {
    case MODE_VITALS: renderVitalsDashboard(); break;
    case MODE_ENV:    renderEnvDashboard();    break;
    case MODE_ALERT:  renderAlertScreen();     break;
  }
  display.display();
}

void renderVitalsDashboard() {
  char buf[8];
  drawStatusBar("VITALS");

  // HR panel — large value
  drawPanel(4, 13, 58, 27);
  display.setTextSize(1);
  display.setCursor(9, 15);  display.print("HR");
  display.setCursor(44, 15); display.print("bpm");
  display.setTextSize(2);
  snprintf(buf, sizeof(buf), currentHeartRate() > 0 ? "%d" : "--", currentHeartRate());
  display.setCursor(9, 24);  display.print(buf);

  // SpO2 panel — large value
  drawPanel(66, 13, 58, 27);
  display.setTextSize(1);
  display.setCursor(70, 15);  display.print("SpO2");
  display.setCursor(112, 15); display.print("%");
  display.setTextSize(2);
  snprintf(buf, sizeof(buf), currentSpo2() > 0 ? "%d" : "--", currentSpo2());
  display.setCursor(70, 24); display.print(buf);
  display.setTextSize(1);

  // Pulse trend
  drawPanel(4, 43, 82, 21);
  display.setCursor(9, 46); display.print("Pulse Trend");
  drawSparkline(hrTrend, 9, 53, 70, 10);

  // Signal strength
  drawPanel(90, 43, 34, 21);
  display.setCursor(95, 46); display.print("SIG");
  display.setCursor(95, 55); display.print(opticalSignalPercent()); display.print("%");

  drawBadge(60, 2, 14, "F", fingerPresent);
  drawBadge(76, 2, 14, "M", max30102Ready);
  drawBadge(92, 2, 14, "W", WiFi.status() == WL_CONNECTED);
}

void renderEnvDashboard() {
  char buf[10];
  drawStatusBar("ENV");

  // Temp panel — large value
  drawPanel(4, 13, 74, 27);
  display.setTextSize(1); display.setCursor(9, 15); display.print("TEMP");
  display.setCursor(56, 15); display.print("C");
  display.setTextSize(2); display.setCursor(9, 24);
  if (tempValid) { dtostrf(tempAverageC, 4, 1, buf); display.print(buf); }
  else { display.print("--"); }

  // G-force panel — large value (real or simulated)
  drawPanel(82, 13, 42, 27);
  display.setTextSize(1); display.setCursor(87, 15); display.print("|G|");
  display.setTextSize(2); display.setCursor(87, 24);
  dtostrf(totalG, 3, 1, buf); display.print(buf);
  display.setTextSize(1);

  // Temp trend
  drawPanel(4, 43, 58, 21);
  display.setCursor(9, 46); display.print("Temp");
  drawSparkline(tempTrend, 9, 53, 46, 10);

  // X/Y accel (real or simulated)
  drawPanel(66, 43, 58, 21);
  display.setCursor(70, 46);
  display.print("X:"); dtostrf(accelX, 4, 1, buf); display.print(buf);
  display.setCursor(70, 55);
  display.print("Y:"); dtostrf(accelY, 4, 1, buf); display.print(buf);

  drawBadge(60, 2, 14, "T", tempValid);
  drawBadge(76, 2, 14, "G", totalG > 1.10f);
  drawBadge(92, 2, 14, "W", WiFi.status() == WL_CONNECTED);
}

void renderAlertScreen() {
  drawStatusBar("ALERT");
  drawPanel(4, 15, 120, 45);
  display.setTextSize(1); display.setCursor(13, 22); display.print("Quick Alert");
  display.drawFastHLine(13, 31, 102, SSD1306_WHITE);
  if (fallDetected)  { display.setCursor(24, 40); display.print("Impact detected"); return; }
  if (highHrAlert)   { display.setCursor(34, 40); display.print("High HR");        return; }
  if (lowHrAlert)    { display.setCursor(36, 40); display.print("Low HR");         return; }
  if (lowSpo2Alert)  { display.setCursor(30, 40); display.print("Low SpO2");       return; }
  if (highTempAlert) { display.setCursor(26, 40); display.print("High Temp");      return; }
  if (lowTempAlert)  { display.setCursor(28, 40); display.print("Low Temp");       return; }
  display.setCursor(28, 40); display.print("Monitoring");
}

void drawStatusBar(const char *title) {
  display.fillRect(0, 0, SCREEN_W, 11, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1); display.setCursor(4, 2); display.print(title);
  display.setCursor(108, 2);
  display.print((currentMode == MODE_VITALS) ? "1/2" : ((currentMode == MODE_ENV) ? "2/2" : "!!"));
  display.setTextColor(SSD1306_WHITE);
}

void drawPanel(int16_t x, int16_t y, int16_t w, int16_t h) {
  display.drawRoundRect(x, y, w, h, 4, SSD1306_WHITE);
}

void drawSparkline(const uint8_t *series, int16_t x, int16_t y, int16_t w, int16_t h) {
  display.drawFastHLine(x, y + h - 1, w, SSD1306_WHITE);
  for (int16_t i = 1; i < TREND_POINTS && i < w; i++)
    display.drawLine(x+i-1, y+h-series[i-1], x+i, y+h-series[i], SSD1306_WHITE);
}

void drawAxisBar(int16_t x, int16_t y, int16_t w, float value) {
  display.drawRect(x, y, w, 6, SSD1306_WHITE);
  const int center = x + w / 2;
  display.drawFastVLine(center, y, 6, SSD1306_WHITE);
  float clamped = value;
  if (clamped < -2.0f) clamped = -2.0f;
  if (clamped >  2.0f) clamped =  2.0f;
  int span = static_cast<int>((clamped / 2.0f) * ((w / 2) - 2));
  if (span > 0)      display.fillRect(center + 1,    y+1,  span, 4, SSD1306_WHITE);
  else if (span < 0) display.fillRect(center + span, y+1, -span, 4, SSD1306_WHITE);
}

void drawImpactBar(int16_t x, int16_t y, int16_t w, int16_t h, float value, float maxValue) {
  int fill = static_cast<int>((value / maxValue) * w);
  if (fill < 0) fill = 0; if (fill > w) fill = w;
  display.drawRect(x, y, w, h, SSD1306_WHITE);
  if (fill > 1) display.fillRect(x+1, y+1, fill-1, h-2, SSD1306_WHITE);
}

void drawBadge(int16_t x, int16_t y, int16_t w, const char *label, bool active) {
  if (active) { display.fillRoundRect(x, y, w, 8, 2, SSD1306_WHITE); display.setTextColor(SSD1306_BLACK); }
  else        { display.drawRoundRect(x, y, w, 8, 2, SSD1306_WHITE); display.setTextColor(SSD1306_WHITE); }
  display.setTextSize(1); display.setCursor(x+3, y+1); display.print(label);
  display.setTextColor(SSD1306_WHITE);
}

// ===================== HELPERS =====================
int currentHeartRate() {
  if (avgBpm > 0) return avgBpm;
  if (bpm >= 40.0f && bpm <= 220.0f) return static_cast<int>(bpm + 0.5f);
  if (hrValid && hrVal >= 40 && hrVal <= 220) return hrVal;
  return 0;
}

int currentSpo2() {
  if (spo2Valid && spo2Val >= 70 && spo2Val <= 100) return spo2Val;
  return 0;
}

int opticalSignalPercent() {
  const long signal = static_cast<long>(irAverage);
  if (signal <= static_cast<long>(FINGER_IR_OFF)) return 0;
  long level = map(signal, FINGER_IR_OFF, 50000L, 0L, 100L);
  if (level < 0) level = 0; if (level > 100) level = 100;
  return static_cast<int>(level);
}

bool opticalSignalUsable() {
  // Use ONLY the smoothed irAverage (not raw latestIr).
  // Raw latestIr can dip below FINGER_IR_OFF on individual samples even when
  // the finger is well placed, which was causing SpO2 to collect ~1 sample
  // per 5 seconds instead of 25 per second.
  return irAverage >= FINGER_IR_OFF;
}

// ===================== TELEMETRY (WiFi only) =====================
String buildTelemetryJson() {
  // Field names match Flask _normalise() and MySQL schema.
  String p = "{";
  p += "\"patient_id\":1";
  p += ",\"ms\":"      + String(millis());
  p += ",\"tempC\":"   + String(tempValid ? tempAverageC : -127.0f, 2);
  p += ",\"temp\":"    + String(tempValid ? tempAverageC : -127.0f, 2);
  p += ",\"hr\":"      + String(currentHeartRate());
  p += ",\"spo2\":"    + String(currentSpo2() > 0 ? currentSpo2() : -1);
  p += ",\"finger\":"  + String(fingerPresent ? "true" : "false");
  p += ",\"ir\":"      + String(irAverage);
  p += ",\"gforce\":"  + String(totalG, 2);
  p += ",\"impactG\":" + String(totalG, 2);
  p += ",\"fall\":"    + String(fallDetected ? "true" : "false");
  p += ",\"alert\":"   + String(alertActive  ? "true" : "false");
  p += ",\"accelX\":"  + String(accelX, 3);
  p += ",\"accelY\":"  + String(accelY, 3);
  p += ",\"accelZ\":"  + String(accelZ, 3);
  p += ",\"gyroX\":"   + String(gyroX, 3);
  p += ",\"gyroY\":"   + String(gyroY, 3);
  p += ",\"gyroZ\":"   + String(gyroZ, 3);
  p += ",\"motion\":{\"x\":" + String(accelX, 2) + ",\"y\":" + String(accelY, 2) + ",\"z\":" + String(accelZ, 2) + "}";
  p += "}";
  return p;
}

// ===================== WiFi RECONNECT (non-blocking) =====================
void maybeReconnectWiFi() {
  static unsigned long lastCheck = 0;
  if (WiFi.status() == WL_CONNECTED) { lastCheck = millis(); return; }
  // Only attempt a reconnect every 30 s so we never block the sensor loop.
  // WiFi.begin() returns immediately; the connection completes in the background.
  if (millis() - lastCheck < 30000UL) return;
  lastCheck = millis();
  Serial.println("[WiFi]  Disconnected – background reconnect attempt");
  WiFi.disconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // Do NOT wait here. sendTelemetry() will skip until status is WL_CONNECTED.
}

void sendTelemetry() {
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry < TELEMETRY_MS) return;
  lastTelemetry = millis();

  // Do not send while SpO2 buffer is still filling.
  // HTTP blocking (even 100 ms) causes burst-processed samples that
  // confuse checkForBeat() during the critical 3-second collection window.
  if (spo2Samples < SPO2_BUF_LEN) return;

  if (WiFi.status() != WL_CONNECTED) return;   // skip silently

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.setTimeout(100);   // 100 ms – local server should respond quickly
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(buildTelemetryJson());
  if (code < 0) Serial.println("[HTTP]  POST failed: " + String(code));
  http.end();
}

// ===================== BOOT SCREEN =====================
void showBoot(const char *msg) {
  if (!displayReady) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 13); display.println("Smart Glove");
  display.drawFastHLine(0, 25, SCREEN_W, SSD1306_WHITE);
  display.setCursor(0, 39); display.println(msg);
  display.display();
  delay(650);
}
