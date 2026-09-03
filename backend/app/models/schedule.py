from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, Text, ForeignKey, Boolean, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    support_type: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    fab_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fab_site: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    schedule_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    comment_status: Mapped[Optional[str]] = mapped_column(String(30), default="UNADDRESSED", nullable=True)
    comment_adressal: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=None)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


