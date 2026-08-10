from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Leave(Base):
    __tablename__ = "leaves"

    leave_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    leave_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    requested_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    requested_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approval_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
