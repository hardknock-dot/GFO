from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import ForeignKey, DateTime, UUID as SQLAlchemyUUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class UserCompany(Base):
    __tablename__ = "user_companies"

    user_company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_user_company"),
    )
