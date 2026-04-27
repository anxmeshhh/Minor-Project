# VitalGlove — System Workflow, ML+AI Usage & Research Gap Analysis

---

## 1. Complete System Workflow

```mermaid
flowchart TD
    subgraph HARDWARE["🧤 ESP32 Smart Glove"]
        S1[MAX30102<br/>HR + SpO2]
        S2[DS18B20<br/>Temperature]
        S3[MPU6050<br/>Accelerometer]
        S4[OLED Display]
        S5[Vibration Motor]
        EDGE[Edge AI<br/>Threshold Rules]
        S1 & S2 & S3 --> EDGE
        EDGE --> S4
        EDGE --> S5
    end

    subgraph BACKEND["🖥️ Flask Server (Port 5001)"]
        TEL["/api/telemetry<br/>Receive glove data"]
        SIM[Simulation Engine<br/>9 clinical scenarios]
        VIT["/api/latest<br/>Serve vitals + ML"]
        ML["ML Engine<br/>RandomForest<br/>9-class classifier"]
        RISK["Risk Engine<br/>Score 0-100"]
        ESC["Escalation Engine<br/>L1 / L2 / L3"]
        AI["Groq AI<br/>LLaMA3-70B"]
        ANALYZE["/api/ai/analyze<br/>Full Health Assessment"]
        DB[(MySQL<br/>vitalglove)]
        CMD["/api/glove/command<br/>Wireless sync"]
    end

    subgraph FRONTEND["⚛️ React Frontend (Port 8080)"]
        DEMO["Demo Panel<br/>Simulation Selector"]
        LOGIN["Login / Signup<br/>Role-based Auth"]
        PAT["Patient Dashboard<br/>Vitals + Sync + AI"]
        DOC["Doctor Dashboard<br/>Accept/Reject + Fleet"]
        ADM["Admin Dashboard<br/>Logs + Analytics"]
        FAM["Family Hub<br/>Group + Members"]
        DISC["Doctor Discovery<br/>Map + Booking"]
        EMRG["Emergency Center<br/>SOS + Escalation"]
    end

    %% Hardware to Backend
    HARDWARE -->|WiFi POST<br/>every 500ms| TEL
    TEL --> DB
    TEL --> RISK
    TEL --> ML
    CMD -->|GET every 3s| HARDWARE

    %% Simulation path
    DEMO -->|POST /api/demo/trigger| SIM
    SIM --> VIT

    %% Backend internal
    RISK --> VIT
    ML --> VIT
    ML --> ANALYZE
    RISK --> ANALYZE
    ESC --> ANALYZE
    AI --> ANALYZE
    VIT --> DB

    %% Frontend flows
    DEMO --> LOGIN
    LOGIN -->|patient| PAT
    LOGIN -->|doctor| DOC
    LOGIN -->|admin| ADM
    PAT -->|Analyze Now| ANALYZE
    PAT --> DISC
    PAT --> FAM
    PAT -->|SOS| EMRG
    DISC -->|Request| DOC
    DOC -->|Accept/Reject| PAT
    ANALYZE -->|Urgency + Specialty| DISC

    %% Sync
    SIM -->|scenario_id| CMD
```

---

## 2. ML + AI Pipeline (Detailed Flow)

```mermaid
flowchart LR
    subgraph INPUT["📥 Data Sources"]
        G["🧤 Glove Vitals<br/>HR, SpO2, Temp,<br/>G-Force, Fall"]
        M["💊 Medications<br/>Metoprolol, Aspirin,<br/>Atorvastatin"]
        S["📝 Symptoms<br/>Chest tightness,<br/>Dizziness"]
        H["📋 Medical History<br/>Hypertension,<br/>Diabetes, MI"]
        P["📄 Prescriptions<br/>Doses + Timing"]
        F["👨‍👩‍👧 Family Health<br/>Father: cardiac<br/>arrest at 68"]
        D["🩺 Doctor Notes<br/>BP 140/90,<br/>lifestyle changes"]
    end

    subgraph ML_STEP["🤖 Step 1: ML Classification"]
        FEAT["9 Features<br/>hr, spo2, temp,<br/>gforce, fall,<br/>accelX/Y/Z, risk"]
        RF["RandomForest<br/>120 trees<br/>95.96% accuracy"]
        CLASS["Output:<br/>tachycardia<br/>99% confidence"]
    end

    subgraph RULE_STEP["📊 Step 2: Rule Engine"]
        RULES["Threshold Rules<br/>(same as ESP32)"]
        SCORE["Risk Score<br/>65 / 100<br/>Caution"]
    end

    subgraph ESC_STEP["🚨 Step 3: Escalation"]
        TIER["Tier Logic"]
        T0["L0: No action"]
        T1["L1: Alert Doctor"]
        T2["L2: Notify Family"]
        T3["L3: Call 108"]
    end

    subgraph AI_STEP["🧠 Step 4: Groq AI"]
        PROMPT["Combined Prompt<br/>Vitals + ML + Risk +<br/>Meds + History +<br/>Family + Notes"]
        LLM["LLaMA3-70B<br/>Groq Cloud<br/>~1s response"]
        OUT["Output:<br/>Urgency Level<br/>Assessment<br/>Recommendations<br/>Doctor Specialty<br/>Family Alert"]
    end

    G --> FEAT --> RF --> CLASS
    G --> RULES --> SCORE

    CLASS --> TIER
    SCORE --> TIER
    TIER --> T0 & T1 & T2 & T3

    CLASS --> PROMPT
    SCORE --> PROMPT
    M & S & H & P & F & D --> PROMPT
    PROMPT --> LLM --> OUT
```

### ML Model Comparison Results

| Algorithm | CV Accuracy | Std Dev | Train Time | Selected |
|-----------|------------|---------|------------|----------|
| **Random Forest** | **95.96%** | ±0.011 | 0.8s | ✅ Winner |
| Gradient Boosting | 95.33% | ±0.021 | 45.2s | |
| MLP Neural Network | 94.20% | ±0.017 | 23.4s | |
| SVM (RBF) | 93.28% | ±0.017 | 3.2s | |
| KNN (k=7) | 91.07% | ±0.022 | 0.2s | |

### Per-Class Performance (Test Set)

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
| **Weighted Avg** | **0.99** | **0.99** | **0.99** |

### Where ML Is Visible in the System

```mermaid
flowchart TD
    MODEL["🤖 RandomForest Model<br/>ml/predictor.py"]

    MODEL --> V1["📊 /api/latest<br/>ml_class, ml_confidence,<br/>ml_algorithm in every response"]
    MODEL --> V2["🎛️ DemoPanel<br/>Purple ML badge<br/>+ confidence bar"]
    MODEL --> V3["📱 Patient Dashboard<br/>Violet ML Classification box<br/>+ doctor specialty suggestion"]
    MODEL --> V4["👨‍⚕️ Doctor Dashboard<br/>Brain icon + ML class<br/>per patient row"]
    MODEL --> V5["🧠 /api/ai/analyze<br/>ML prediction fed into<br/>Groq AI prompt"]
    MODEL --> V6["⚠️ Urgency Logic<br/>ML class drives urgency:<br/>hypoxia → emergency<br/>tachycardia → visit"]

    style MODEL fill:#7c3aed,color:#fff
    style V5 fill:#1d4ed8,color:#fff
    style V6 fill:#dc2626,color:#fff
```

---

## 3. Research Gap Analysis

### Gaps Identified in Existing Health Monitoring Systems

```mermaid
flowchart LR
    subgraph GAPS["Research Gaps in Literature"]
        G1["G1: No real-time<br/>end-to-end<br/>deployment"]
        G2["G2: No patient-<br/>facing interface"]
        G3["G3: Scalability<br/>not addressed"]
        G4["G4: No emergency<br/>escalation layer"]
        G5["G5: Data privacy<br/>left as future work"]
        G6["G6: No edge +<br/>cloud hybrid"]
        G7["G7: No doctor/<br/>EHR integration"]
    end

    subgraph SOLUTIONS["VitalGlove Solutions"]
        S1["ESP32 glove with<br/>live WiFi telemetry"]
        S2["Full patient dashboard<br/>with vitals, meds, SOS"]
        S3["MySQL + Flask +<br/>connection pooling"]
        S4["3-tier escalation:<br/>Doctor → Family → 108"]
        S5["Role-based access:<br/>patient / doctor / admin"]
        S6["Edge: thresholds on ESP32<br/>Cloud: ML + Groq AI"]
        S7["Doctor dashboard with<br/>accept/reject + AI insights"]
    end

    G1 --> S1
    G2 --> S2
    G3 --> S3
    G4 --> S4
    G5 --> S5
    G6 --> S6
    G7 --> S7

    style G1 fill:#dc2626,color:#fff
    style G2 fill:#dc2626,color:#fff
    style G3 fill:#dc2626,color:#fff
    style G4 fill:#dc2626,color:#fff
    style G5 fill:#dc2626,color:#fff
    style G6 fill:#dc2626,color:#fff
    style G7 fill:#dc2626,color:#fff
    style S1 fill:#16a34a,color:#fff
    style S2 fill:#16a34a,color:#fff
    style S3 fill:#16a34a,color:#fff
    style S4 fill:#16a34a,color:#fff
    style S5 fill:#16a34a,color:#fff
    style S6 fill:#16a34a,color:#fff
    style S7 fill:#16a34a,color:#fff
```

### Detailed Gap Coverage Matrix

| Gap | Problem | Our Solution | Implementation | Files |
|-----|---------|-------------|----------------|-------|
| **G1** | Existing systems stop at simulation — no real hardware deployed | ESP32-C3 glove with MAX30102, DS18B20, MPU6050 sending data every 500ms via WiFi | POST `/api/telemetry` receives real sensor data and stores in MySQL | `glove.cpp`, `api/telemetry.py` |
| **G2** | Patients cannot see their own health data — only doctors have access | Full patient dashboard with live vitals, risk score, medication tracking, symptom logging | React Patient page with VitalCards, Sparklines, and Medication reminders | `Patient.tsx`, `VitalCard.tsx` |
| **G3** | Systems tested with 1-2 users — no discussion of scaling | MySQL with connection pooling, Flask blueprints, stateless API design | DB auto-creation with pooled connections, modular blueprint architecture | `db.py`, `app.py` |
| **G4** | Alert is binary (on/off) — no tiered response based on severity | 3-tier escalation: L1 (Doctor) → L2 (Family) → L3 (Ambulance 108) with auto-escalation | Risk score drives tier selection, SOS button triggers L3 immediately | `core/alerts.py`, `Emergency.tsx` |
| **G5** | "Data privacy is future work" in most papers | Role-based access control — patients see only their data, doctors see assigned patients only | AuthContext with JWT-like sessions, ProtectedRoute guards all sensitive pages | `AuthContext.tsx`, `ProtectedRoute.tsx` |
| **G6** | Either all processing on cloud (latency) or all on device (limited) | Hybrid: ESP32 runs threshold alerts locally (< 10ms), Cloud runs RandomForest ML + Groq AI | ESP32 firmware checks thresholds and vibrates on anomaly, Server runs 9-class ML classifier | `glove.cpp` (edge), `ml/predictor.py` (cloud) |
| **G7** | No integration with doctor workflows or electronic health records | Doctor dashboard shows patient fleet, can accept/reject requests, sees ML + AI analysis | DoctorDashboard with tabbed requests, ML class column, AI urgency badges | `DoctorDashboard.tsx`, `api/ai_routes.py` |

### How Each Gap Maps to the Demo

| Gap | Demo Step | What to Show |
|-----|-----------|-------------|
| G1 | Step 1 | Switch scenarios on DemoPanel → glove OLED updates wirelessly in 3 seconds |
| G2 | Step 3 | Patient dashboard with live vitals, meds, symptoms, and risk score |
| G3 | Step 9 | Admin dashboard showing all users, gloves, and system capacity |
| G4 | Step 10 | Press SOS → Emergency page shows L1→L2→L3 escalation timeline |
| G5 | Step 2 | Different login = different dashboard (patient cannot see doctor page) |
| G6 | Step 5 | ML classifies vitals (edge-like speed) → Groq AI adds context (cloud intelligence) |
| G7 | Step 7 | Doctor sees patient request with ML class + AI urgency → clicks Accept |

---

## 4. Code Audit Summary

### TypeScript (Frontend): ✅ Zero Errors
```
npx tsc --noEmit → No output (clean compile)
```

### Python (Backend): ✅ All 13 Files Compile
```
app.py, db.py, config.py, api/vitals.py, api/ai_routes.py,
api/demo.py, api/emergency.py, core/risk.py, core/alerts.py,
core/ai.py, ml/predictor.py, ml/trainer.py, simulation/engine.py
→ ALL OK
```

### Key Files Verified

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `DoctorDashboard.tsx` | 180 | ✅ Fixed | Was missing `""` in ternary |
| `Patient.tsx` | ~435 | ✅ Clean | Sends 8 context types to AI |
| `DemoPanel.tsx` | ~460 | ✅ Clean | ML badge + confidence bar |
| `AdminDashboard.tsx` | ~200 | ✅ Clean | System logs with filters |
| `DoctorDiscovery.tsx` | ~170 | ✅ Clean | Map + specialty filter |
| `FamilyMembers.tsx` | ~180 | ✅ Clean | Group name + admin/member |
| `api/ai_routes.py` | ~220 | ✅ Clean | Full holistic analysis |
| `api/vitals.py` | ~60 | ✅ Clean | Inline ML enrichment |
| `ml/predictor.py` | 86 | ✅ Clean | Real-time inference |
| `core/risk.py` | 90 | ✅ Clean | Matches ESP32 thresholds |

---

*Generated on April 28, 2026 — VitalGlove Research System v1.0*
