from datetime import datetime
from typing import Optional
from uuid import UUID
import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class EngineerDeletionRequest(Base):
    __tablename__ = "engineer_deletion_requests"

    request_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid.uuid4)
    engineer_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id", ondelete="SET NULL"), nullable=True)
    requested_by: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    review_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
