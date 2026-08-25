from fastapi import APIRouter, Query

from app.database import SessionLocal
from app.models.models import CrawlLog
from app.schemas import CrawlLogRead

router = APIRouter()


@router.get('/api/logs', response_model=list[CrawlLogRead])
def list_logs(
    level: str | None = Query(default=None),
    crawl_job_id: int | None = Query(default=None),
):
    db = SessionLocal()
    try:
        query = db.query(CrawlLog)
        if level:
            query = query.filter(CrawlLog.log_level.ilike(f'%{level}%'))
        if crawl_job_id:
            query = query.filter(CrawlLog.crawl_job_id == crawl_job_id)
        return query.order_by(CrawlLog.timestamp.desc()).all()
    finally:
        db.close()
