# Findings and Limitations

## Project summary

Gardiyan is an OSINT-based security advisory and CVE aggregation platform: a FastAPI backend with a Python crawler engine, a React/TypeScript frontend, and a SQLite database, orchestrated via Docker Compose. It collects advisories from four approved public sources with working parsers — NVD, CISA KEV, GitHub Security Advisories, and Red Hat Security Data — plus a handful of test/demo sources created during development (confirmed via `GET /api/sources`).

## Key findings

- The layered architecture (Web UI → REST API → Crawler Engine → Database) was maintained throughout — the crawler never communicates with the frontend directly.
- Building real-source integrations surfaced two latent, pre-existing bugs that had gone unnoticed: a robots.txt URL-construction bug (using the full source path instead of the domain root) and a hardcoded Windows-specific path in Alembic's config — both fixed and verified against all active sources.
- Docker containerization surfaced a further bug (a named volume cannot mount onto a bare file path) and a systemic timezone bug (naive UTC timestamps were being misread as local time by the browser) — both fixed and verified live.
- Cooperative crawl cancellation was implemented and proven with a live, timed test: a running crawl detects a stop request within its polling interval and halts cleanly, without the background task silently overwriting the stopped status.

## Security review summary

Implemented: robots.txt compliance (with one documented, logged allowlist exception for CISA's CDN-blocked feed), rate limiting per source, SSRF protection (blocks localhost/private/link-local/reserved IP ranges and non-http(s) schemes, enforced at both source-creation time and crawl time), CORS restricted to known frontend origins, and advisory deduplication via a database unique constraint.

Not implemented: authentication/authorization (every endpoint is open), and DNS-rebinding protection (SSRF validation checks the resolved IP at validation time but does not pin it for the actual request).

## Test coverage

Backend: pytest suite covering health, source CRUD and validation, crawl job lifecycle, advisory filtering/pagination/deletion, SSRF URL validation, the NVD and CISA KEV parsers (via local JSON fixtures, no live network calls), and one full end-to-end integration test — 36 tests total (`cd backend && pytest`).

Frontend: Vitest + React Testing Library covering Dashboard, Crawl Jobs (including form validation and progress display), and Advisories (including filtering) — 13 tests total (`npm test`). The Sources page currently has no frontend test coverage.

## Known limitations

- No authentication or authorization layer.
- SSRF protection does not cover DNS-rebinding attacks.
- Crawl cancellation has only been exercised against single-page crawls (every current source fetches one URL per job); multi-page crawl cancellation is untested because no multi-page crawl exists yet.
- No environment-variable-based configuration — CORS origin and API base URL are hardcoded, requiring source edits to deploy elsewhere.
- `GET /api/stats` and `GET /api/statistics/summary` intentionally duplicate each other for backward compatibility.
- No background job queue (Celery/RQ) — crawls run as in-process FastAPI background tasks; acceptable at current scale but would not survive a backend restart mid-crawl.

## Recommended future improvements

- Add authentication (JWT-based, admin/viewer roles) before any real deployment beyond local development.
- Add DNS-pinning to close the SSRF DNS-rebinding gap.
- Consolidate the duplicate stats endpoints.
- Move hardcoded configuration (CORS origin, API base URL) to environment variables.
- Extend crawler support to multi-page sources and re-verify cancellation behavior against a genuinely long-running crawl.
- Add frontend test coverage for the Sources page.
