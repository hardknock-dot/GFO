from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, Text, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Travel(Base):
    __tablename__ = "travel_arrangements"

    travel_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    booking_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    travel_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purpose: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
