# API Reference

Base URL: `http://127.0.0.1:8000`

All endpoints are prefixed `/api`. There is no API versioning (no `/v1`). Responses are plain JSON lists or objects — no envelope/wrapper.

## Health

### GET /api/health
Reports service status, database connectivity, and crawler availability.

No parameters.

Example response:
```json
{
  "status": "healthy",
  "database": "connected",
  "crawler": "available"
}
```

## Sources

### GET /api/sources
Returns all configured crawl sources, ordered by ID ascending.

No parameters.

Example response:
```json
[
  {
    "id": 1,
    "name": "NVD",
    "base_url": "https://services.nvd.nist.gov",
    "enabled": true,
    "request_delay": 2000,
    "created_at": "2026-08-17T21:50:00.123456",
    "updated_at": "2026-08-17T21:50:00.123456",
    "last_crawl_at": "2026-08-21T13:14:15.070000"
  }
]
```

### POST /api/sources
Creates a new crawl source.

Body (JSON):
| Field | Type | Required | Default |
|---|---|---|---|
| name | string | yes | — |
| base_url | string | yes | — |
| enabled | boolean | no | `true` |
| request_delay | int | no | `0` |

Example response (201-equivalent body, status 200):
```json
{
  "id": 6,
  "name": "CISA KEV",
  "base_url": "https://www.cisa.gov",
  "enabled": true,
  "request_delay": 2000,
  "created_at": "2026-08-26T00:10:00.000000",
  "updated_at": "2026-08-26T00:10:00.000000",
  "last_crawl_at": null
}
```
Returns `400` with `{"detail": "<error message>"}` if creation fails (e.g. duplicate name).

## Crawls

### POST /api/crawls
Queues a new crawl job for the given source and runs it in a background task.

Body (JSON):
| Field | Type | Required |
|---|---|---|
| source_id | int | yes |

Example response:
```json
{
  "job_id": 26,
  "status": "queued"
}
```
Returns `404` with `{"detail": "Source not found"}` if `source_id` doesn't exist.

### GET /api/crawls
Returns a paginated list of crawl jobs, most recent first (ordered by ID descending).

Query parameters:
| Param | Type | Default | Constraints |
|---|---|---|---|
| limit | int | 100 | 1–500 |
| offset | int | 0 | ≥ 0 |

Example response:
```json
[
  {
    "id": 24,
    "source_id": 1,
    "status": "completed",
    "progress": 100,
    "started_at": "2026-08-21T13:14:10.555881",
    "completed_at": "2026-08-21T13:14:15.070000",
    "pages_visited": 1,
    "records_extracted": 20,
    "error_count": 0,
    "configuration": { "base_url": "https://services.nvd.nist.gov" }
  }
]
```

### GET /api/crawls/{job_id}
Returns a single crawl job by ID.

Path parameter: `job_id` (int).

Example response: same shape as one item from `GET /api/crawls` above.
Returns `404` with `{"detail": "Job not found"}` if the ID doesn't exist.

### POST /api/crawls/{job_id}/stop
Marks a crawl job's status as `"stopped"`. Note: this only updates the stored status — it does not interrupt an in-flight background crawl (not yet implemented).

Path parameter: `job_id` (int).

Example response: the updated job object, same shape as `GET /api/crawls/{job_id}`, with `"status": "stopped"`.
Returns `404` with `{"detail": "Job not found"}` if the ID doesn't exist.

## Advisories

### GET /api/advisories
Returns a paginated list of advisories, ordered by ID descending (most recent first).

Query parameters:
| Param | Type | Default | Constraints | Behavior |
|---|---|---|---|---|
| source | string | none | — | Case-insensitive substring match on `source_domain` |
| severity | string | none | — | Case-insensitive substring match on `severity` |
| start_date | date (`YYYY-MM-DD`) | none | — | Filters `collection_date >=` start of that day |
| end_date | date (`YYYY-MM-DD`) | none | — | Filters `collection_date <` start of the day after `end_date` (i.e. inclusive of the full end date) |
| limit | int | 100 | 1–500 | Max rows returned |
| offset | int | 0 | ≥ 0 | Rows to skip |

Example response:
```json
[
  {
    "id": 116,
    "crawl_job_id": 25,
    "title": "TrueConf Server Missing Authentication for Critical Function Vulnerability",
    "organization": "CISA",
    "publication_date": "2026-08-20",
    "url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-72529",
    "source_domain": "cisa.gov",
    "cve": "CVE-2026-72529",
    "product": "TrueConf Server",
    "severity": null,
    "summary": "TrueConf Server contains a missing authentication for critical function vulnerability which could allow a remote unauthorized attacker with network access via port 4307/TCP to execute an arbitrary script.",
    "collection_date": "2026-08-25T22:14:23.876595"
  }
]
```

### GET /api/advisories/{advisory_id}
Returns a single advisory by ID.

Path parameter: `advisory_id` (int).

Example response: same shape as one item from `GET /api/advisories` above.
Returns `404` with `{"detail": "Advisory not found"}` if the ID doesn't exist.

## Logs

### GET /api/logs
Returns crawl log entries ordered by timestamp descending (most recent first). No pagination — always returns the full matching set.

Query parameters:
| Param | Type | Default | Behavior |
|---|---|---|---|
| level | string | none | Case-insensitive substring match on `log_level` |
| crawl_job_id | int | none | Exact match on `crawl_job_id` |

Example response:
```json
[
  {
    "id": 128,
    "crawl_job_id": 24,
    "timestamp": "2026-08-21T13:14:15.070000",
    "log_level": "INFO",
    "message": "job completed",
    "source": "crawler"
  }
]
```

## Stats

### GET /api/stats
Returns aggregate counts: total advisories, a breakdown by severity (fixed set: critical/high/medium/low, matched case-insensitively), active (enabled) source count, and completed crawl count. Not backed by a Pydantic response model in code — shape shown below reflects the actual dict returned.

No parameters.

Example response:
```json
{
  "total_advisories": 61,
  "by_severity": {
    "critical": 34,
    "high": 7,
    "medium": 0,
    "low": 0
  },
  "active_sources": 5,
  "completed_crawls": 18
}
```
