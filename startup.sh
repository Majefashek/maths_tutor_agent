#!/bin/bash
set -e

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Daphne (ASGI server)
exec daphne -b 0.0.0.0 -p $PORT config.asgi:application
