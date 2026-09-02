# Gardiyan

Gardiyan is an OSINT-based security advisory and CVE aggregation platform. It collects, normalizes, and correlates public vulnerability disclosures and advisories to provide searchable, timely threat intelligence for defenders and researchers.

## Architecture overview

Gardiyan is a layered application:

```
Web UI  --->  REST API  --->  Crawler Engine  --->  Database
(React)      (FastAPI)       (backend/app/crawler)   (SQLite)
```

- The **Web UI** (React) talks only to the REST API over HTTP — it has no direct access to the database or the crawler.
- The **REST API** (FastAPI) exposes CRUD/read endpoints and triggers crawl jobs. It is the only entry point into the system.
- The **Crawler Engine** (`backend/app/crawler`) fetches and parses advisory data from configured sources and writes results to the database. **The crawler engine never talks to the UI directly — all crawl status and results flow back through the REST API.** It currently runs in-process as a FastAPI background task (`BackgroundTasks`), not a separate worker/queue.
- The **Database** (SQLite) stores sources, crawl jobs, advisories, and crawl logs.

## Tech stack

- **Backend:** Python 3.12, FastAPI, Pydantic, SQLAlchemy, Alembic
- **Database:** SQLite
- **Frontend:** React 19, Vite, TypeScript, react-router-dom

**Docker is set up.** The whole app (backend + frontend) can be built and run via `docker-compose.yml` at the project root — see [Docker setup](#docker-setup) below. Running directly on the host (as described in Installation & setup) still works too; Docker is an alternative, not a replacement.

## Project structure

```
backend/
  app/
    api/routes/       FastAPI route modules (health, sources, crawls, advisories, logs, stats, statistics)
    crawler/           Crawl engine, robots.txt handling, per-source parsers
    database/          SQLAlchemy engine/session setup
    models/            SQLAlchemy ORM models
    schemas.py          Pydantic request/response schemas
    main.py             FastAPI app entrypoint, CORS config, router registration
  alembic/              Migration environment and versioned migrations
  requirements.txt
  tests/                pytest suite: sources, crawls, advisories, url_safety, parsers, integration (see Testing below)
  Dockerfile             Backend container image (python:3.12-slim + uvicorn)
  entrypoint.sh           Container startup script: runs alembic upgrade head, then uvicorn
  .dockerignore           Excludes venv/, __pycache__/, gardiyan.db, tests/, etc. from the build context
src/                    React frontend — lives at the project root, NOT under a separate frontend/ folder
  api/client.ts         Typed API client (hardcoded API_BASE_URL)
  pages/                One component per screen (Dashboard, Sources, CrawlJobs, Advisories, Logs)
  components/           Layout/Sidebar shell
docs/
  api.md                Full API reference
  database.md            Database schema reference
  screens.md              Frontend screen reference
package.json             Frontend (Vite) project config
Dockerfile                Frontend container image (multi-stage: node:22-alpine build -> nginx:alpine serve)
nginx.conf                 nginx config the frontend image serves with (port 3000, SPA fallback)
docker-compose.yml          Orchestrates both containers; see Docker setup below
.dockerignore                Excludes node_modules/, dist/, .git/, backend/ from the frontend build context
README.md                This file
```

The frontend deliberately lives at the project root under `src/` rather than in a conventional `frontend/` subdirectory — this is an intentional layout deviation from what a typical fullstack repo might use, not an oversight.

## Installation & setup

### Backend setup

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1        # Windows PowerShell. On Mac/Linux use: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

Then start the API server (from the repository root, Windows-specific command that is known to work in this project):

```powershell
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

On Mac/Linux, activate the venv with `source backend/venv/bin/activate` first, then run `python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000` from the repository root (or `cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000`).

The API is then reachable at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

### Frontend setup

From the repository root:

```bash
npm install
npm run dev
```

This starts the Vite dev server, which defaults to `http://localhost:5173`.

### Known limitation: no environment-based configuration

There is currently no `.env` file or environment-variable-based configuration anywhere in the project. Two values are hardcoded instead:

- The CORS allowed origin, in `backend/app/main.py` (`allow_origins=['http://localhost:5173']`).
- The API base URL the frontend calls, in `src/api/client.ts` (`API_BASE_URL = 'http://localhost:8000'`).

This means the backend and frontend must run on exactly these hosts/ports for the app to work out of the box, and deploying to any other environment requires manually editing these two hardcoded values in source. This is a known limitation, not a configuration feature.

## Docker setup

The whole app can be started with `docker compose up --build` from the project root — no local Python or Node install needed.

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **API documentation:** `http://localhost:8000/docs`

The SQLite database persists across container restarts via a named Docker volume (`backend_db`). A named volume can only mount onto a directory, not a bare file, so `/app/gardiyan.db` is actually a symlink into the mounted `/app/data` directory — see `backend/Dockerfile` for how that's set up.

CORS is configured to allow both the Vite dev origin (`localhost:5173`) and the Dockerized frontend's origin (`localhost:3000`) simultaneously, so either workflow works with no config changes.

Database migrations run automatically on container startup (via `backend/entrypoint.sh`), not manually — there's no separate `alembic upgrade head` step to remember when using Docker.

To stop: `docker compose down` (stops the containers, keeps the persisted database) or `docker compose down -v` (also deletes the named volume, wiping the database).

## Database migrations

Migrations are managed with Alembic, run from the `backend/` directory:

```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

Two migrations currently exist: an initial schema migration and a follow-up adding a unique constraint on `(cve, source_domain)` on the `advisory` table. See [docs/database.md](docs/database.md) for the full current schema (the `source`, `crawl_job`, `advisory`, and `crawl_log` tables and their columns).

## How to start a crawl

1. Add a source — either through the **Sources** page in the UI, or directly via `POST /api/sources` with `{"name": "...", "base_url": "...", "enabled": true, "request_delay": 2}`.
2. Start a crawl against that source — either through the **Crawl Jobs** page in the UI, or directly via `POST /api/crawls` with `{"source_id": <id>}`.
3. The crawl runs as a background task; poll `GET /api/crawls/{job_id}` (or watch the Crawl Jobs page, which auto-refreshes every 3 seconds) to see its status move from `queued` → `running` → `completed`/`failed`.
4. Once complete, resulting advisories are visible via the **Advisories** page or `GET /api/advisories`, and crawl activity is visible via the **Logs** page or `GET /api/logs`.

## API overview

| Resource | Description |
|---|---|
| Health | Service/database/crawler status check |
| Sources | Manage crawl sources (list, create, update, enable/disable) |
| Crawls | Start, list, inspect, and stop crawl jobs |
| Advisories | List, retrieve, and delete collected advisories, with filtering and pagination |
| Logs | List crawl log entries, filterable by level and job |
| Stats / Statistics | Aggregate counts and a daily advisory timeline |

See [docs/api.md](docs/api.md) for the full endpoint reference (parameters, example responses, error behavior), or the live interactive Swagger UI at `http://127.0.0.1:8000/docs` while the backend is running.

## Testing

**Backend:** pytest, covering health, sources, crawls, advisories, URL safety/SSRF validation, parsers (against local JSON fixtures, no network calls), and one end-to-end integration test that exercises the full API → crawler → database → API flow — 36 tests total. Run from the `backend/` directory:

```bash
cd backend
pytest
```

Two of the URL-safety tests (`test_accepts_public_https_url`, `test_rejects_unresolvable_hostname`) do real DNS resolution rather than mocking it, so they need network access to pass.

**Frontend:** Vitest + React Testing Library, covering Dashboard, CrawlJobs, and Advisories — loading/error states, form validation, client-side filtering, and progress display — 13 tests total. Run from the project root:

```bash
npm test
```

## Security controls implemented

The following are actually implemented in code today:

- **robots.txt compliance** — every crawl target's `robots.txt` is checked via `check_robots_allowed()` (`backend/app/crawler/robots.py`) before fetching, and a request is skipped (logged as `WARN`, counted as an error) if disallowed.
- **Rate limiting** — a configurable `request_delay` (seconds) per source is applied before each request (`time.sleep(self.source.request_delay)` in `backend/app/crawler/engine.py`).
- **A documented allowlist exception for CISA's KEV feed** — `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` returns a 403 on its `robots.txt` fetch due to CDN/bot-protection, not an actual crawl restriction on the feed itself. This one URL is explicitly allowlisted (`KNOWN_PUBLIC_DATA_FEEDS` in `robots.py`) and every use of the exception is logged.
- **CORS restricted to the frontend origin** — `allow_origins=['http://localhost:5173']` in `backend/app/main.py` (not a wildcard).
- **Deduplication** — a unique constraint on `(cve, source_domain)` on the `advisory` table (added via the `c2fc3ba0418e` migration) means re-crawling updates an existing advisory in place instead of creating a duplicate row.
- **SSRF protection** — `validate_url_is_safe()` (`backend/app/crawler/url_safety.py`) rejects any URL whose scheme isn't `http`/`https`, or whose hostname resolves (via DNS) to a loopback, private, link-local, reserved, or multicast IP address — this covers cloud metadata endpoints like `169.254.169.254`. It's enforced twice: at source creation/update time (`POST`/`PUT /api/sources`), so an unsafe URL can never enter the database through the API in the first place, and defensively again at crawl time in the engine (`backend/app/crawler/engine.py`) as defense in depth. Note: this covers hostname/IP-based SSRF but does **not** protect against DNS-rebinding attacks, where the resolved IP could differ between validation time and request time — full protection against that would require pinning the resolved IP and connecting to it directly, which is out of scope for now.
- **Cooperative crawl cancellation** — `POST /api/crawls/{job_id}/stop` sets the job's status to `"stopping"` (rather than a database-only `"stopped"`). The crawl engine (`backend/app/crawler/engine.py`) checks for this at the top of its URL loop and, more importantly, in 0.5s increments during its request-delay wait, and halts itself as soon as it sees `"stopping"`, landing on a final `"stopped"` status. Limitation: crawls in this codebase currently only ever process a single URL per job (`source.base_url`), so this has only been exercised against that single-URL, delay-wait case — it hasn't been tested against a genuinely long-running multi-page crawl, since none exist yet.

The following are **not yet implemented**, per the project spec:

- **No authentication** — every API endpoint is open with no auth/authorization layer of any kind.

## Ethical safeguards

- Gardiyan collects only public advisories from approved sources — currently NVD and CISA KEV, both consumed via their official JSON APIs, with no HTML scraping involved.
- robots.txt is respected for every crawl target, with exactly one documented and logged exception (the CISA KEV feed, described above).
- Crawling uses conservative, source-configurable rate limiting (`request_delay`) rather than unthrottled requests.

## Known limitations

- **No authentication** — see Security controls above.
- **SSRF protection does not cover DNS-rebinding** — the resolved IP is checked at validation time (source creation/update, and again at crawl time), but not pinned; a hostname could theoretically resolve safely at validation and to a different, unsafe IP at actual request time. See Security controls above.
- **`GET /api/stats` and `GET /api/statistics/summary` duplicate each other** — the older `/api/stats` path was kept, unchanged, purely for backward compatibility with the current frontend (which calls it), while `/api/statistics/summary` is the newer, spec-required path returning the identical shape. This duplication is intentional for now, not an oversight, but should eventually be consolidated.
- **Docker Compose has no Redis/worker service** — crawls run in-process as FastAPI background tasks rather than through a queue, so no message broker or worker container is needed; this is intentional per the current architecture, not an oversight.