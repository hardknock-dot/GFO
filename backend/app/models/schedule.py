from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Date, DateTime, Text, ForeignKey, Boolean, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    schedule_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    senior_engineer_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id", ondelete="SET NULL"), nullable=True)
    owner_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    senior_engineer = relationship("Engineer", foreign_keys=[senior_engineer_id], lazy="selectin")

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

    @property
    def senior_engineer_name(self) -> Optional[str]:
        if hasattr(self, "_senior_engineer_name") and self._senior_engineer_name is not None:
            return self._senior_engineer_name
        return self.senior_engineer.engineer_name if self.senior_engineer else None

    @property
    def senior_engineer_orbit_id(self) -> Optional[str]:
        if hasattr(self, "_senior_engineer_orbit_id") and self._senior_engineer_orbit_id is not None:
            return self._senior_engineer_orbit_id
        return self.senior_engineer.orbit_id if self.senior_engineer else None

    @property
    def senior_engineer_goes_by(self) -> Optional[str]:
        if hasattr(self, "_senior_engineer_goes_by") and self._senior_engineer_goes_by is not None:
            return self._senior_engineer_goes_by
        return self.senior_engineer.goes_by if self.senior_engineer else None



