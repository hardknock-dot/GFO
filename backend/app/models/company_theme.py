import uuid
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, DateTime, UUID as SQLAlchemyUUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class CompanyThemeSettings(Base):
    __tablename__ = "company_theme_settings"

    company_theme_id: Mapped[UUID] = mapped_column(
        SQLAlchemyUUID, primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[UUID] = mapped_column(
        SQLAlchemyUUID, ForeignKey("companies.company_id"), nullable=False, unique=True
    )
    theme_key: Mapped[str] = mapped_column(
        String(50), nullable=False, default="default"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
