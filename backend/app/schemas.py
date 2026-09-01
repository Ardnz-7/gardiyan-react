from datetime import date, datetime
from typing import Annotated, Optional, List

from pydantic import BaseModel, ConfigDict, PlainSerializer


def _serialize_utc(value: datetime) -> str:
    # All datetimes in this app are produced via datetime.utcnow(), which is naive (no tzinfo).
    # Pydantic's default serialization emits naive datetimes with no offset/Z suffix, which
    # browsers' Date constructor then misinterprets as local time instead of UTC. Since every
    # value here is already UTC, a bare 'Z' suffix is correct; an aware datetime (not currently
    # produced anywhere) is serialized as-is since it already carries its own offset.
    if value.tzinfo is None:
        return value.isoformat() + 'Z'
    return value.isoformat()


UTCDatetime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str, when_used='json')]


class SourceCreate(BaseModel):
    name: str
    base_url: str
    enabled: bool = True
    request_delay: int = 0


class CrawlRequest(BaseModel):
    source_id: Optional[int] = None
    source_ids: Optional[List[int]] = None
    keywords: Optional[List[str]] = None
    date_from: Optional[date] = None
    maximum_pages: Optional[int] = None


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    enabled: Optional[bool] = None
    request_delay: Optional[int] = None


class SourceStatusUpdate(BaseModel):
    enabled: bool


class SourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_url: Optional[str] = None
    enabled: bool
    request_delay: int
    created_at: UTCDatetime
    updated_at: UTCDatetime
    last_crawl_at: Optional[UTCDatetime] = None


class CrawlJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: int
    status: str
    progress: int
    started_at: UTCDatetime
    completed_at: Optional[UTCDatetime] = None
    pages_visited: int
    records_extracted: int
    error_count: int
    configuration: Optional[dict] = None


class AdvisoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crawl_job_id: int
    title: str
    organization: Optional[str] = None
    publication_date: Optional[date] = None
    url: Optional[str] = None
    source_domain: Optional[str] = None
    cve: Optional[str] = None
    product: Optional[str] = None
    severity: Optional[str] = None
    summary: Optional[str] = None
    collection_date: UTCDatetime


class CrawlLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crawl_job_id: int
    timestamp: UTCDatetime
    log_level: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    database: str
    crawler: str


class CrawlCreateResponse(BaseModel):
    job_id: Optional[int] = None
    job_ids: Optional[List[int]] = None
    status: str


class StatsResponse(BaseModel):
    total_advisories: int
    by_severity: dict
    active_sources: int
    completed_crawls: int
