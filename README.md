# 🧤 VitalGlove — Smart Health Monitoring Glove

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://mysql.com)

> A collaborative, data-driven health monitoring system where **patient + family + sensors** feed data → **ML detects patterns** → **AI explains** → **doctor acts** → everything is **stored and traceable**.

---

## 🎯 What Is VitalGlove?

VitalGlove is an **IoT-powered healthcare platform** built around a wearable sensor glove (ESP32) that continuously monitors vital signs. What makes it unique is the **collaborative health model**: the system combines real-time sensor data with structured medical profiles and family observations to provide holistic health assessments.

### Core Principle
> **Input is NOT the dashboard.** Input = Profile + Family Hub + Sensor Data. Dashboard = output visualization only.

---

## 🏗️ Architecture

```
User Profile + Family Hub + Glove Sensors
                    ↓
             MySQL Database (15 tables)
                    ↓
              ML Pipeline (RandomForest, 95.96% accuracy)
                    ↓
              AI Pipeline (Groq LLaMA3-70B)
                    ↓
         Doctor Analysis & Response
                    ↓
          Patient + Family Output (Dashboard)
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ | Python 3.10+ | MySQL 8.0+

### 1. Backend
```bash
cd server
pip install -r requirements.txt
cp .env.example .env        # Configure MySQL password + Groq API key
python app.py               # → http://localhost:5001
```

### 2. Frontend
```bash
cd vital-monitor-suite
npm install
npm run dev                 # → http://localhost:8080
```

### 3. Database
Auto-created on first run. No manual setup needed.

---

## 📊 Key Features

| Module | Description |
|--------|-------------|
| 🧤 **Smart Glove** | ESP32 + MAX30102 (HR/SpO₂) + MLX90614 (Temp) + MPU6050 (Motion) |
| 👨‍👩‍👧 **Family Hub** | WhatsApp-like collaborative health input — everyone contributes |
| 📋 **Patient Profile** | Medications, checkups, documents, prescriptions (full CRUD) |
| 🔍 **ML Pipeline** | RandomForest classification: tachycardia, hypoxia, fall, etc. |
| 🧠 **AI Pipeline** | Groq LLaMA3-70B: advice, urgency, timeline, specialist suggestion |
| 👨‍⚕️ **Doctor System** | Full case review → notes + prescriptions → auto-notifies family |
| 🛠️ **Admin Panel** | System monitoring, logs, ML/AI output tracking |
| 🗄️ **Database** | MySQL with 15 auto-created tables, full CRUD API |

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Patient | `patient@vitalglove.com` | `patient123` |
| Doctor | `doctor@vitalglove.com` | `doctor123` |
| Admin | `admin@vitalglove.com` | `admin123` |

---

## 📂 Project Structure

```
GLOVE FINAL/
├── server/                  # Flask backend + MySQL + ML + AI
│   ├── api/                 # REST API routes (CRUD, AI, vitals, doctor, emergency)
│   ├── core/                # Business logic (risk scoring, alerts, Groq AI)
│   ├── ml/                  # RandomForest model + trainer + predictor
│   ├── simulation/          # Clinical scenario simulator
│   ├── db.py                # Database schema + helpers
│   └── app.py               # Entry point
│
├── vital-monitor-suite/     # React + TypeScript frontend
│   └── src/
│       ├── context/         # Global state providers (Auth, Vitals, HealthData)
│       ├── pages/           # 17 application pages
│       └── components/      # Reusable UI (NavBar, Sparkline, VitalCard)
│
├── hardware/                # ESP32 firmware (glove.cpp)
└── research/                # Research analysis + charts
```

> 📖 **Full documentation**: See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for complete API reference, database schema, and architecture details.

---

## 🧪 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + ShadcnUI |
| Backend | Flask + Flask-SocketIO + Flask-CORS |
| Database | MySQL 8.0 (connection pooling) |
| ML | scikit-learn RandomForest (95.96% accuracy) |
| AI | Groq Cloud — LLaMA3-70B-8192 |
| Hardware | ESP32 + MAX30102 + MLX90614 + MPU6050 |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
