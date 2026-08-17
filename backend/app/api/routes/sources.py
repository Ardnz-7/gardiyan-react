from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import Source
from app.schemas import SourceCreate, SourceRead

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get('/api/sources', response_model=list[SourceRead])
def list_sources():
    db = SessionLocal()
    try:
        return db.query(Source).order_by(Source.id.asc()).all()
    finally:
        db.close()


@router.post('/api/sources', response_model=SourceRead)
def create_source(payload: SourceCreate):
    db = SessionLocal()
    try:
        source = Source(
            name=payload.name,
            base_url=payload.base_url,
            enabled=payload.enabled,
            request_delay=payload.request_delay,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        return source
    except Exception as exc:  # pragma: no cover
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        db.close()
