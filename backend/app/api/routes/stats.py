from fastapi import APIRouter
from sqlalchemy import func

from app.database import SessionLocal
from app.models.models import Advisory, CrawlJob, Source

router = APIRouter()


@router.get('/api/stats')
def get_stats():
    db = SessionLocal()
    try:
        total_advisories = db.query(func.count(Advisory.id)).scalar() or 0
        by_severity = {}
        for severity in ['critical', 'high', 'medium', 'low']:
            count = db.query(func.count(Advisory.id)).filter(Advisory.severity.ilike(severity)).scalar() or 0
            by_severity[severity] = count

        active_sources = db.query(func.count(Source.id)).filter(Source.enabled.is_(True)).scalar() or 0
        completed_crawls = db.query(func.count(CrawlJob.id)).filter(CrawlJob.status == 'completed').scalar() or 0

        return {
            'total_advisories': total_advisories,
            'by_severity': by_severity,
            'active_sources': active_sources,
            'completed_crawls': completed_crawls,
        }
    finally:
        db.close()
