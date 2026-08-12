from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from decimal import Decimal

class EngineerCreate(BaseModel):
    company_id: UUID
    engineer_name: str
    goes_by: str | None = None
    employee_id: str | None = None
    orbit_id: str
    level: str | None = None
    date_of_joining: date | None = None
    primary_tool: str | None = None
    customer_experience: Decimal | None = None
    industry_experience: Decimal | None = None
    status: str | None = None

class EngineerUpdate(BaseModel):
    engineer_name: str | None = None
    goes_by: str | None = None
    employee_id: str | None = None
    orbit_id: str | None = None
    level: str | None = None
    date_of_joining: date | None = None
    primary_tool: str | None = None
    customer_experience: Decimal | None = None
    industry_experience: Decimal | None = None
    status: str | None = None

class EngineerResponse(BaseModel):
    engineer_id: UUID
    company_id: UUID
    engineer_name: str
    goes_by: str | None = None
    employee_id: str | None = None
    lam_id: str | None = None
    orbit_id: str
    level: str | None = None
    date_of_joining: date | None = None
    primary_tool: str | None = None
    primary_tool_type: str | None = None
    customer_experience: float | None = None
    lam_experience: float | None = None
    industry_experience: float | None = None
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
