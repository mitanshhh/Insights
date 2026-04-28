#!/bin/sh

# Start Python Flask backend on port 8000
echo "[START] Launching Python backend on port 8000..."
cd /app/frontend/backend
PYTHONIOENCODING=utf-8 python3 app.py &
BACKEND_PID=$!

# Give backend time to initialize
sleep 3

# Start Next.js standalone server on PORT (default 8080 for Cloud Run)
echo "[START] Launching Next.js on port ${PORT:-8080}..."
cd /app/frontend/frontend
node server.js

# If Next.js exits, also stop the backend
kill $BACKEND_PID
