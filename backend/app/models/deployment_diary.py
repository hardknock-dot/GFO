from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import Date, DateTime, Text, UUID as SQLAlchemyUUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class DeploymentDiary(Base):
    __tablename__ = "deployment_diary"

    id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id"), nullable=False)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id"), nullable=False)
    schedule_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("schedules.schedule_id"), nullable=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    entry: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
