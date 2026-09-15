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
    color_1: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    color_2: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    color_3: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    color_4: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    color_5: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    primary_hover: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    accent_soft: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    dark_neutral: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    border_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Convenience properties mapping colors to design system tokens
    @property
    def primary_color(self) -> Optional[str]:
        return self.color_1

    @primary_color.setter
    def primary_color(self, val: Optional[str]):
        self.color_1 = val

    @property
    def secondary_color(self) -> Optional[str]:
        return self.color_2

    @secondary_color.setter
    def secondary_color(self, val: Optional[str]):
        self.color_2 = val

    @property
    def accent_color(self) -> Optional[str]:
        return self.color_3

    @accent_color.setter
    def accent_color(self, val: Optional[str]):
        self.color_3 = val

    @property
    def background_color(self) -> Optional[str]:
        return self.color_4

    @background_color.setter
    def background_color(self, val: Optional[str]):
        self.color_4 = val

    @property
    def surface_color(self) -> Optional[str]:
        return self.color_4

    @surface_color.setter
    def surface_color(self, val: Optional[str]):
        self.color_4 = val

    @property
    def text_color(self) -> Optional[str]:
        return self.color_5

    @text_color.setter
    def text_color(self, val: Optional[str]):
        self.color_5 = val
