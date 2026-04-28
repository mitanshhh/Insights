# ────────────────────────────────────────────────────────────────
# Stage 1: Build Next.js
# ────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend/frontend

COPY frontend/frontend/package*.json ./
RUN npm ci

COPY frontend/frontend ./
RUN npm run build

# ────────────────────────────────────────────────────────────────
# Stage 2: Final image — Python + Node + built Next.js
# ────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Install Node.js 20 into the Python image
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ──────────────────────────────────────────
COPY Backend/requirements.txt ./Backend/requirements.txt
RUN pip install --no-cache-dir -r Backend/requirements.txt

COPY frontend/backend/requirements.txt ./frontend/backend/requirements.txt
RUN pip install --no-cache-dir -r frontend/backend/requirements.txt

# ── Copy source ──────────────────────────────────────────────────
# Backend AI engine
COPY Backend/ ./Backend/

# Flask backend
COPY frontend/backend/ ./frontend/backend/

# Next.js standalone build output
COPY --from=frontend-builder /app/frontend/frontend/.next/standalone ./frontend/frontend/
COPY --from=frontend-builder /app/frontend/frontend/.next/static ./frontend/frontend/.next/static
COPY --from=frontend-builder /app/frontend/frontend/public ./frontend/frontend/public

# Persistent data directory
RUN mkdir -p ./Backend/data

# Start script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Cloud Run passes PORT env var (default 8080 for Next.js)
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV PYTHONIOENCODING=utf-8

EXPOSE 8080

CMD ["./start.sh"]
