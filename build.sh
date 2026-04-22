#!/bin/bash
cd backend
python manage.py collectstatic --no-input
python manage.py migrate
