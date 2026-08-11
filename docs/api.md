# API - Planned Endpoints

- GET /health: health check and basic status
- GET /v1/advisories: list advisories (filter by source, severity, date)
- POST /v1/advisories: ingest a new advisory (from crawler or manual)
- GET /v1/advisories/{id}: retrieve advisory details
- GET /v1/cves: list CVE records (searchable)
- GET /v1/cves/{cve_id}: retrieve CVE details and linked advisories
- GET /v1/sources: list data sources and fetch metadata
- POST /v1/crawl: trigger an on-demand crawl job
- GET /v1/jobs/{job_id}: check crawl job status and results
- GET /v1/stats: aggregated statistics (counts by severity/source)
- GET /v1/search: full-text search across advisories and CVEs
