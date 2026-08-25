from __future__ import annotations

from datetime import date, datetime
from typing import Any
import time

import httpx

from app.database import SessionLocal, engine
from app.models.models import Advisory, Base, CrawlJob, CrawlLog, Source
from app.crawler.base import Parser
from app.crawler.robots import check_robots_allowed, is_known_public_feed

Base.metadata.create_all(bind=engine)


class CrawlEngine:
    def __init__(self, source: Source, parser: Parser, job_id: int | None = None):
        self.source = source
        self.parser = parser
        self.session = SessionLocal()
        self.job_id = job_id
        self.job = self._load_job() if job_id is not None else None
        self.visited_urls: set[str] = set()
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None

    def _load_job(self) -> CrawlJob | None:
        if self.job_id is None:
            return None
        return self.session.query(CrawlJob).filter(CrawlJob.id == self.job_id).first()

    @staticmethod
    def _normalize_date(value: Any):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                try:
                    return datetime.fromisoformat(value).date()
                except ValueError:
                    return None
        return None

    @staticmethod
    def _normalize_collection_date(value: Any):
        if value is None:
            return datetime.utcnow()
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                try:
                    return datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    return datetime.utcnow()
        return datetime.utcnow()

    def _log(self, message: str, level: str = 'INFO', source_name: str = 'crawler') -> None:
        if self.job is None:
            return
        self.session.add(
            CrawlLog(
                crawl_job_id=self.job.id,
                timestamp=datetime.utcnow(),
                log_level=level,
                message=message,
                source=source_name,
            )
        )
        self.session.commit()

    def _create_job(self) -> CrawlJob:
        job = CrawlJob(
            source_id=self.source.id,
            status='running',
            progress=0,
            pages_visited=0,
            records_extracted=0,
            error_count=0,
            configuration={'base_url': self.source.base_url, 'request_delay': self.source.request_delay},
        )
        self.session.add(job)
        self.session.commit()
        self.job = job
        return job

    def _enqueue_record(self, record: dict) -> None:
        if self.job is None:
            raise RuntimeError('Crawl job has not been created')

        cve = record.get('cve') or None
        source_domain = record.get('source_domain')
        advisory = None
        if cve:
            advisory = (
                self.session.query(Advisory)
                .filter(Advisory.cve == cve, Advisory.source_domain == source_domain)
                .first()
            )

        values = {
            'crawl_job_id': self.job.id,
            'title': str(record.get('title') or 'Untitled advisory'),
            'organization': record.get('organization'),
            'publication_date': self._normalize_date(record.get('publication_date')),
            'url': record.get('url'),
            'source_domain': source_domain,
            'cve': cve,
            'product': record.get('product'),
            'severity': record.get('severity'),
            'summary': record.get('summary'),
            'collection_date': self._normalize_collection_date(record.get('collection_date')),
        }

        if advisory is not None:
            for field, value in values.items():
                setattr(advisory, field, value)
            self._log('advisory updated (existing CVE)', 'INFO', 'crawler')
        else:
            self.session.add(Advisory(**values))
            self._log('advisory created (new)', 'INFO', 'crawler')

    def run(self, urls: list[str] | None = None) -> CrawlJob:
        self.started_at = datetime.utcnow()
        if self.job is None:
            self.job = self._create_job()
        else:
            self.job.status = 'running'
            self.job.progress = 0
            self.job.pages_visited = 0
            self.job.records_extracted = 0
            self.job.error_count = 0
            self.job.started_at = self.started_at
            self.job.completed_at = None
            self.session.add(self.job)
            self.session.commit()
        self._log('job started', 'INFO', 'crawler')

        if not self.source.base_url:
            self.job.status = 'failed'
            self.job.completed_at = datetime.utcnow()
            self._log('No base_url configured for source', 'ERROR', 'crawler')
            self.session.commit()
            return self.job

        target_urls = urls if urls is not None else [self.source.base_url]

        for url in target_urls:
            if url in self.visited_urls:
                self._log(f'skipping duplicate URL: {url}', 'INFO', 'crawler')
                continue
            self.visited_urls.add(url)

            request_path = '/' if url == self.source.base_url else url.replace(self.source.base_url, '', 1)
            if is_known_public_feed(url):
                robots_allowed = True
                self._log(
                    'robots.txt inaccessible (403); URL is in documented public-feed allowlist, proceeding',
                    'INFO',
                    'crawler',
                )
            else:
                robots_allowed = check_robots_allowed(self.source.base_url, request_path, 'GardiyanBot')
                self._log(f'robots.txt check: allowed={robots_allowed} for {url}', 'INFO', 'crawler')
            if not robots_allowed:
                self.job.error_count += 1
                self._log(f'Blocked by robots.txt: {url}', 'WARN', 'crawler')
                continue

            if self.source.request_delay:
                self._log(f'applying {self.source.request_delay}s delay before request', 'INFO', 'crawler')
                time.sleep(self.source.request_delay)

            try:
                response = httpx.get(url, timeout=30)
                response.raise_for_status()
                self.job.pages_visited += 1
                self._log(f'page fetched: {url}', 'INFO', 'http_client')

                try:
                    parsed_records = self.parser.parse(response.text, url)
                    for record in parsed_records:
                        self._enqueue_record(record)
                    self.job.records_extracted += len(parsed_records)
                except Exception as exc:  # noqa: BLE001
                    self.job.error_count += 1
                    self._log(f'parse error for {url}: {exc}', 'ERROR', type(self.parser).__name__)

                self.job.progress = 100
            except Exception as exc:  # noqa: BLE001
                self.job.error_count += 1
                self._log(f'fetch error for {url}: {exc}', 'ERROR', 'http_client')

        self.completed_at = datetime.utcnow()
        self.job.completed_at = self.completed_at
        if self.job.error_count > 0 and self.job.records_extracted == 0:
            self.job.status = 'failed'
        else:
            self.job.status = 'completed'
        self.job.progress = 100
        self._log('job completed', 'INFO', 'crawler')
        self.session.commit()
        return self.job

    def close(self) -> None:
        self.session.close()
