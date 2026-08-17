from fastapi import APIRouter, HTTPException, Query

from app.database import SessionLocal
from app.models.models import Advisory
from app.schemas import AdvisoryRead

router = APIRouter()


@router.get('/api/advisories', response_model=list[AdvisoryRead])
def list_advisories(
    source: str | None = Query(default=None),
    severity: str | None = Query(default=None),
):
    db = SessionLocal()
    try:
        query = db.query(Advisory)
        if source:
            query = query.filter(Advisory.source_domain.ilike(f'%{source}%'))
        if severity:
            query = query.filter(Advisory.severity.ilike(f'%{severity}%'))
        return query.order_by(Advisory.id.desc()).all()
    finally:
        db.close()


@router.get('/api/advisories/{advisory_id}', response_model=AdvisoryRead)
def get_advisory(advisory_id: int):
    db = SessionLocal()
    try:
        advisory = db.query(Advisory).filter(Advisory.id == advisory_id).first()
        if advisory is None:
            raise HTTPException(status_code=404, detail='Advisory not found')
        return advisory
    finally:
        db.close()
