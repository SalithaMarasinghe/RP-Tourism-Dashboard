# Use Node.js for frontend build
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Use Python for backend
FROM python:3.10-slim as builder

# Set the working directory
WORKDIR /app

# Copy requirements FIRST
COPY requirements.txt .

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install requirements with compatible versions
RUN pip install --upgrade pip setuptools && pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Install runtime dependencies only (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    && adduser --disabled-password --gecos '' appuser \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy installed packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/build ./frontend/build

# Copy application code (exclude heavy data files)
COPY . .

# Change ownership to appuser
RUN chown -R appuser:appuser /app

# Set environment variables
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/home/appuser/.local/lib/python3.10/site-packages

# Switch to non-root user
USER appuser

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/test || exit 1

# Start command
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]
