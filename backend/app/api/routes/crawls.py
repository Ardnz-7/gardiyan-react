from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.crawler.engine import CrawlEngine
from app.crawler.parsers.cisa_kev_parser import CISAKEVParser
from app.crawler.parsers.nvd_parser import NVDParser
from app.crawler.parsers.test_parser import TestParser
from app.database import SessionLocal
from app.models.models import CrawlJob, Source
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
        else:
            parser = TestParser()
        engine = CrawlEngine(source=source, parser=parser, job_id=job.id)
        engine.run()
        engine.close()
    finally:
        db.close()


@router.post('/api/crawls', response_model=CrawlCreateResponse)
def create_crawl(payload: CrawlRequest, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == payload.source_id).first()
        if source is None:
            raise HTTPException(status_code=404, detail='Source not found')

        job = CrawlJob(
            source_id=source.id,
            status='queued',
            progress=0,
            started_at=datetime.utcnow(),
            pages_visited=0,
            records_extracted=0,
            error_count=0,
            configuration={'base_url': source.base_url},
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        background_tasks.add_task(_run_crawl_in_background, job.id)
        return {'job_id': job.id, 'status': 'queued'}
    finally:
        db.close()


@router.get('/api/crawls', response_model=list[CrawlJobRead])
def list_crawls():
    db = SessionLocal()
    try:
        return db.query(CrawlJob).order_by(CrawlJob.id.desc()).all()
    finally:
        db.close()


@router.get('/api/crawls/{job_id}', response_model=CrawlJobRead)
def get_crawl(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job is None:
            raise HTTPException(status_code=404, detail='Job not found')
        return job
    finally:
        db.close()


@router.post('/api/crawls/{job_id}/stop', response_model=CrawlJobRead)
def stop_crawl(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job is None:
            raise HTTPException(status_code=404, detail='Job not found')
        # Interrupting an in-flight background crawl is not implemented yet; this endpoint only updates the stored status.
        job.status = 'stopped'
        db.commit()
        db.refresh(job)
        return job
    finally:
        db.close()
