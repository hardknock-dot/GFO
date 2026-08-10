from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, Text, Boolean, Numeric, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Performance(Base):
    __tablename__ = "performances"

    performance_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    actual_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    escalation: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    escalation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Numeric(3, 1), nullable=True)
    attachment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
