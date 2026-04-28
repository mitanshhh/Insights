# ---------- FRONTEND BUILD ----------
FROM node:20-slim AS frontend-builder

WORKDIR /app/Frontend/frontend

COPY Frontend/frontend/package*.json ./
RUN npm install

COPY Frontend/frontend/ .
RUN npm run build


# ---------- FINAL IMAGE ----------
FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Backend setup
COPY Frontend/backend/requirements.txt ./Frontend/backend/requirements.txt
RUN pip install --no-cache-dir -r Frontend/backend/requirements.txt

COPY Frontend/backend/ ./Frontend/backend/

# Copy frontend build
COPY --from=frontend-builder /app/Frontend/frontend ./Frontend/frontend

# Copy start script
COPY start.sh .
RUN chmod +x start.sh

ENV PORT=8080

CMD ["./start.sh"]