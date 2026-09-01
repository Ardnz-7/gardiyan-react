FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# A named volume can only be mounted onto a directory, not a bare file path (mounting one
# onto a file target fails outright: "not a directory... mount a directory onto a file?").
# So the persisted data directory is /app/data (mounted by docker-compose.yml), and
# /app/gardiyan.db — the exact path DATABASE_URL resolves to, unchanged from how the app
# already runs on the host — is a symlink into it. app/database and alembic/env.py both
# keep opening plain "gardiyan.db" with no code changes; the bytes just happen to live in
# the mounted volume via the symlink. On first run, Docker copies this directory's existing
# content (the empty gardiyan.db) into the fresh volume; alembic upgrade head then migrates it.
RUN mkdir -p data && touch data/gardiyan.db && ln -s data/gardiyan.db gardiyan.db

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
