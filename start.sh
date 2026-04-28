#!/bin/sh

echo "Starting app..."

# Start backend (use the one inside Frontend/backend)
cd /app/Frontend/backend
python3 app.py &

sleep 3

# Start frontend (Next.js)
cd /app/Frontend/frontend
npm run build
npm start