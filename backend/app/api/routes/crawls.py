from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.crawler.engine import CrawlEngine
from app.crawler.parsers.cisa_kev_parser import CISAKEVParser
from app.crawler.parsers.github_advisories_parser import GitHubAdvisoriesParser
from app.crawler.parsers.nvd_parser import NVDParser
from app.crawler.parsers.redhat_parser import RedHatParser
from app.crawler.parsers.test_parser import TestParser
from app.database import SessionLocal
from app.models.models import CrawlJob, CrawlLog, Source
from app.schemas import CrawlCreateResponse, CrawlJobRead, CrawlRequest

router = APIRouter()


def _run_crawl_in_background(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job is None:
            return
        source = db.query(Source).filter(Source.id == job.source_id).first()
        if source is None:
            return
        base_url = source.base_url or ''
        # Simple domain lookup for now; this is intentionally not a plugin registry.
        if 'nvd.nist.gov' in base_url:
            parser = NVDParser()
        elif 'cisa.gov' in base_url:
            parser = CISAKEVParser()
        elif 'api.github.com' in base_url:
            parser = GitHubAdvisoriesParser()
        elif 'access.redhat.com' in base_url:
            parser = RedHatParser()
        else:
            parser = TestParser()
        engine = CrawlEngine(source=source, parser=parser, job_id=job.id)
        engine.run()
        engine.close()
    finally:
        db.close()


@router.post(
    '/api/crawls',
    response_model=CrawlCreateResponse,
    response_model_exclude_none=True,
    summary='Start one or more crawl jobs',
    description=(
        'Queues a new crawl job per source and runs each in the background. Accepts either a single '
        'source_id (legacy) or a source_ids list; also accepts optional keywords, date_from, and '
        'maximum_pages, which are stored on each job but not yet used by the crawler engine. '
        'Returns {"job_id": N, "status": "queued"} when a single legacy source_id was given, or '
        '{"job_ids": [...], "status": "queued"} when source_ids was given.'
    ),
)
def create_crawl(payload: CrawlRequest, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        if payload.source_ids:
            target_ids = payload.source_ids
        elif payload.source_id is not None:
            target_ids = [payload.source_id]
        else:
            raise HTTPException(status_code=400, detail='source_id or source_ids is required')

        sources = db.query(Source).filter(Source.id.in_(target_ids)).all()
        found_ids = {source.id for source in sources}
        missing_ids = [source_id for source_id in target_ids if source_id not in found_ids]
        if missing_ids:
            raise HTTPException(status_code=404, detail=f'Source(s) not found: {missing_ids}')

        sources_by_id = {source.id: source for source in sources}
        job_ids: list[int] = []

        for source_id in target_ids:
            source = sources_by_id[source_id]
            job = CrawlJob(
                source_id=source.id,
                status='queued',
                progress=0,
                started_at=datetime.utcnow(),
                pages_visited=0,
                records_extracted=0,
                error_count=0,
                configuration={
                    'base_url': source.base_url,
                    # keywords/date_from/maximum_pages are accepted and persisted for forward
                    # compatibility, but the crawler engine does not read or apply them yet.
                    'keywords': payload.keywords,
                    'date_from': payload.date_from.isoformat() if payload.date_from else None,
                    'maximum_pages': payload.maximum_pages,
                },
            )
            db.add(job)
            db.commit()
            db.refresh(job)

            background_tasks.add_task(_run_crawl_in_background, job.id)
            job_ids.append(job.id)

        if not payload.source_ids:
            return {'job_id': job_ids[0], 'status': 'queued'}
        return {'job_ids': job_ids, 'status': 'queued'}
    finally:
        db.close()


@router.get(
    '/api/crawls',
    response_model=list[CrawlJobRead],
    summary='List crawl jobs',
    description='Returns a paginated list of crawl jobs, most recent first. Supports pagination via limit/offset.',
)
def list_crawls(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    db = SessionLocal()
    try:
        return db.query(CrawlJob).order_by(CrawlJob.id.desc()).limit(limit).offset(offset).all()
    finally:
        db.close()


@router.get(
    '/api/crawls/{job_id}',
    response_model=CrawlJobRead,
    summary='Get a crawl job by ID',
    description='Returns a single crawl job by its ID, or a 404 if it does not exist.',
)
def get_crawl(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job is None:
            raise HTTPException(status_code=404, detail='Job not found')
        return job
    finally:
        db.close()


@router.post(
    '/api/crawls/{job_id}/stop',
    response_model=CrawlJobRead,
    summary='Stop a crawl job',
    description=(
        'Requests cooperative cancellation of a queued or running crawl job by setting its status to '
        '"stopping"; the crawl engine checks for this during its request-delay wait and halts itself, '
        'setting the final status to "stopped". A no-op (returns the job unchanged) if the job is '
        'already in a terminal state (completed/failed/stopped).'
    ),
)
def stop_crawl(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job is None:
            raise HTTPException(status_code=404, detail='Job not found')
        if job.status in ('queued', 'running'):
            job.status = 'stopping'
            db.add(
                CrawlLog(
                    crawl_job_id=job.id,
                    timestamp=datetime.utcnow(),
                    log_level='WARN',
                    message='stop requested by user',
                    source='api',
                )
            )
            db.commit()
            db.refresh(job)
        return job
    finally:
        db.close()
