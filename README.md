# VitalGlove - Smart Health Monitoring System

> A research-grade IoT health monitoring glove that continuously tracks heart rate, SpO2, body temperature, and motion using ESP32 with real-time cloud analytics, AI-powered insights, and tiered emergency escalation.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Hardware Setup](#hardware-setup)
4. [Software Stack](#software-stack)
5. [Research Gaps Addressed](#research-gaps-addressed)
6. [ML Pipeline](#ml-pipeline)
7. [Simulation Engine](#simulation-engine)
8. [API Reference](#api-reference)
9. [Setup Guide](#setup-guide)
10. [User Roles](#user-roles)
11. [Data Flow](#data-flow)
12. [Screenshots & Demo](#screenshots--demo)
13. [Datasets & References](#datasets--references)

---

## System Overview

| Metric | Value |
|--------|-------|
| User Roles | 3 (Patient, Doctor, Admin) |
| Research Gaps Filled | 7 (G1-G7) |
| Alert Latency | < 2 seconds |
| Monitoring | 24/7 continuous |
| ML Accuracy | 95.96% CV / 99.51% test |
| Scenarios | 9 clinical simulations |
| Escalation Tiers | 3 (Doctor -> Family -> Emergency 108) |

### What It Does

1. **Wearable Glove** (ESP32-C3) reads HR, SpO2, temperature, and 3-axis motion every 500ms
2. **Flask Backend** receives telemetry via WiFi, computes risk score (0-100), runs ML classification, and stores in MySQL
3. **Groq AI** (LLaMA3-70B) generates natural language health insights for patients and doctors
4. **React Frontend** displays live vitals, scenario simulations, and role-based dashboards
5. **Tiered Escalation** automatically alerts doctor (L1), family (L2), and emergency services (L3)
6. **Wireless Glove Sync** - changing a scenario in the browser updates the physical OLED within 3 seconds

---

## Architecture

```
+-------------------+       WiFi/HTTP POST        +------------------+
|   ESP32-C3 Glove  | --------------------------> |  Flask Backend   |
|                   |       every 500ms           |  (Port 5001)     |
|  MAX30102 (HR/SpO2)                             |                  |
|  DS18B20 (Temp)   | <-- GET /api/glove/command  |  api/telemetry   |
|  MPU6050 (Motion) |       every 3s              |  api/vitals      |
|  OLED Display     |                             |  api/demo        |
+-------------------+                             |  api/emergency   |
                                                  |  api/ai_routes   |
                                                  |  api/ml_routes   |
                                                  |  api/patients    |
                                                  +--------+---------+
                                                           |
                              +----------------------------+----------------------------+
                              |                            |                            |
                    +---------v--------+      +------------v-----------+    +-----------v----------+
                    |  MySQL Database  |      |  Groq AI (LLaMA3-70B) |    |  ML Engine           |
                    |  - patients      |      |  - Health insights    |    |  - RandomForest      |
                    |  - telemetry     |      |  - Alert explanation  |    |  - 9-class classify  |
                    |  - alerts        |      |  - Daily summaries    |    |  - Real-time predict |
                    |  - ai_insights   |      +------------------------+    +----------------------+
                    +------------------+
                              |
                    +---------v---------+
                    |  React Frontend   |
                    |  (Vite, Port 8080)|
                    |                   |
                    |  / Demo Panel     |  <-- Public (no login needed)
                    |  /dashboard       |  <-- Patient role
                    |  /doctor          |  <-- Doctor role
                    |  /admin           |  <-- Admin role
                    |  /emergency       |  <-- Emergency center
                    +-------------------+
```

---

## Hardware Setup

### Components

| Component | Purpose | Pin |
|-----------|---------|-----|
| ESP32-C3 Super Mini | Main MCU | - |
| MAX30102 | Heart rate + SpO2 | SDA=GPIO6, SCL=GPIO7 |
| DS18B20 | Body temperature | GPIO5 (with 4.7k pullup) |
| MPU6050 | 3-axis accel/gyro (fall detect) | SDA=GPIO6, SCL=GPIO7 (AD0->GND) |
| SSD1306 OLED (128x64) | Status display | SDA=GPIO6, SCL=GPIO7 |
| Vibration Motor | Alert feedback | GPIO3 |

### Wiring Notes

- MAX30102 and MPU6050 share the I2C bus (SDA=GPIO6, SCL=GPIO7)
- MPU6050 AD0 pin **must be connected to GND** for address 0x68
- DS18B20 needs a 4.7k ohm pullup resistor between DATA and VCC
- All sensors powered by 3.3V from ESP32

### Firmware

The firmware is in `glove.cpp`. Key features:
- Non-blocking sensor reads (never blocks the main loop)
- SpO2 calculation using R-ratio algorithm (100 samples, 25-sample overlap)
- Fall detection via G-force threshold (>2.5G = potential fall, >4.0G = confirmed)
- WiFi telemetry POST every 500ms
- Polls `/api/glove/command` every 3 seconds for wireless scenario sync
- OLED displays: vitals, risk score, active scenario label, WiFi status

---

## Software Stack

### Backend (`/server`)

```
server/
  app.py                 # Flask entry point, blueprint registration
  config.py              # All constants (thresholds, ports, keys)
  db.py                  # MySQL auto-creation + connection pool
  requirements.txt       # Python dependencies
  .env                   # API keys (not committed)
  api/
    telemetry.py         # POST /api/telemetry (ESP32 data intake)
    vitals.py            # GET /api/latest, /api/history
    demo.py              # Scenario control + /api/glove/command
    emergency.py         # SOS button + L3 escalation
    ai_routes.py         # Groq AI insight generation
    ml_routes.py         # ML model info, predict, retrain
    patients.py          # Patient CRUD
  core/
    risk.py              # Risk scoring engine (0-100)
    alerts.py            # 3-tier escalation (L1/L2/L3)
    ai.py                # Groq LLaMA3 integration
  simulation/
    engine.py            # Central scenario registry + dataset generator
    scenarios/
      normal.py          # Resting baseline
      hypoxia.py         # Progressive SpO2 drop
      fall.py            # 3-phase fall event
      tachycardia.py     # SVT / exercise HR rise
      fever.py           # Sigmoid temperature curve
      bradycardia.py     # HR drop to 38 BPM
      sleep_apnea.py     # Periodic SpO2 sawtooth
      arrhythmia.py      # AFib-like random HR
      exercise.py        # Warm-up / peak / cool-down
  ml/
    trainer.py           # Multi-algorithm comparison trainer
    predictor.py         # Real-time inference
    model.pkl            # Trained model (generated)
    model_meta.json      # Accuracy, features, comparison
    algorithm_comparison.json
```

### Frontend (`/vital-monitor-suite`)

```
vital-monitor-suite/
  src/
    pages/
      DemoPanel.tsx      # Landing page - simulation selector
      Patient.tsx        # Patient dashboard (live vitals, meds, SOS)
      DoctorDashboard.tsx # Doctor fleet view (risk-sorted patients)
      Emergency.tsx      # Escalation timeline + manual overrides
      AdminDashboard.tsx # System management
      Login.tsx          # Role-based authentication
      Signup.tsx         # Account creation
    context/
      AuthContext.tsx    # 3 roles: patient, doctor, admin
      VitalsContext.tsx  # Real-time vitals state
      ConnectionContext.tsx # Data source toggle (device/simulation/flask)
    components/
      VitalCard.tsx      # Animated vital sign card
      Sparkline.tsx      # SVG trend graph
      NavBar.tsx         # Role-aware navigation
      ProtectedRoute.tsx # Route guard by role
```

---

## Research Gaps Addressed

| Gap | Description | How VitalGlove Fills It | Implementation |
|-----|-------------|------------------------|----------------|
| **G1** | No real-time end-to-end deployment | ESP32 with live WiFi telemetry to Flask backend | `glove.cpp` -> `api/telemetry.py` |
| **G2** | No patient-facing interface | Full patient dashboard with live vitals, risk score, meds, SOS | `Patient.tsx` |
| **G3** | Scalability not addressed | MySQL + Flask + WebSocket + connection pooling | `db.py`, `app.py` |
| **G4** | No emergency escalation layer | 3-tier: Doctor(L1) -> Family(L2) -> Ambulance/108(L3) + SOS button | `core/alerts.py`, `api/emergency.py`, `Emergency.tsx` |
| **G5** | Data privacy left as future work | Role-based access (patient/doctor/admin), protected routes | `AuthContext.tsx`, `ProtectedRoute.tsx` |
| **G6** | No cloud + edge hybrid | Edge: threshold rules on ESP32. Cloud: RandomForest ML + Groq AI | `glove.cpp` (edge), `ml/predictor.py` (cloud) |
| **G7** | EHR/doctor integration missing | Doctor dashboard with patient fleet, risk sorting, AI insights | `DoctorDashboard.tsx`, `api/ai_routes.py` |

---

## ML Pipeline

### Algorithm Comparison (5-fold Cross-Validation)

| Algorithm | CV Accuracy | Std Dev | Train Time |
|-----------|------------|---------|------------|
| **Random Forest** | **95.96%** | 0.0110 | 0.8s |
| Gradient Boosting | 95.33% | 0.0214 | 45.2s |
| MLP Neural Network | 94.20% | 0.0167 | 23.4s |
| SVM (RBF kernel) | 93.28% | 0.0173 | 3.2s |
| KNN (k=7) | 91.07% | 0.0221 | 0.2s |

**Winner: Random Forest** (highest accuracy, fastest training, interpretable feature importances)

### Test Set Performance (15% holdout)

| Class | Precision | Recall | F1-Score |
|-------|-----------|--------|----------|
| Normal | 0.98 | 0.99 | 0.98 |
| Hypoxia | 1.00 | 0.99 | 0.99 |
| Fall | 1.00 | 1.00 | 1.00 |
| Tachycardia | 0.99 | 1.00 | 0.99 |
| Fever | 0.99 | 0.99 | 0.99 |
| Bradycardia | 1.00 | 1.00 | 1.00 |
| Sleep Apnea | 1.00 | 1.00 | 1.00 |
| Arrhythmia | 1.00 | 1.00 | 1.00 |
| Exercise | 1.00 | 0.99 | 0.99 |
| **Overall** | **0.99** | **0.99** | **0.99** |

### Features Used (9 features)

`hr`, `spo2`, `temp`, `gforce`, `fall`, `accelX`, `accelY`, `accelZ`, `risk`

### How to Retrain

```bash
cd server
pip install -r requirements.txt
python ml/trainer.py
```

The trainer automatically:
1. Generates 5,400 labeled samples (600 per scenario) from the simulation engine
2. Compares 5 algorithms with 5-fold cross-validation
3. Picks the best model
4. Saves `model.pkl` + `model_meta.json`

### How ML Is Used in the System

Every vitals response from `/api/latest` is **automatically enriched** with ML predictions:

```json
{
  "hr": 72, "spo2": 98, "temp": 36.6, "risk": 10,
  "ml_class": "normal",
  "ml_confidence": 0.95,
  "ml_algorithm": "RandomForest",
  "ml_ready": true,
  "escalation_tier": 0,
  "escalation_label": "No escalation - vitals normal"
}
```

The ML model runs on every reading (< 1ms inference), classifying it into one of 9 clinical scenarios. This powers the DemoPanel live classification, Patient AI urgency assessment, and Doctor risk sorting.

### Groq AI (LLaMA3-70B) Integration

| Feature | Endpoint | Where Used |
|---------|----------|------------|
| Health Insight | `POST /api/ai/insight` | Patient & Doctor dashboards |
| Alert Explanation | `POST /api/ai/explain` | Emergency page |
| Urgency Detection | Combined with ML risk | Patient AI Assessment panel |

The Patient dashboard "Analyze Now" button triggers Groq AI which returns urgency level (Safe / Need to Visit / Emergency) with actionable recommendations.

---

## Simulation Engine

9 research-grade clinical scenarios, each with:
- Medically accurate waveform generation (sigmoid, tanh, sawtooth curves)
- Peer-reviewed citations
- Expected escalation tier
- Research gap references

| Scenario | Medical Model | Expected Risk | Escalation |
|----------|--------------|---------------|------------|
| Normal | Resting sinusoidal baseline | 5-20 | None |
| Hypoxia | SpO2 97->82% over 40s | 55-95 | L2 |
| Fall | 3-phase: impact/stillness/recovery | 85-100 | L3 |
| Tachycardia | tanh HR ramp 78->145 BPM | 45-80 | L1 |
| Fever | Sigmoid temp 36.6->38.9C with chills | 20-65 | L1 |
| Bradycardia | HR drops 72->38 BPM | 35-75 | L1 |
| Sleep Apnea | Periodic SpO2 dips every 30s | 15-55 | L1 |
| Arrhythmia | AFib-like random-walk HR | 30-75 | L1 |
| Exercise | Warm-up/peak/cool-down cycle | 15-55 | None |

### How Simulation Works

1. User selects a scenario from the Demo Panel (browser UI)
2. Flask stores the active scenario ID
3. `/api/latest` returns vitals generated by that scenario's `generate()` function
4. ESP32 polls `/api/glove/command` every 3s and updates its OLED
5. Scenario runs continuously until the user changes it
6. No hardcoded values - all vitals are generated dynamically with noise and drift

---

## API Reference

### Telemetry
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/telemetry` | Receive vitals from ESP32 |
| GET | `/api/latest` | Get current vitals (real or simulated) |
| GET | `/api/history?n=60` | Get last N readings from MySQL |

### Demo Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demo/scenarios` | List all 9 scenario metadata objects |
| POST | `/api/demo/trigger` | Activate a scenario `{scene: "hypoxia"}` |
| GET | `/api/demo/status` | Current scenario + ESP32 connection status |
| GET | `/api/glove/command` | Polled by ESP32 for wireless scenario sync |

### Emergency
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emergency/sos` | Patient one-tap SOS (triggers L3) |
| GET | `/api/emergency/status` | Active emergency state |
| POST | `/api/emergency/resolve` | Doctor resolves emergency |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/insight` | Generate Groq AI health insight |
| POST | `/api/ai/explain` | Explain an alert in plain English |
| GET | `/api/ai/insights` | Get insight history |

### ML
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ml/info` | Model metadata (accuracy, features) |
| POST | `/api/ml/predict` | Classify a single reading |
| POST | `/api/ml/train` | Trigger background model retraining |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/<id>/alerts` | Get patient's alert history |

---

## Setup Guide

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+ (local installation)
- Arduino IDE / PlatformIO (for ESP32 firmware)

### Step 1: Backend

```bash
cd server

# Create .env file
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
echo "MYSQL_HOST=localhost" >> .env
echo "MYSQL_USER=root" >> .env
echo "MYSQL_PASSWORD=your_mysql_password" >> .env
echo "MYSQL_DB=vitalglove" >> .env

# Install dependencies
pip install -r requirements.txt

# Train ML model (compares 5 algorithms, picks best)
python ml/trainer.py

# Start Flask
python app.py
# -> Server starts on http://localhost:5001
# -> Database "vitalglove" auto-created with all tables
```

### Step 2: Frontend

```bash
cd vital-monitor-suite

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev
# -> Frontend starts on http://localhost:8080
```

### Step 3: ESP32 Firmware (optional for demo)

1. Open `glove.cpp` in Arduino IDE
2. Replace `YOUR_PC_IP` with your actual PC IP (run `ipconfig` on Windows)
3. Update WiFi credentials if needed
4. Flash to ESP32-C3
5. The glove will auto-connect and start sending telemetry

### Step 4: Demo Without Hardware

1. Open `http://localhost:8080` (lands on Demo Panel)
2. Select any of the 9 scenarios
3. Watch live vitals update in real-time
4. Click "Sign In" -> use demo credentials:
   - Patient: `patient@vitalglove.dev` / `patient123`
   - Doctor: `doctor@vitalglove.dev` / `doctor123`
   - Admin: `admin@vitalglove.dev` / `admin123`

---

## User Roles

### Patient (`/dashboard`)
- Live vitals display (HR, SpO2, temp, G-force)
- Risk score with color-coded severity
- Medication reminders with check-off
- Symptom input log
- SOS button (triggers L3 emergency)
- Vitals trend sparklines

### Doctor (`/doctor`)
- Risk-sorted patient fleet table
- Per-patient HR trend sparklines
- Alert history per patient
- AI-generated health insights via Groq
- Emergency notification badges

### Admin (`/admin`)
- System configuration
- User management
- Device status overview
- Data source control (device/simulation)

### Emergency Center (`/emergency`)
- Auto-escalation timeline (L1->L2->L3)
- Patient location with GPS coordinates
- Manual override buttons (Alert Doctor, Notify Family, Call 108)
- Incident log with timestamps
- Vitals snapshot in emergency modal

---

## Data Flow

### Normal Monitoring
```
Glove Sensors -> ESP32 Edge AI (thresholds) -> WiFi POST -> Flask
  -> core/risk.py (0-100 score)
  -> ml/predictor.py (9-class classification)
  -> core/alerts.py (L1/L2/L3 check)
  -> MySQL (persist)
  -> Socket.IO -> React (< 2s latency)
```

### Emergency Flow
```
Anomaly / SOS -> Flask /api/emergency/sos
  -> Save vitals snapshot to DB
  -> L1: Doctor alerted (push notification simulated)
  -> L2: Family notified (SMS simulated)
  -> L3: Ambulance 108 dispatched (API simulated)
  -> Socket.IO broadcast to all clients
  -> Emergency.tsx shows escalation timeline
```

### Wireless Glove Sync
```
Browser: User clicks "Hypoxia" in Demo Panel
  -> POST /api/demo/trigger {scene: "hypoxia"}
  -> Flask stores active scenario

ESP32: polls GET /api/glove/command every 3s
  -> receives {scenario: "hypoxia", label: "Hypoxia Event", tier: 2}
  -> updates OLED display immediately
  -> no reflash or recompile needed
```

---

## Datasets & References

### Recommended Public Datasets

| Dataset | URL | Use Case |
|---------|-----|----------|
| UCI HAR | https://archive.ics.uci.edu/dataset/240 | Fall detection + activity recognition |
| MobiAct | https://bmi.hmu.gr/the-mobifall-and-mobiact-datasets-2/ | Fall/ADL with accelerometer |
| MIMIC-III | https://physionet.org/content/mimiciii/1.4/ | Clinical vitals (HR, SpO2, temp) |
| PPG-DaLiA | https://archive.ics.uci.edu/dataset/495 | Wrist PPG heart rate estimation |

### Research References

- Jubran A. (2015). "Pulse oximetry." *Critical Care*, 19(1), 272.
- Mubashir M. et al. (2013). "A survey on fall detection." *Pervasive and Mobile Computing*.
- Page RL et al. (2016). "2015 ACC/AHA/HRS Guideline for SVT Management." *JACC*.
- Dinarello CA & Porat R. (2022). "Fever." *Harrison's Principles of Internal Medicine*.
- Levy P et al. (2015). "Obstructive sleep apnoea syndrome." *Nature Reviews Disease Primers*.
- January CT et al. (2019). "2019 AHA/ACC/HRS Focused Update on AFib." *JACC*.
- ACSM Guidelines for Exercise Testing (2022), 11th edition.
- Mangrum JM & DiMarco JP. (2000). "Bradycardia." *NEJM* 342(10):703-709.

---

## Environment Variables

Create `server/.env` with:

```env
GROQ_API_KEY=gsk_your_key_here
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=vitalglove
FLASK_PORT=5001
CORS_ORIGINS=http://localhost:8080
```

---

## License

This project is developed as part of an academic research study on IoT-based health monitoring systems.

---

*Built with ESP32-C3, Flask, React, MySQL, Groq AI, and scikit-learn.*
