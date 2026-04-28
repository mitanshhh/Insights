# Insights — Google Cloud Run Deployment Guide

## Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and logged in
- Docker installed locally
- A GCP project with Cloud Run and Artifact Registry APIs enabled

---

## Step 1 — Set your project

```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

---

## Step 2 — Enable required APIs

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

---

## Step 3 — Create an Artifact Registry repository

```bash
gcloud artifacts repositories create insights \
  --repository-format=docker \
  --location=us-central1
```

---

## Step 4 — Authenticate Docker with GCP

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## Step 5 — Build the Docker image

From the **root** of the project (where `Dockerfile` lives):

```bash
docker build -t us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/insights/app:latest .
```

---

## Step 6 — Push to Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/insights/app:latest
```

---

## Step 7 — Deploy to Cloud Run

```bash
gcloud run deploy insights \
  --image us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/insights/app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars GROQ_API_KEY=YOUR_KEY,SECRET_KEY=YOUR_SECRET
```

> **Note:** Cloud Run prints your public URL at the end of this command.  
> You do **not** need to know the URL in advance — the app automatically derives its own public address from each incoming request (`request.host_url`), so password reset links and redirects always point to the correct URL.

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for LLM inference |
| `SECRET_KEY` | Flask JWT signing secret (any long random string) |
| `MAIL_USERNAME` | Gmail address for sending reset emails (optional) |
| `MAIL_PASSWORD` | Gmail app password (optional) |

---

## Architecture Inside the Container

```
Cloud Run Container (port 8080)
├── Next.js standalone server  → port 8080 (public)
└── Flask backend              → port 8000 (internal)
     └── AI Engine (Backend/)
```

All `/api/*` requests from Next.js are proxied to `localhost:8000` via `next.config.ts` rewrites — no external URL needed.
