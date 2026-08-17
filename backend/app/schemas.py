from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SourceCreate(BaseModel):
    name: str
    base_url: str
    enabled: bool = True
    request_delay: int = 0


class CrawlRequest(BaseModel):
    source_id: int


class SourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_url: Optional[str] = None
    enabled: bool
    request_delay: int
    created_at: datetime
    updated_at: datetime
    last_crawl_at: Optional[datetime] = None


class CrawlJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: int
    status: str
    progress: int
    started_at: datetime
    completed_at: Optional[datetime] = None
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
    collection_date: datetime


class HealthResponse(BaseModel):
    status: str
    database: str
    crawler: str


class CrawlCreateResponse(BaseModel):
    job_id: int
    status: str


class StatsResponse(BaseModel):
    total_advisories: int
    by_severity: dict
    active_sources: int
    completed_crawls: int
