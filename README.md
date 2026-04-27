# VitalGlove — Smart Health Monitoring Glove System

> **Research-level** end-to-end wearable health monitoring platform.  
> ESP32-C3 glove → Flask backend → MySQL → React dashboard + Groq AI insights.

---

## What is VitalGlove?

VitalGlove is a smart glove worn on one hand that continuously reads your **heart rate, blood oxygen (SpO₂), body temperature, and hand motion** using sensors stitched into the glove. This data is sent over WiFi to a website where doctors and patients can see live readings, historical trends, and AI-generated health summaries — all in real time.

It can also run **without any physical glove at all** (Simulation Mode), making it perfect for research demonstrations and presentations.

---

## How the System Works (Simple Version)

```
[Your Hand wearing the Glove]
        ↓
 Sensors measure: HR, SpO2, Temp, Motion
        ↓
 ESP32-C3 chip sends data over WiFi every 500ms
        ↓
 [Flask Server on your PC]  ←→  [MySQL Database]
        ↓                              ↓
 Saves to database            Stores all readings
        ↓
 [React Website — vital-monitor-suite]
   Patient sees: live vitals, risk score, alerts
   Doctor sees: all patients, trends, anomalies
   Demo Panel: trigger simulated health events
        ↓
 [Groq AI — llama3-70b]
   Generates health insights in plain English
```

---

## Hardware Setup

### What You Need

| Component | Purpose |
|-----------|---------|
| ESP32-C3 | Brain of the glove — runs the firmware |
| MAX30102 | Measures heart rate and SpO₂ (blood oxygen) |
| MPU6050 | Measures hand movement and detects falls |
| DS18B20 | Measures body temperature |
| SSD1306 OLED | Tiny screen on the glove showing live readings |
| Vibration motor | Alerts the patient by vibrating the glove |

### Wiring (all sensors share the same I2C bus)

| Sensor Pin | ESP32-C3 Pin | Notes |
|-----------|-------------|-------|
| All sensors VCC | **3.3V** | ⚠️ Never use 5V |
| All sensors GND | **GND** | |
| SDA (OLED, MAX30102, MPU6050) | **GPIO 6** | Shared I2C data |
| SCL (OLED, MAX30102, MPU6050) | **GPIO 7** | Shared I2C clock |
| DS18B20 DATA | **GPIO 5** | Temperature |
| MPU6050 AD0 | **GND** | ⚠️ Must be connected! Sets address to 0x68 |
| Vibration motor | **GPIO 4** | |

---

## Quick Start — 3 Steps

### Step 1: Flash the Glove

1. Open `glove.cpp` in Arduino IDE
2. Set your WiFi and PC IP:
   ```cpp
   const char *WIFI_SSID     = "YourWiFiName";
   const char *WIFI_PASSWORD = "YourPassword";
   const char *API_ENDPOINT  = "http://YOUR_PC_IP:5001/api/telemetry";
   ```
   Find `YOUR_PC_IP` by running `ipconfig` and using the **WiFi adapter IPv4** address.
3. Select board: **ESP32C3 Dev Module**, upload speed **115200**
4. Flash to the ESP32-C3

### Step 2: Start the Flask Backend

```bash
cd "GLOVE FINAL/server"
pip install -r requirements.txt

# Copy the environment template and fill in your values
copy .env.example .env
# Edit .env: add your Groq API key and MySQL password

python app.py
```

You should see:
```
[VitalGlove] Flask backend starting on port 5001
[DB] Connected to MySQL at localhost:3306/vitalglove
```

### Step 3: Start the React Website

```bash
cd "GLOVE FINAL/vital-monitor-suite"
npm run dev
```

Open your browser: **http://localhost:8080**

---

## The Three Modes

### 🔬 Simulation Mode (default — no glove needed)
The website generates realistic fake health data that behaves exactly like a real glove. Use this for demos and presentations. Access the **Demo Panel** at http://localhost:8080/demo to trigger specific health events.

### 🌐 Flask Mode (website talks to Flask, Flask generates data)
The website talks to the Flask backend. Flask can serve simulated data or real glove data. Good for testing the full backend pipeline without the physical glove.

### 📡 Real Hardware Mode (full system)
The physical glove sends data → Flask saves to MySQL → website shows live readings. Every reading is stored in the database and can be retrieved anytime.

---

## Demo Scenarios (for Presentations)

Go to **http://localhost:8080/demo** and click any scenario button:

| Scenario | What it Simulates | Research Gap Demonstrated |
|----------|------------------|--------------------------|
| **Normal Monitoring** | Healthy baseline vitals | G1: Real deployment, G6: Edge+Cloud |
| **Hypoxia Event** | SpO₂ drops to 82% gradually | G4: Emergency escalation |
| **Fall Detection** | G-force spike, glove vibrates | G1: Real hardware, G4: Auto-alert |
| **Tachycardia** | Heart rate rises to 145 BPM | G2: Patient dashboard, G7: Doctor alert |
| **Fever Alert** | Temperature climbs to 38.8°C | G2: Patient interface, G3: Scalability |

---

## AI Features (Groq)

The system uses **LLaMA 3 70B** via Groq API for:

1. **Health Insight Summary** — Reviews last 20 readings and writes a plain-English health status
2. **Alert Explanation** — When an anomaly is detected, explains it in words a patient can understand
3. **Fallback mode** — If no Groq API key is set, a built-in rule-based system still generates basic insights

To enable: add `GROQ_API_KEY=your_key` to `server/.env`  
Get a free key at: https://console.groq.com

---

## Database (MySQL)

The system automatically creates all tables on first start. No manual SQL needed.

| Table | What it stores |
|-------|---------------|
| `patients` | Patient profiles (name, age, condition) |
| `telemetry_readings` | Every sensor reading (HR, SpO₂, temp, motion, risk score) |
| `alerts` | Triggered health alerts with severity |
| `ai_insights` | Groq-generated health summaries |

To view data:
```sql
USE vitalglove;
SELECT * FROM telemetry_readings ORDER BY id DESC LIMIT 10;
SELECT * FROM alerts WHERE resolved = FALSE;
SELECT * FROM ai_insights ORDER BY id DESC LIMIT 5;
```

---

## Project File Structure

```
GLOVE FINAL/
├── glove.cpp                    ← ESP32 firmware (Arduino)
├── vitalglove_full_system.html  ← System architecture blueprint
├── README.md                    ← This file
│
├── server/                      ← Flask backend
│   ├── app.py                   ← Main Flask app (routes, WebSocket)
│   ├── db.py                    ← MySQL connection and queries
│   ├── risk.py                  ← Risk scoring engine
│   ├── ai.py                    ← Groq AI integration
│   ├── simulation.py            ← Software health simulator
│   ├── requirements.txt         ← Python packages
│   └── .env.example             ← Environment variable template
│
└── vital-monitor-suite/         ← React frontend
    └── src/
        ├── pages/
        │   ├── Patient.tsx      ← Patient live vitals dashboard
        │   ├── DoctorDashboard.tsx  ← Doctor fleet view
        │   ├── Emergency.tsx    ← Emergency escalation
        │   └── DemoPanel.tsx    ← Research demo control panel
        ├── context/
        │   └── ConnectionContext.tsx  ← Mode switching (sim/flask/device)
        └── hooks/
            └── useVitals.ts     ← Real-time data polling + WebSocket
```

---

## Research Gap Coverage

This project addresses 7 key gaps identified in published IoT health monitoring research:

| Gap | Problem in Literature | VitalGlove Solution |
|-----|----------------------|---------------------|
| G1 | Models tested in lab, never deployed | ESP32 with live BLE/WiFi to real app |
| G2 | Only doctors get alerts, no patient UI | Patient dashboard with risk score & SOS |
| G3 | No scalability across device profiles | Firebase/MySQL + standardised API |
| G4 | Alert generation only, no escalation | L1 Doctor → L2 Family → L3 Ambulance |
| G5 | Data privacy left unsolved | Role-based access (patient/doctor/admin) |
| G6 | Either edge OR cloud, never both | TinyML on ESP32 + cloud risk engine |
| G7 | Poor EHR/doctor integration | Doctor dashboard + messaging + alerts |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| ESP32 Serial shows `POST failed` | Check `API_ENDPOINT` IP matches your PC's WiFi IP |
| Flask shows `DB pool not initialised` | MySQL not running — start MySQL service |
| Website shows `—` for all values | Flask not running, or mode set to wrong source |
| Groq insight says "GROQ_API_KEY not set" | Add key to `server/.env` |
| MPU6050 shows `FAIL` at boot | Connect **AD0 pin → GND** on the MPU6050 module |
| SpO₂ shows "collecting..." forever | Keep finger still on MAX30102 for 5–10 seconds |

---

## License

MIT License — free to use, modify, and distribute for research and educational purposes.
