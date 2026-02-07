#!/bin/bash
set -e

# Convert Render's postgresql:// URL to postgresql+psycopg:// format if needed
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql://* ]]; then
    export DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+psycopg:\/\/}"
fi

# Run migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Start the application
echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}