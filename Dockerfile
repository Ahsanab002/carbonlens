# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project files
COPY . .

# Create staticfiles directory
RUN mkdir -p /app/backend/staticfiles

# Collect static files
WORKDIR /app/backend
RUN python manage.py collectstatic --noinput --clear

# Run migrations and start server
CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
