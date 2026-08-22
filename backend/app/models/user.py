from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, Boolean, DateTime, ForeignKey, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    engineer_id: Mapped[Optional[UUID]] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    user_companies = relationship("UserCompany", cascade="all, delete-orphan", lazy="selectin")


