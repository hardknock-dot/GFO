from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import String, DateTime, Date, Numeric, UUID as SQLAlchemyUUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Engineer(Base):
    __tablename__ = "engineers"

    engineer_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, primary_key=True)
    company_id: Mapped[UUID] = mapped_column(SQLAlchemyUUID, nullable=False)
    engineer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    goes_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lam_id: Mapped[Optional[str]] = mapped_column("employee_id", String(50), nullable=True)
    orbit_id: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    date_of_joining: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    primary_tool_type: Mapped[Optional[str]] = mapped_column("primary_tool", String(100), nullable=True)
    lam_experience: Mapped[Optional[float]] = mapped_column("customer_experience", Numeric(4, 1), nullable=True)
    industry_experience: Mapped[Optional[float]] = mapped_column(Numeric(4, 1), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    @property
    def employee_id(self) -> Optional[str]:
        return self.lam_id

    @property
    def primary_tool(self) -> Optional[str]:
        return self.primary_tool_type

    @property
    def customer_experience(self) -> Optional[float]:
        if self.lam_experience is not None:
            return float(self.lam_experience)
        return None

    @property
    def current_schedule(self):
        from sqlalchemy.orm import object_session
        from app.models.schedule import Schedule
        from sqlalchemy import select, and_, or_
        from datetime import date
        
        session = object_session(self)
        if session is None:
            return None
            
        today = date.today()
        stmt = (
            select(Schedule)
            .where(
                and_(
                    Schedule.engineer_id == self.engineer_id,
                    Schedule.start_date <= today,
                    or_(
                        Schedule.end_date >= today,
                        Schedule.end_date.is_(None)
                    )
                )
            )
            .order_by(Schedule.start_date.desc())
            .limit(1)
        )
        return session.scalars(stmt).first()

    @property
    def country(self) -> str:
        current = self.current_schedule
        if current and current.country:
            return current.country
        return "No Schedule"

    @property
    def city(self) -> str:
        current = self.current_schedule
        if current and current.fab_city:
            return current.fab_city
        return "No Schedule"

    @property
    def assigned_site(self) -> str:
        current = self.current_schedule
        if current and current.fab_site:
            return current.fab_site
        return "No Schedule"
