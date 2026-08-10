from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Integer, Boolean, Date, DateTime, Text, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Skill(Base):
    __tablename__ = "skills"

    skill_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fab: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    wafer_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tool_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    number_of_tools: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    previous_process_startup: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    previous_cm_pm: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ready_for_primary_role: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
