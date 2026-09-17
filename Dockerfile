# Stage 1: Build Next.js static export
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

# Stage 2: Production Python API serving API + static frontend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies required for OpenCV, RapidOCR, and graphics
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI application
COPY app ./app

# Copy compiled Next.js export from Stage 1 into frontend/out
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Dynamic port binding
ENV PORT=8000
EXPOSE 8000

# Run FastAPI backend via Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
