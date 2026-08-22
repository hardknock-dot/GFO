from datetime import datetime
from typing import Optional
from uuid import UUID
import uuid as uuid_pkg
from sqlalchemy import String, DateTime, Integer, Text, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class BulkUpload(Base):
    __tablename__ = "bulk_uploads"

    upload_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid_pkg.uuid4)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    uploaded_by: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    upload_type: Mapped[str] = mapped_column(String, nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    existing_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warning_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    report_file: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
