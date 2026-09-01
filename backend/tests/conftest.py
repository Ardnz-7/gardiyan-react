import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app import database as app_database
from app.models.models import Base


@pytest.fixture()
def test_db(tmp_path):
    """Point the app's shared SessionLocal at a fresh, isolated SQLite file for one test.

    Every route module does `from app.database import SessionLocal` and calls it directly
    (no Depends()), so they all hold a reference to the same sessionmaker instance.
    sessionmaker.configure(bind=...) mutates that instance in place rather than replacing it,
    so re-binding it here reaches every route module without touching any route code.
    """
    db_path = tmp_path / 'test.db'
    test_engine = create_engine(f'sqlite:///{db_path}', connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=test_engine)

    app_database.SessionLocal.configure(bind=test_engine)

    yield test_engine

    test_engine.dispose()
    app_database.SessionLocal.configure(bind=app_database.engine)


@pytest.fixture()
def client(test_db):
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
