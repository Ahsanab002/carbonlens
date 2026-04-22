#!/bin/bash
set -e

echo "Installing dependencies..."
pip install --upgrade pip

echo "Collecting static files..."
cd backend
python manage.py collectstatic --no-input --clear

echo "Running migrations..."
python manage.py migrate --noinput

echo "Build complete!"

