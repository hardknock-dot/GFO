from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, DeclarativeBase, Session
from app.config import settings

# Create engine with strict small pool size to fit within Supabase session pooler limits
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=0,
    pool_timeout=10,
    connect_args={"prepare_threshold": None}
)

# Configure session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for SQLAlchemy 2.x models
class Base(DeclarativeBase):
    pass

# Dependency to provide database session per request
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
