# Insights — AI-Powered Security Intelligence Platform

> **Turn Queries into Clarity.** Analyze logs, detect anomalies, and secure your systems with a context-aware AI engine designed for security professionals.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Deployment (Google Cloud Run)](#deployment-google-cloud-run)
- [API Reference](#api-reference)
- [Team](#team)

---

## Overview

**Insights** is a full-stack AI Security Operations Center (SOC) platform that transforms raw security logs into actionable intelligence. It combines:

- **Natural Language Querying** — ask questions about your logs in plain English
- **Automated Threat Classification** — Regex + LLM hybrid pipeline classifies every log entry
- **Automated SOC Threat Sweep** — batch-processes profiles to surface hidden threats
- **SQL Investigation Console** — direct forensic database access for advanced analysts
- **Digital Twin Network Simulation** — Cytoscape.js visualization of attack propagation

---

## Features

| Feature | Description |
|---|---|
| 📂 **Log Ingestion** | Upload security CSV logs per project; AI classifies them instantly |
| 🤖 **AI Classification** | Regex fast-path + Llama 3.3 (Groq) for unmatched entries |
| 💬 **Conversational Chat** | NL→SQL engine answers security questions in natural language |
| 🔍 **Threat Sweep** | Automated batch SOC analysis across all suspicious IP profiles |
| 🗄️ **SQL Console** | Write and execute raw SQL directly against the project database |
| 🌐 **Digital Twin** | Interactive network graph simulating attack vectors |
| 📊 **Multi-Project** | Isolated per-project SQLite databases with JWT-authenticated access |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                      │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │   Next.js Frontend  │   │    Flask Backend API    │  │
│  │   (port 8080)       │──▶│    (port 8000)          │  │
│  │                     │   │                         │  │
│  │  /dashboard         │   │  /api/project/*         │  │
│  │  /dashboard/analysis│   │  /api/sql               │  │
│  └─────────────────────┘   │  /api/auth/*            │  │
│           ▲                └──────────┬──────────────┘  │
│    next.config.ts                     │                  │
│    rewrites /api/* → :8000            ▼                  │
│                              ┌────────────────┐          │
│                              │  AI Engine     │          │
│                              │  Backend/      │          │
│                              │  main.py       │          │
│                              │  classification│          │
│                              │  _log.py       │          │
│                              └────────┬───────┘          │
│                                       │                  │
│                              ┌────────▼───────┐          │
│                              │  SQLite DBs    │          │
│                              │  Backend/data/ │          │
│                              └────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

**Frontend**
- [Next.js 16](https://nextjs.org/) — React framework with standalone output
- [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first styling
- [Cytoscape.js](https://cytoscape.org/) — Network graph visualization
- [Lucide React](https://lucide.dev/) — Icon library

**Backend**
- [Flask 3](https://flask.palletsprojects.com/) — Python web framework
- [PyJWT](https://pyjwt.readthedocs.io/) — JWT authentication
- [SQLite](https://www.sqlite.org/) — Per-project log databases

**AI Engine**
- [Groq](https://groq.com/) — Ultra-fast LLM inference (Llama 3.3-70B)
- [Pandas](https://pandas.pydata.org/) — Log processing and schema normalization
- [scikit-learn](https://scikit-learn.org/) — ML utilities

---

## Project Structure

```
Hackup/
├── Backend/                  # AI engine (classification + threat sweep)
│   ├── main.py               # Core: NL2SQL, threat sweep, DB helpers
│   ├── classification_log.py # Log classification pipeline
│   ├── llm_prompting.py      # Groq LLM prompts
│   ├── requirements.txt      # AI engine Python deps
│   └── data/                 # Per-project SQLite databases (gitignored)
│
├── frontend/
│   ├── backend/              # Flask REST API
│   │   ├── app.py            # All API routes
│   │   └── requirements.txt  # Flask Python deps
│   │
│   └── frontend/             # Next.js app
│       ├── src/
│       │   ├── app/          # Next.js pages (App Router)
│       │   ├── components/   # React components
│       │   └── context/      # DashboardContext (global state)
│       ├── public/           # Static assets
│       └── next.config.ts    # API proxy rewrites
│
├── Dockerfile                # Multi-stage production Docker build
├── start.sh                  # Container startup script
├── .dockerignore
├── .gitignore
├── DEPLOY.md                 # Google Cloud Run deployment guide
└── .env                      # Local secrets (gitignored)
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Groq API Key](https://console.groq.com/)

### Environment Variables

Create a `.env` file at the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=any_long_random_string_for_jwt

# Optional — for email password reset
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_gmail_app_password
```

### Running Locally

**1. Start the Flask backend**

```bash
cd frontend/backend
pip install -r requirements.txt

# Also install AI engine deps
pip install -r ../../Backend/requirements.txt

python app.py
# Runs on http://localhost:8000
```

**2. Start the Next.js frontend**

```bash
cd frontend/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment (Google Cloud Run)

See **[DEPLOY.md](./DEPLOY.md)** for the full step-by-step guide.

**Quick summary (7 commands):**

```bash
# 1. Set project
gcloud config set project YOUR_PROJECT_ID

# 2. Build image
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/insights/app:latest .

# 3. Push image
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/insights/app:latest

# 4. Deploy
gcloud run deploy insights \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/insights/app:latest \
  --platform managed --region us-central1 \
  --allow-unauthenticated --port 8080 --memory 2Gi \
  --set-env-vars GROQ_API_KEY=YOUR_KEY,SECRET_KEY=YOUR_SECRET
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Login, returns JWT cookie |
| `GET` | `/api/projects` | List all projects for current user |
| `POST` | `/api/project` | Create a new project |
| `POST` | `/api/project/upload` | Upload & classify a CSV log file |
| `POST` | `/api/project/:id/query` | Natural language log query |
| `GET` | `/api/project/:id/threat-sweep` | Run full SOC threat sweep |
| `POST` | `/api/sql` | Execute raw SQL against project DB |
| `DELETE` | `/api/project/:id` | Delete a project and its database |

---

## Team

| Name | Email |
|---|---|
| Mitansh Jadhav | mitansh.jadhav2007@gmail.com |
| Om Korade | omkorade23@gmail.com |

---

*© 2026 Insights Intelligence. Built for security professionals.*
