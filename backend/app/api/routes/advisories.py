from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.database import SessionLocal
from app.models.models import Advisory
from app.schemas import AdvisoryRead

router = APIRouter()


@router.get(
    '/api/advisories',
    response_model=list[AdvisoryRead],
    summary='List advisories',
    description=(
        'Returns a paginated list of advisories, most recent first. Supports filtering by '
        'source domain, severity, and a collection_date range (start_date/end_date), and '
        'pagination via limit/offset.'
    ),
)
def list_advisories(
    source: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    db = SessionLocal()
    try:
        query = db.query(Advisory)
        if source:
            query = query.filter(Advisory.source_domain.ilike(f'%{source}%'))
        if severity:
            query = query.filter(Advisory.severity.ilike(f'%{severity}%'))
        if start_date:
            query = query.filter(Advisory.collection_date >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.filter(
                Advisory.collection_date < datetime.combine(end_date + timedelta(days=1), datetime.min.time())
            )
        return query.order_by(Advisory.id.desc()).limit(limit).offset(offset).all()
    finally:
        db.close()


@router.get(
    '/api/advisories/{advisory_id}',
    response_model=AdvisoryRead,
    summary='Get an advisory by ID',
    description='Returns a single advisory by its ID, or a 404 if it does not exist.',
)
def get_advisory(advisory_id: int):
    db = SessionLocal()
    try:
        advisory = db.query(Advisory).filter(Advisory.id == advisory_id).first()
        if advisory is None:
            raise HTTPException(status_code=404, detail='Advisory not found')
        return advisory
    finally:
        db.close()
