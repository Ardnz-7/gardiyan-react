#!/bin/sh
set -e

# Run migrations at container startup, not build time — a freshly created volume has no
# database file yet, so the schema needs to be created/upgraded when the container actually
# starts, against whatever gardiyan.db the mounted volume provides.
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
