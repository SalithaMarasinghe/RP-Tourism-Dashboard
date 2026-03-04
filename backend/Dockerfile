# Use Debian slim for better compatibility with ML packages
FROM python:3.10-slim as builder

# Set the working directory
WORKDIR /app

# Copy requirements FIRST
COPY requirements.txt .

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and add parallel support
RUN pip install --upgrade pip setuptools && pip install --no-cache-dir --user --no-deps -r requirements.txt

# Production stage
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    && adduser --disabled-password --gecos '' appuser \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY . .

# Change ownership to appuser
RUN chown -R appuser:appuser /app
USER appuser

# Make Python use user site-packages
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/home/appuser/.local/lib/python3.10/site-packages

# Make port 8080 available to the world outside this container
ENV PORT=8080
EXPOSE $PORT

# Run server.py when the container launches
CMD exec uvicorn server:app --host 0.0.0.0 --port $PORT
