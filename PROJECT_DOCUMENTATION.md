# VitalGlove — Complete System Documentation

> A smart health monitoring glove that tracks your vitals in real-time, uses Machine Learning to detect health conditions, and connects patients, families, and doctors on one shared platform.

---

## What Is VitalGlove?

VitalGlove is a wearable health monitoring system built around a smart glove. The glove uses sensors to continuously measure:

- **Heart Rate** (beats per minute)
- **Blood Oxygen (SpO2)** (percentage)
- **Body Temperature** (in Celsius)
- **Motion / Falls** (using accelerometer)

These readings are sent wirelessly to a server, which runs Machine Learning and AI to detect health problems, alert families, and suggest the right doctor — all in real time.

---

## How the System Works (Step by Step)

### Step 1: Patient Opens the App

The patient opens `http://localhost:8080`. The first page is the **Demo Panel**, which shows 9 clinical simulations (Normal, Hypoxia, Tachycardia, Fall, Fever, etc.). This is the starting point for demonstrating the system.

### Step 2: Sign In

The patient clicks "Sign In" and logs in with their credentials. The system supports 3 roles:

| Role | Login | What They See |
|------|-------|---------------|
| Patient | `patient@vitalglove.dev` / `patient123` | Live vitals, AI analysis, meds, family, SOS |
| Doctor | `doctor@vitalglove.dev` / `doctor123` | Patient requests, accept/reject, vitals, ML data |
| Admin | `admin@vitalglove.dev` / `admin123` | All users, system logs, analytics |

### Step 3: Sync Glove

On the Patient Dashboard, the patient clicks **"Sync Glove"**. An animation shows:
1. "Connecting..." (with pulse animation)
2. "Syncing data..."
3. "Glove Synced ✓"

After syncing, the dashboard shows live vitals from the glove (or simulation).

### Step 4: Live Monitoring

The dashboard displays 4 vital cards:
- ❤️ Heart Rate (BPM)
- 🩸 SpO2 (%)
- 🌡 Temperature (°C)
- ⚡ G-Force / Fall Detection

Plus sparkline trend charts and a risk score (0-100).

### Step 5: AI Health Assessment

The patient clicks **"Analyze Now"**. This triggers the full analysis pipeline:

```
What happens behind the scenes:

1. ML Model (RandomForest) classifies the vitals
   → Example: "tachycardia" (99% confidence)

2. Rule-based engine calculates risk score
   → Example: 65/100 (Caution)

3. Groq AI (LLaMA3-70B) receives EVERYTHING:
   - Glove vitals
   - ML prediction
   - Risk score
   - Current medications (Metoprolol, Aspirin...)
   - Reported symptoms (chest tightness, dizziness...)
   - Medical history (Hypertension, Diabetes, Previous MI)
   - Active prescriptions (with dose and timing)
   - Family health (Father: cardiac arrest at 68)
   - Doctor notes (BP 140/90, lifestyle changes advised)

4. AI returns:
   → Urgency: Safe / Need Doctor Visit / Emergency
   → Explanation in simple language
   → Recommendations (3 steps)
   → Suggested doctor specialty (Cardiologist, Pulmonologist...)
```

**Important**: The AI does NOT just look at glove data. It considers the full patient picture — medications, history, family health, and doctor notes — to make its assessment.

### Step 6: Family Members See Everything

Family members connected to the patient can see:
- Live vitals and alerts
- AI urgency status (Safe / Visit / Emergency)
- Activity feed

Family members are managed through the **Family Health Hub**:
- Create a family group (e.g., "The Sharma Family")
- Quick-add members by name and relation
- The creator is automatically the **Admin** of the group
- Other members are tagged as **Member**

### Step 7: Booking a Doctor

Based on the AI suggestion (e.g., "Visit a Cardiologist"), the patient can:

1. Click **"Find Cardiologist (AI Recommended)"**
2. See doctors on a **map view** with match scores
3. Filter by specialty (8 types available)
4. See distance, fees, availability, and experience
5. Click **"Request Consultation"** → sends full health profile to doctor
6. Or click **"Book Now"** for immediate appointment

### Step 8: Doctor Reviews and Decides

The doctor sees incoming patient requests with:
- Patient symptoms and medications
- ML classification (e.g., "tachycardia")
- AI urgency level (Safe / Visit / Emergency)
- Heart rate trend sparkline
- Risk level badge

The doctor can:
- ✅ **Accept** → patient becomes their active patient
- ❌ **Reject** → patient can request another doctor

### Step 9: Admin Monitors Everything

The admin dashboard shows:
- **System Logs** (filterable by Info / Alert / Action)
  - ML predictions, risk alerts, doctor actions, auth events
  - Family additions, escalations, database operations
- **Patient Fleet** — all patients with glove status
- **Doctors Directory** — all doctors with specialties
- **Analytics** — weekly charts for active gloves and alerts

---

## The ML Pipeline (How Machine Learning Works)

### What the Model Does

The ML model takes 9 sensor features from the glove and classifies the reading into one of 9 conditions:

| # | Condition | What It Means | Example Values |
|---|-----------|---------------|----------------|
| 1 | Normal | Patient is fine | HR 72, SpO2 98, Temp 36.5 |
| 2 | Hypoxia | Low blood oxygen | SpO2 dropping below 90% |
| 3 | Fall | Patient fell down | G-force spike > 2.5G |
| 4 | Tachycardia | Heart beating too fast | HR > 120 BPM |
| 5 | Fever | High body temperature | Temp > 38°C |
| 6 | Bradycardia | Heart beating too slow | HR < 50 BPM |
| 7 | Sleep Apnea | Breathing stops during sleep | SpO2 dips in cycles |
| 8 | Arrhythmia | Irregular heartbeat | HR jumping randomly |
| 9 | Exercise | Physical activity | HR elevated + motion |

### How We Trained It

1. **Data Generation**: The simulation engine creates 5,400 labeled samples (600 per condition) with realistic medical values
2. **Algorithm Comparison**: We test 5 different ML algorithms:

| Algorithm | Accuracy | Training Time |
|-----------|----------|---------------|
| **Random Forest** | **95.96%** | 0.8 seconds |
| Gradient Boosting | 95.33% | 45.2 seconds |
| MLP Neural Network | 94.20% | 23.4 seconds |
| SVM (RBF kernel) | 93.28% | 3.2 seconds |
| KNN (k=7) | 91.07% | 0.2 seconds |

3. **Winner**: Random Forest — highest accuracy, fastest training, and provides interpretable feature importance scores

### Where ML Is Used in the System

| Location | What Happens |
|----------|-------------|
| Every `/api/latest` response | ML classifies the current reading in < 1ms |
| DemoPanel | Shows "ML: normal (95.4%)" with confidence bar |
| Patient Dashboard | ML class feeds into urgency calculation |
| Doctor Dashboard | ML class shown per patient for clinical decision support |
| AI Analysis | ML prediction is sent to Groq AI as part of the prompt |

### Features the Model Uses (9 inputs)

```
heart_rate, spo2, temperature, g_force, fall_detected,
accel_x, accel_y, accel_z, risk_score
```

---

## The AI Pipeline (How Groq AI Works)

### What Groq AI Does

Groq AI (LLaMA3-70B model) provides **natural language health insights**. It receives the complete patient profile and returns advice a patient can understand.

### What Gets Sent to AI

```
=== GLOVE DATA ===
Heart Rate, SpO2, Temperature, G-Force, Fall status

=== ML OUTPUT ===
Predicted condition + confidence + risk score

=== PATIENT PROFILE ===
Current medications and doses
Reported symptoms
Full medical history
Active prescriptions
Doctor's notes

=== FAMILY CONTEXT ===
Family member health conditions
```

### What AI Returns

- **Urgency Level**: Safe / Need Doctor Visit / Emergency
- **Holistic Assessment**: What the combined data suggests
- **Key Concerns**: Medication interactions or risk factors
- **Recommendations**: 3 specific actionable steps
- **Doctor Specialty**: Which specialist to see
- **Family Alert**: Should family be notified?

---

## Research Gaps Solved

This project addresses 7 research gaps found in existing health monitoring systems:

| Gap | Problem in Existing Systems | How VitalGlove Solves It |
|-----|---------------------------|--------------------------|
| **G1** | No real-time end-to-end deployment | ESP32 glove with live WiFi data transfer |
| **G2** | No patient-facing interface | Full patient dashboard with vitals, meds, SOS |
| **G3** | Scalability not addressed | MySQL + Flask + connection pooling |
| **G4** | No emergency escalation | 3-tier: Doctor → Family → Ambulance (108) |
| **G5** | Data privacy ignored | Role-based access control (patient/doctor/admin) |
| **G6** | No edge + cloud hybrid | ESP32 runs thresholds locally + Cloud runs ML + AI |
| **G7** | No doctor/EHR integration | Doctor dashboard with accept/reject + AI insights |

---

## System Architecture (Simple View)

```
┌──────────────┐          ┌──────────────────┐
│  Smart Glove │  WiFi    │  Flask Server    │
│  (ESP32)     │ ──────→  │  (Port 5001)     │
│              │          │                  │
│  Sensors:    │  ←────── │  Runs:           │
│  HR, SpO2,   │  Glove   │  • ML Model      │
│  Temp, Accel │  Commands│  • Risk Engine   │
└──────────────┘          │  • Groq AI       │
                          │  • MySQL DB      │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │  React Frontend  │
                          │  (Port 8080)     │
                          │                  │
                          │  Pages:          │
                          │  • Demo Panel    │
                          │  • Patient       │
                          │  • Doctor        │
                          │  • Admin         │
                          │  • Family Hub    │
                          │  • Emergency     │
                          └──────────────────┘
```

---

## How to Run the System

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- MySQL 8.0 (installed and running)

### Step 1: Start the Backend

```bash
cd server

# Create .env file with your credentials
# GROQ_API_KEY=your_key_here
# MYSQL_HOST=localhost
# MYSQL_USER=root
# MYSQL_PASSWORD=your_password
# MYSQL_DB=vitalglove

pip install -r requirements.txt    # Install Python packages
python ml/trainer.py               # Train the ML model (takes ~30 seconds)
python app.py                      # Start Flask server on port 5001
```

The database `vitalglove` is created automatically when you start the server.

### Step 2: Start the Frontend

```bash
cd vital-monitor-suite
npm install --legacy-peer-deps      # Install packages
npm run dev                         # Start on port 8080
```

### Step 3: Open the System

1. Open `http://localhost:8080` in your browser
2. You land on the **Demo Panel** — select any scenario
3. Click **Sign In** to enter as Patient, Doctor, or Admin
4. Explore the full system

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Hardware | ESP32-C3 + MAX30102 + DS18B20 + MPU6050 | Sensor data collection |
| Backend | Python Flask + Flask-SocketIO | API server |
| Database | MySQL 8.0 | Data storage |
| ML | scikit-learn (RandomForest) | Health condition classification |
| AI | Groq API (LLaMA3-70B) | Natural language health insights |
| Frontend | React + Vite + TypeScript | User interface |
| Styling | Tailwind CSS + Framer Motion | UI design and animations |

---

## File Structure

```
GLOVE FINAL/
├── server/                          # Backend
│   ├── app.py                       # Main Flask entry point
│   ├── db.py                        # Database auto-creation
│   ├── config.py                    # All thresholds and settings
│   ├── api/
│   │   ├── vitals.py                # GET /api/latest (with ML data)
│   │   ├── ai_routes.py             # POST /api/ai/analyze (full pipeline)
│   │   ├── demo.py                  # Scenario control
│   │   └── emergency.py             # SOS and escalation
│   ├── core/
│   │   ├── risk.py                  # Risk score calculator (0-100)
│   │   ├── alerts.py                # 3-tier escalation logic
│   │   └── ai.py                    # Groq API integration
│   ├── ml/
│   │   ├── trainer.py               # Train and compare 5 algorithms
│   │   ├── predictor.py             # Real-time ML inference
│   │   ├── model.pkl                # Saved model file
│   │   └── model_meta.json          # Model accuracy and metadata
│   └── simulation/
│       ├── engine.py                # Scenario registry
│       └── scenarios/               # 9 clinical simulations
│
├── vital-monitor-suite/             # Frontend
│   └── src/
│       ├── pages/
│       │   ├── DemoPanel.tsx         # Landing page with simulations
│       │   ├── Patient.tsx           # Patient dashboard
│       │   ├── DoctorDashboard.tsx   # Doctor with accept/reject
│       │   ├── AdminDashboard.tsx    # Admin with system logs
│       │   ├── DoctorDiscovery.tsx   # Find and book doctors
│       │   ├── FamilyHub.tsx         # Family health center
│       │   ├── FamilyMembers.tsx     # Family group management
│       │   └── Emergency.tsx         # Emergency escalation
│       ├── context/
│       │   ├── AuthContext.tsx       # Login and role management
│       │   └── VitalsContext.tsx     # Real-time vitals state
│       └── components/
│           ├── VitalCard.tsx         # Animated vital display
│           └── Sparkline.tsx         # SVG trend chart
│
├── glove.cpp                        # ESP32 firmware
├── README.md                        # Technical documentation
└── research/
    ├── RESEARCH_ANALYSIS.md         # Research paper content
    └── charts/                      # ML comparison charts
```

---

## Demo Flow (For Judges)

The recommended demonstration order:

1. **Open Demo Panel** → Show 9 simulations, switch between them, show live vitals changing
2. **Switch to Hypoxia** → Watch SpO2 drop, ML detects "hypoxia", risk score climbs
3. **Sign in as Patient** → Show glove sync animation, vitals dashboard
4. **Click Analyze Now** → Show ML + AI combined analysis with all 8 data sources
5. **Show AI suggests Pulmonologist** → Click "Find Doctor"
6. **Doctor Discovery** → Show map, filter by specialty, request consultation
7. **Sign in as Doctor** → Show pending requests, accept a patient
8. **Sign in as Admin** → Show system logs with ML predictions and user actions
9. **Family Hub** → Show family group, add member by name
10. **Emergency SOS** → Trigger SOS, show escalation

---

*Built as part of an academic research project on IoT-based Smart Health Monitoring Systems.*
*Technologies: ESP32, Flask, React, MySQL, scikit-learn (RandomForest), Groq AI (LLaMA3-70B)*
