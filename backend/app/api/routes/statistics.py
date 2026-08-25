from fastapi import APIRouter
from sqlalchemy import func

from app.database import SessionLocal
from app.models.models import Advisory, CrawlJob, Source
from app.schemas import StatsResponse

router = APIRouter()


@router.get(
    '/api/statistics/summary',
    response_model=StatsResponse,
    summary='Get advisory/source/crawl summary statistics',
    description=(
        'Returns aggregate counts: total advisories, a breakdown by severity '
        '(critical/high/medium/low), active source count, and completed crawl count.'
    ),
)
def get_summary():
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


@router.get(
    '/api/statistics/timeline',
    summary='Get advisory counts by day',
    description='Returns advisory counts grouped by collection date (day), ordered by date ascending.',
)
def get_timeline():
    db = SessionLocal()
    try:
        day = func.date(Advisory.collection_date)
        rows = (
            db.query(day.label('date'), func.count(Advisory.id).label('count'))
            .group_by(day)
            .order_by(day.asc())
            .all()
        )
        return [{'date': row.date, 'count': row.count} for row in rows]
    finally:
        db.close()
