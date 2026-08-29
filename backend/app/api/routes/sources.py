from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.crawler.url_safety import validate_url_is_safe
from app.database import SessionLocal
from app.models.models import Source
from app.schemas import SourceCreate, SourceRead, SourceStatusUpdate, SourceUpdate

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get(
    '/api/sources',
    response_model=list[SourceRead],
    summary='List sources',
    description='Returns all configured crawl sources, ordered by ID ascending.',
)
def list_sources():
    db = SessionLocal()
    try:
        return db.query(Source).order_by(Source.id.asc()).all()
    finally:
        db.close()


@router.post(
    '/api/sources',
    response_model=SourceRead,
    summary='Create a source',
    description='Creates a new crawl source with a name, base URL, enabled flag, and request delay.',
)
def create_source(payload: SourceCreate):
    is_safe, reason = validate_url_is_safe(payload.base_url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f'Unsafe URL: {reason}')

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


@router.put(
    '/api/sources/{source_id}',
    response_model=SourceRead,
    summary='Update a source',
    description='Partially updates a source; only fields present in the request body are overwritten.',
)
def update_source(source_id: int, payload: SourceUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if 'base_url' in updates:
        is_safe, reason = validate_url_is_safe(updates['base_url'])
        if not is_safe:
            raise HTTPException(status_code=400, detail=f'Unsafe URL: {reason}')

    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source is None:
            raise HTTPException(status_code=404, detail='Source not found')

        for field, value in updates.items():
            setattr(source, field, value)

        db.commit()
        db.refresh(source)
        return source
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        db.close()


@router.patch(
    '/api/sources/{source_id}/status',
    response_model=SourceRead,
    summary='Update a source status',
    description='Sets the enabled flag on a source.',
)
def update_source_status(source_id: int, payload: SourceStatusUpdate):
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source is None:
            raise HTTPException(status_code=404, detail='Source not found')

        source.enabled = payload.enabled
        db.commit()
        db.refresh(source)
        return source
    finally:
        db.close()
