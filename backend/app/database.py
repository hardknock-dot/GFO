from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, DeclarativeBase, Session
from app.config import settings

# Create engine with pool_pre_ping=True to prevent stale connections
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True
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
