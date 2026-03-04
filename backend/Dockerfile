# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container first for better caching
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Make port 8080 available to the world outside this container
# Railway/Cloud Run expects the container to listen on $PORT
ENV PORT=8080

# Expose the port
EXPOSE $PORT

# Run server.py when the container launches
CMD exec uvicorn server:app --host 0.0.0.0 --port $PORT
