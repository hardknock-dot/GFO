from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, Text, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class MissedSchedule(Base):
    __tablename__ = "missed_schedules"

    missed_schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    requested_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    requested_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
