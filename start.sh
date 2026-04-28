#!/bin/sh

echo "Starting backend..."
cd /app/Backend
python3 app.py &

echo "Waiting for backend..."
sleep 3

echo "Starting frontend on port $PORT..."
cd /app/Frontend/frontend
npm start