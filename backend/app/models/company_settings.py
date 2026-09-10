from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import Integer, Boolean, DateTime, ForeignKey, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class CompanySettings(Base):
    __tablename__ = "company_settings"

    setting_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Operational Thresholds
    visa_expiration_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    
    # Alert & Notification Settings (7 Channels)
    visa_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deployment_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    travel_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    leave_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    missed_schedule_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    operational_remark_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    performance_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    company = relationship("Company", backref="settings", lazy="joined")
