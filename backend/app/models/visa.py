from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Visa(Base):
    __tablename__ = "visa_details"

    visa_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    visa_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    applied_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    visa_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    visa_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
