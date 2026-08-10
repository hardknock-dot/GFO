from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Boolean, DateTime, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    short_name: Mapped[str] = mapped_column(String, nullable=False)
    logo: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
