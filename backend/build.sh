#!/usr/bin/env bash
# exit on error
set -o errexit

# Install GDAL dependencies
apt-get update
apt-get install -y --no-install-recommends gdal-bin libgdal-dev

# Install Python dependencies
pip install -r requirements.txt
pip install gunicorn

# Collect static files
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate