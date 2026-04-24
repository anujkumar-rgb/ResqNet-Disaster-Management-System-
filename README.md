# 🛡️ ResqNet: Next-Gen AI Disaster Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Supabase](https://img.shields.io/badge/Database-Supabase-blueviolet)](https://supabase.com)
[![React](https://img.shields.io/badge/Frontend-React_19-blue)](https://react.dev)
[![AI](https://img.shields.io/badge/AI-Gemini_1.5_Flash-orange)](https://deepmind.google/technologies/gemini/)

**ResqNet** is a professional-grade, high-fidelity emergency response coordination platform. It transforms chaotic disaster scenarios into organized rescue missions by bridging the gap between citizens in distress and tactical rescue units through AI-driven intelligence and real-time infrastructure.

---

## ⚡ Core Pillars

### 🎙️ Intelligent Incident Reporting
*   **Voice-to-JSON NLP**: Citizens can report incidents using natural speech. The system uses the Web Speech API to transcribe and organize emergency data.
*   **Multi-Media Evidence**: Attach photos and videos to reports to provide ground-truth visibility to the command center.
*   **One-Tap SOS**: Dedicated emergency signal for immediate geolocation broadcasting.

### 🧠 AI Tactical Command
*   **Gemini Route Optimization**: Automatically calculates the safest and fastest rescue paths, accounting for environmental hazards and traffic.
*   **Facility Suggestion**: AI identifies the nearest critical infrastructure (Hospitals, Police, Fuel) based on the incident type.
*   **Inter-Agency Broadcast**: Admins can blast tactical alerts to all nearby relevant agencies with a single click.

### 🛰️ Real-Time Operational Awareness
*   **Live Asset Tracking**: Every rescue team's location and status are tracked in real-time using Supabase's high-speed websocket infrastructure.
*   **Dynamic Heatmaps**: Visualizes incident density to help admins allocate resources effectively.
*   **Resource Logistics**: Real-time monitoring of hospital beds, oxygen cylinders, and rescue vehicles.

---

## 🏗️ System Architecture

ResqNet follows a modern **Monorepo** architecture for clean separation of concerns:

```text
resqnet/
├── frontend/             # React (Vite) Single Page Application
│   ├── src/components/   # Tactical UI Components (Admin/Rescue/Citizen)
│   ├── src/context/      # Global State & Supabase Auth
│   ├── src/services/     # Gemini AI & External Integrations
│   └── src/lib/          # Supabase Client Configuration
├── backend/              # Node.js & Express API Gateway
│   ├── src/middleware/   # JWT Authentication & RBAC
│   └── src/routes/       # Protected API Endpoints
└── database/             # PostgreSQL Schema & RLS Policies
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (TypeScript)
- **Styling**: Tailwind CSS (Tactical Cyber Design System)
- **Maps**: Leaflet.js with OpenStreetMap
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Server**: Express.js
- **Auth**: Supabase Auth (JWT)
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini 1.5 Flash

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Create a project at [Supabase](https://supabase.com).
2. Execute the `database/schema.sql` script in the **SQL Editor**.
3. Enable **Google Provider** in `Authentication > Providers` for OAuth support.

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key

# Frontend Specific (Vite)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
```

### 3. Installation
```bash
# Clone the repo
git clone https://github.com/anujkumar-rgb/ResqNet-Disaster-Management-System-.git

# Setup Backend
cd backend
npm install
npm run dev

# Setup Frontend
cd ../frontend
npm install
npm run dev
```

---

## 📡 API Reference

| Endpoint | Method | Description | Auth |
| :--- | :--- | :--- | :--- |
| `/api/reports` | GET/POST | Fetch/Create Incident Reports | Yes |
| `/api/teams` | GET/PATCH | Manage Rescue Units | Yes |
| `/api/broadcasts`| POST | Send Tactical Alerts | Admin |
| `/health` | GET | System Health Check | No |

---

## 🛡️ Security
ResqNet utilizes **Row Level Security (RLS)** at the database level. Even if an API key is leaked, users can only access data belonging to their specific role (`citizen`, `admin`, or `rescue_team`).

---

## 🤝 Contribution
Contributions are welcome! Please open an issue or submit a PR for any tactical enhancements.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  <b>Built for Resilience. Built for Life.</b><br>
  <i>ResqNet - 2026</i>
</p>
