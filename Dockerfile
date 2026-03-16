# --- Stage 1: Build Frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy startup script from root
COPY startup.sh ./


# Copy built frontend assets to Django's static folder
COPY --from=frontend-build /app/frontend/dist/ ./static/

# Environment variables
ENV PORT=8080
ENV DEBUG=False
ENV PYTHONUNBUFFERED=1

# Make startup script executable
RUN chmod +x startup.sh

# Expose port (Cloud Run will override this)
EXPOSE 8080

# Run the startup script
CMD ["./startup.sh"]
