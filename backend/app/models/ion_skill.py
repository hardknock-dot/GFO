from datetime import date, datetime
from typing import Optional, List
from uuid import UUID, uuid4
from sqlalchemy import String, Integer, Boolean, Date, DateTime, Text, ForeignKey, UniqueConstraint, CheckConstraint, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class IonSkillTool(Base):
    __tablename__ = "ion_skill_tools"

    tool_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid4)
    tool_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class IonSkillExperience(Base):
    __tablename__ = "ion_skill_experiences"

    experience_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid4)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id", ondelete="CASCADE"), nullable=False)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False)
    where_location: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    engineer = relationship("Engineer", foreign_keys=[engineer_id], lazy="joined")
    assessments = relationship("IonSkillAssessment", back_populates="experience", cascade="all, delete-orphan", lazy="selectin")


class IonSkillAssessment(Base):
    __tablename__ = "ion_skill_assessments"

    assessment_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True, default=uuid4)
    experience_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("ion_skill_experiences.experience_id", ondelete="CASCADE"), nullable=False)
    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("engineers.engineer_id", ondelete="CASCADE"), nullable=False)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False)
    tool_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, ForeignKey("ion_skill_tools.tool_id", ondelete="RESTRICT"), nullable=False)
    skill_level: Mapped[int] = mapped_column(Integer, nullable=False)
    assessment_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("experience_id", "tool_id", name="ion_skill_assessments_unique_tool_per_experience"),
        CheckConstraint("skill_level >= 1 AND skill_level <= 4", name="ion_skill_assessments_level_check"),
    )

    experience = relationship("IonSkillExperience", back_populates="assessments")
    tool = relationship("IonSkillTool", foreign_keys=[tool_id], lazy="joined")
    engineer = relationship("Engineer", foreign_keys=[engineer_id])
