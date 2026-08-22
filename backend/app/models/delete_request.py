from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, DateTime, Text, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class DeleteRequest(Base):
    __tablename__ = "delete_requests"

    request_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    requested_by: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    review_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
