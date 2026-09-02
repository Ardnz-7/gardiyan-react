# Database Schema

```mermaid
erDiagram
    SOURCE ||--o{ CRAWL_JOB : "targets"
    CRAWL_JOB ||--o{ ADVISORY : "produces"
    CRAWL_JOB ||--o{ CRAWL_LOG : "logs"

    SOURCE {
        int id PK
        string name
        string base_url
        bool enabled
        int request_delay
    }
    CRAWL_JOB {
        int id PK
        int source_id FK
        string status
        int progress
    }
    ADVISORY {
        int id PK
        int crawl_job_id FK
        string cve
        string severity
        string source_domain
    }
    CRAWL_LOG {
        int id PK
        int crawl_job_id FK
        string log_level
        string message
    }
```

## sources
| Field | Type | Notes |
|---|---|---|
| id | int, PK | |
| name | string | |
| base_url | string | |
| enabled | bool | |
| request_delay | int | seconds between requests |
| created_at | datetime | |
| updated_at | datetime | |
| last_crawl_at | datetime, nullable | |

## crawl_jobs
| Field | Type | Notes |
|---|---|---|
| id | int, PK | |
| source_id | int, FK -> sources.id | added beyond brief: a job must target one source |
| status | string | e.g. pending, running, completed, failed |
| progress | int | 0-100 |
| started_at | datetime | |
| completed_at | datetime, nullable | |
| pages_visited | int | |
| records_extracted | int | |
| error_count | int | |
| configuration | json | crawl-specific settings |

## advisories
| Field | Type | Notes |
|---|---|---|
| id | int, PK | |
| crawl_job_id | int, FK -> crawl_jobs.id | |
| title | string | |
| organization | string | |
| publication_date | date | |
| url | string | |
| source_domain | string | not a FK, just the domain string |
| cve | string | |
| product | string | |
| severity | string | |
| summary | text | |
| collection_date | datetime | |

## crawl_logs
| Field | Type | Notes |
|---|---|---|
| id | int, PK | |
| crawl_job_id | int, FK -> crawl_jobs.id | |
| timestamp | datetime | |
| log_level | string | e.g. INFO, WARNING, ERROR |
| message | text | |
| source | string | log module name, not related to sources table |
