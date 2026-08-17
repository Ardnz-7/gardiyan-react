from fastapi import APIRouter
from sqlalchemy import text

from app.database import SessionLocal
from app.schemas import HealthResponse

router = APIRouter()


@router.get('/api/health', response_model=HealthResponse)
def health_check():
    try:
        db = SessionLocal()
        db.execute(text('SELECT 1'))
        db.close()
        database_status = 'connected'
    except Exception:
        database_status = 'disconnected'

    return {
        'status': 'healthy',
        'database': database_status,
        'crawler': 'available',
    }
