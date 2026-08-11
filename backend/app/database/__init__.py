import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Determine backend base directory (two levels up from this file: backend/)
BASE_DIR = Path(__file__).resolve().parents[2]
DB_FILE = BASE_DIR / "gardiyan.db"
DATABASE_URL = f"sqlite:///{DB_FILE.as_posix()}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models so that Base is registered when importing this package
from ..models import models as models  # noqa: E402, F401
