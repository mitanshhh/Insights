#!/bin/sh

echo "Starting backend..."
cd /app/Backend
python3 app.py &

sleep 3

echo "Starting frontend..."
cd /app/Frontend
npm start
