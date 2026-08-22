from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from sqlalchemy import String, DateTime, Text, JSON, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    company_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    old_values: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
