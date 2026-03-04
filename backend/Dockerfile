# Use Alpine Linux for smaller base image
FROM python:3.10-alpine as builder

# Set the working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage with Alpine
FROM python:3.10-alpine

# Set the working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    && adduser --disabled-password --gecos '' appuser

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
