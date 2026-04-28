# 🧤 VitalGlove — Intelligent Healthcare Monitoring Platform

> **"A collaborative health system where patient + family + sensors feed data → ML detects patterns → AI explains → doctor acts → everything is stored and traceable."**

---

## 📂 Project Structure

```
GLOVE FINAL/
│
├── 📄 README.md                     # Project overview & setup instructions
├── 📄 PROJECT_DOCUMENTATION.md      # ← You are here (complete technical docs)
├── 📄 LICENSE                       # MIT License
├── 📄 .gitignore                    # Git ignore rules
│
├── 🖥️ server/                       # Flask Backend (Python)
│   ├── app.py                       # Entry point — Flask + SocketIO + Blueprint wiring
│   ├── config.py                    # Environment config (ports, CORS, secrets)
│   ├── db.py                        # MySQL schema (15 tables), seed data, read/write helpers
│   ├── server_db.py                 # CRUD database functions (family, entries, requests, notifs)
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # 🔒 Secret keys (gitignored)
│   ├── .env.example                 # Template for .env setup
│   │
│   ├── api/                         # REST API Routes (Blueprints)
│   │   ├── __init__.py
│   │   ├── crud.py                  # ⭐ Full CRUD: family, health, profile, checkups, ML/AI results, doctor, notifs
│   │   ├── ai_routes.py             # AI+ML combined analysis pipeline (Groq + RandomForest)
│   │   ├── ml_routes.py             # Standalone ML prediction endpoint
│   │   ├── telemetry.py             # ESP32 serial data ingestion
│   │   ├── vitals.py                # Live vitals polling (simulation/device)
│   │   ├── demo.py                  # Demo scenario control
│   │   ├── patients.py              # Patient listing
│   │   └── emergency.py             # SOS/emergency protocol
│   │
│   ├── core/                        # Business Logic
│   │   ├── __init__.py
│   │   ├── ai.py                    # Groq LLaMA3-70B integration (system prompt, API calls)
│   │   ├── risk.py                  # Rule-based risk scoring (0-100 scale)
│   │   └── alerts.py                # Escalation tier evaluation (0-4 tiers)
│   │
│   ├── ml/                          # Machine Learning Module
│   │   ├── __init__.py
│   │   ├── trainer.py               # RandomForest training script (95.96% accuracy)
│   │   ├── predictor.py             # Live prediction from trained model
│   │   ├── model.pkl                # Trained RandomForest model binary
│   │   ├── model_meta.json          # Training metadata & accuracy metrics
│   │   └── algorithm_comparison.json # RF vs SVM vs KNN vs DT comparison
│   │
│   └── simulation/                  # Glove Simulation Engine
│       ├── __init__.py
│       ├── engine.py                # Vital sign generator with noise models
│       └── scenarios/               # Clinical scenarios (normal, tachycardia, hypoxia, fever, fall)
│           ├── __init__.py
│           ├── normal.py
│           ├── tachycardia.py
│           ├── hypoxia.py
│           ├── fever.py
│           └── fall.py
│
├── 🌐 vital-monitor-suite/          # React Frontend (TypeScript + Vite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Router + Provider tree (Auth → Connection → Vitals → HealthData)
│       ├── App.css                  # App-level styles
│       ├── index.css                # Design system tokens (colors, fonts, gradients)
│       │
│       ├── context/                 # React Context Providers (Global State)
│       │   ├── AuthContext.tsx       # Login/logout, role-based auth (patient/doctor/admin)
│       │   ├── ConnectionContext.tsx # WebSocket connection status
│       │   ├── VitalsContext.tsx     # Live vitals polling from backend
│       │   └── HealthDataContext.tsx # ⭐ MAIN: All DB data (family, entries, checkups, ML/AI, requests, notifs)
│       │
│       ├── pages/                   # Application Pages
│       │   ├── DemoPanel.tsx        # Landing — simulation control + live vitals + scenario switching
│       │   ├── Patient.tsx          # ⭐ Patient dashboard — vitals + AI/ML analysis + meds + symptoms
│       │   ├── FamilyHub.tsx        # ⭐ Family command center — collaborative health input (CRUD)
│       │   ├── DoctorDashboard.tsx  # ⭐ Doctor case review — 6-tab patient view + respond
│       │   ├── Doctor.tsx           # Individual patient detailed view
│       │   ├── DoctorDiscovery.tsx  # Find-a-doctor specialist search
│       │   ├── AdminDashboard.tsx   # Admin monitoring panel
│       │   ├── Emergency.tsx        # SOS emergency protocol
│       │   ├── FamilyMembers.tsx    # Member management
│       │   ├── Documents.tsx        # Document upload/view
│       │   ├── Appointments.tsx     # Appointment scheduling
│       │   ├── Medications.tsx      # Medication tracking
│       │   ├── Settings.tsx         # User preferences
│       │   ├── Login.tsx            # Authentication page
│       │   ├── Signup.tsx           # Registration page
│       │   ├── Unauthorized.tsx     # Access denied
│       │   └── NotFound.tsx         # 404 page
│       │
│       ├── components/              # Reusable UI Components
│       │   ├── NavBar.tsx           # Navigation bar with role-based menu
│       │   ├── NavLink.tsx          # Active-aware navigation link
│       │   ├── ProtectedRoute.tsx   # Role-based route guard
│       │   ├── Sparkline.tsx        # SVG sparkline chart (vitals trends)
│       │   ├── VitalCard.tsx        # Vital sign display card
│       │   └── ui/                  # ShadcnUI primitives (button, card, badge, tabs, etc.)
│       │
│       ├── lib/                     # Utilities
│       │   ├── utils.ts             # cn() classname helper
│       │   ├── gloveData.ts         # Glove anomaly trigger helper
│       │   └── familyHealth.ts      # Family health data types
│       │
│       ├── types/                   # TypeScript Type Definitions
│       │   └── vitals.ts            # Vital reading types, risk helpers, alert reasons
│       │
│       ├── hooks/                   # Custom React Hooks
│       │   └── use-toast.ts
│       │
│       └── test/                    # Test utilities
│
├── 🔧 hardware/                     # ESP32 Firmware
│   ├── glove.cpp                    # Full Arduino firmware (MAX30102 + MLX90614 + MPU6050)
│   └── README.md                    # Hardware setup instructions
│
└── 📊 research/                     # Research & Analysis
    ├── RESEARCH_ANALYSIS.md         # Literature review & gap analysis
    ├── SYSTEM_ANALYSIS.md           # System architecture analysis
    ├── generate_charts.py           # Chart generation script
    └── charts/                      # Generated research visualizations
```

---

## 🗄️ Database Schema (15 Tables)

All tables are **auto-created** on server startup via `db.py → _create_tables()`.

| # | Table | Module | Purpose |
|---|-------|--------|---------|
| 1 | `patients` | Users | User accounts (patient/doctor/admin roles) |
| 2 | `telemetry_readings` | Sensor Data | Raw HR, SpO₂, Temp, GForce from glove |
| 3 | `alerts` | Alerts | Triggered alert records with severity |
| 4 | `ai_insights` | Legacy AI | Quick AI insights (backward compat) |
| 5 | `family_groups` | Family Hub | Family group definitions |
| 6 | `family_members` | Family Hub | Members within each group |
| 7 | `health_entries` | Health Data | Unified entries: symptoms, meds, history, prescriptions, doctor notes |
| 8 | `patient_profiles` | Profile | Age, gender, blood group, allergies, emergency contact |
| 9 | `checkups` | Checkups | Scheduled/completed checkups with dates |
| 10 | `documents` | Documents | Uploaded PDFs/images (file paths) |
| 11 | `ml_results` | **ML Pipeline** | RandomForest predictions with confidence scores |
| 12 | `ai_results` | **AI Pipeline** | Groq AI advice, urgency, timeline, doctor suggestions |
| 13 | `doctor_requests` | Doctor System | Full lifecycle: pending → accepted (with response) |
| 14 | `notifications` | Notifications | System alerts visible to patient + family |

> **Key Design:** `ml_results` and `ai_results` are **separate tables** — ML detects patterns, AI explains them. This separation is intentional and research-aligned.

---

## 🔄 Complete Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT LAYER (NOT Dashboard)                   │
│                                                                 │
│  👤 User Profile        👨‍👩‍👧 Family Hub        🧤 Glove Sensors    │
│  ├─ Medications         ├─ Observations         ├─ Heart Rate    │
│  ├─ Checkups            ├─ Shared symptoms      ├─ SpO₂          │
│  ├─ Documents           ├─ Emergency notes      ├─ Temperature   │
│  └─ Prescriptions       └─ Health updates       └─ Motion/Fall   │
│                                                                 │
│                      ALL → MySQL Database                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING LAYER                              │
│                                                                 │
│  🔍 ML Pipeline (SEPARATE)          🧠 AI Pipeline (SEPARATE)   │
│  ├─ Input: Sensor data              ├─ Input: Profile + Family  │
│  ├─ Algorithm: RandomForest         │   + ML output + Rules     │
│  ├─ Output: Classification          ├─ Engine: Groq LLaMA3-70B │
│  │   (tachycardia, hypoxia,         ├─ Output: Advice, urgency, │
│  │    fall, normal, etc.)           │   timeline, specialist    │
│  ├─ Confidence: 0-100%              │                           │
│  └─ Stored: ml_results table        └─ Stored: ai_results table │
│                                                                 │
│  ⚖️ Rule Engine                                                 │
│  ├─ Risk score: 0-100                                           │
│  └─ Escalation: Tier 0-4                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ACTION LAYER                                  │
│                                                                 │
│  👨‍⚕️ Doctor Dashboard                 🔔 Notification System     │
│  ├─ Receives: Full patient case     ├─ Patient notified         │
│  ├─ Views: 6-tab data review        ├─ Family notified          │
│  ├─ Actions: Notes, prescriptions,  └─ Updates in Family Hub    │
│  │   appointments, urgency marks                                │
│  └─ Response: Flows back to DB                                  │
│     → patient record updated                                    │
│     → family sees notification                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT LAYER (Dashboard)                      │
│                                                                 │
│  📊 Patient Dashboard = READ-ONLY VISUALIZATION                 │
│  ├─ Live vitals (from sensor table)                             │
│  ├─ Medications (from DB)                                       │
│  ├─ Checkups (from DB)                                          │
│  ├─ ML prediction (from DB)                                     │
│  ├─ AI advice (from DB)                                         │
│  └─ Everything dynamic — ZERO hardcoding                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 REST API Reference

### Family & Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family` | Get family group + all members |
| POST | `/api/family/members` | Add a new member |
| DELETE | `/api/family/members/:id` | Remove a member |

### Health Entries (CRUD)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/:memberId` | Get all entries grouped by category |
| GET | `/api/health/:memberId/:category` | Get entries for one category |
| POST | `/api/health/:memberId/:category` | Create new entry |
| PUT | `/api/health/entry/:entryId` | Update entry text |
| DELETE | `/api/health/entry/:entryId` | Delete entry |

### Patient Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:memberId` | Get patient profile |
| PUT | `/api/profile/:memberId` | Create or update profile |

### Checkups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkups/:memberId` | Get all checkups |
| POST | `/api/checkups/:memberId` | Add checkup |
| DELETE | `/api/checkups/:id` | Delete checkup |

### ML Results (Separate Module)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ml-results/:memberId` | Get ML prediction history |
| POST | `/api/ml-results/:memberId` | Store new ML prediction |

### AI Results (Separate Module)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai-results/:memberId` | Get AI advice history |
| POST | `/api/ai-results/:memberId` | Store new AI result |

### AI + ML Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/analyze` | Full pipeline: ML → Rules → AI → store results |
| POST | `/api/ai/insight` | Quick Groq insight |
| GET | `/api/ai/insights` | Insight history |

### Doctor System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor-requests` | All doctor requests |
| POST | `/api/doctor-requests` | Create patient request |
| POST | `/api/doctor-requests/:id/respond` | Doctor responds (notes + prescription) |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| POST | `/api/notifications/:id/read` | Mark as read |

### Vitals & Telemetry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vitals` | Latest simulated/live vitals |
| GET | `/api/latest` | Latest DB reading |
| POST | `/api/telemetry` | Ingest ESP32 serial data |
| GET | `/api/demo/status` | Current simulation scenario |

---

## 🧠 ML vs AI — Why Separate?

| Aspect | ML Pipeline | AI Pipeline |
|--------|-------------|-------------|
| **Purpose** | Pattern detection | Reasoning & explanation |
| **Algorithm** | RandomForest (95.96%) | Groq LLaMA3-70B |
| **Input** | Sensor data (HR, SpO₂, Temp, Motion) | Profile + Family + ML output + Rules |
| **Output** | Classification + Confidence % | Advice + Urgency + Timeline + Specialist |
| **DB Table** | `ml_results` | `ai_results` |
| **Key Insight** | ML detects what **is** happening | AI explains what it **means** |

```
ML says: "tachycardia (87% confidence)"
AI says: "Given your cardiac history and current Metoprolol dose, this
          tachycardia episode may indicate medication non-compliance or
          dehydration. Recommend Cardiologist visit within 24 hours."
```

---

## 🔐 Authentication & Roles

| Role | Routes | Capabilities |
|------|--------|-------------|
| **Patient** | `/dashboard`, `/family`, `/discovery`, `/emergency` | View vitals, manage profile, input symptoms, request doctor |
| **Doctor** | `/doctor` | Review cases, respond with notes/prescriptions, mark urgent |
| **Admin** | `/admin` | View all users, logs, ML/AI outputs, system monitoring |

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Patient | `patient@vitalglove.com` | `patient123` |
| Doctor | `doctor@vitalglove.com` | `doctor123` |
| Admin | `admin@vitalglove.com` | `admin123` |

---

## 🏗️ What Makes This System UNIQUE

### 1️⃣ Family Hub = Main Brain 🧠
- Like a **WhatsApp group** for health
- Everyone contributes: symptoms, observations, reports
- This provides **real-world context** that sensors alone cannot capture

### 2️⃣ Profile = Structured Medical Input 📋
- Medications, checkups, documents, prescriptions
- Makes the system **medically usable**, not just a demo

### 3️⃣ Glove = Real-Time Signal Layer 🧤
- HR, SpO₂, Temperature, Motion (MPU6050 accelerometer)
- Adds **continuous physiological monitoring**

### 4️⃣ ML Pipeline = Pattern Detection 🔍
- Finds hidden issues even if the user didn't explicitly report anything
- Works on raw sensor features autonomously

### 5️⃣ AI Pipeline = Reasoning Brain 🧠
- Explains everything in context: medications, history, family health
- Gives: advice, urgency level, next steps, specialist recommendations

### 6️⃣ Doctor System = Action Layer 👨‍⚕️
- Receives **complete patient data** (no information loss)
- Can: diagnose, prescribe, respond remotely
- Response flows back to patient + family automatically

### 7️⃣ Family = Continuous Monitoring 👨‍👩‍👧
- Always updated via notifications
- Can act fast in emergencies

### 8️⃣ Admin = Control + Transparency 🛠️
- Logs everything
- Monitors ML + AI outputs
- Ensures system reliability

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+ (frontend)
- **Python** 3.10+ (backend)
- **MySQL** 8.0+ (database)

### Backend Setup
```bash
cd server
pip install -r requirements.txt
cp .env.example .env        # Edit with your MySQL password & Groq API key
python app.py               # Starts on http://localhost:5001
```

### Frontend Setup
```bash
cd vital-monitor-suite
npm install
npm run dev                 # Starts on http://localhost:8080
```

### Database
- **Auto-created**: The `vitalglove` database and all 15 tables are created automatically on first server start
- **Auto-seeded**: Demo data (Riya Sharma family, health entries, checkups, ML/AI results) is inserted if empty

---

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | UI framework |
| UI Library | ShadcnUI + Framer Motion | Components + animations |
| State | React Context (HealthDataContext) | Centralized DB-synced state |
| Backend | Flask + Flask-SocketIO | REST API + WebSocket |
| Database | MySQL 8.0 (connection pooling) | Persistent storage (15 tables) |
| ML | scikit-learn RandomForest | Pattern classification (95.96% acc) |
| AI | Groq Cloud (LLaMA3-70B) | Natural language health analysis |
| Hardware | ESP32 + MAX30102 + MLX90614 + MPU6050 | Wearable sensor glove |

---

## ✅ System Verification Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Dashboard NOT hardcoded | ✅ | All data fetched from MySQL via REST API |
| Input = Profile + Family + Sensors | ✅ | FamilyHub.tsx + Patient.tsx → API → DB |
| Full CRUD operations | ✅ | Create/Read/Update/Delete on all health entries |
| ML and AI are SEPARATE | ✅ | `ml_results` table ≠ `ai_results` table |
| ML detects, AI explains | ✅ | RF classifies → Groq contextualizes |
| Doctor flow correct | ✅ | Request → Review → Respond → Notify family |
| Family notified | ✅ | Notifications table + bell icon UI |
| Data stored & traceable | ✅ | Every action creates a DB record with timestamp |
| Zero hardcoded patient data | ✅ | All seed data in `_seed_data()`, loaded via API |
| TypeScript compiles clean | ✅ | `npx tsc --noEmit` = 0 errors |
