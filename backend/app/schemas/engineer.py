from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator
from decimal import Decimal
import re

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_val(v: str | None) -> str | None:
    if v is None:
        return None
    v_stripped = v.strip()
    if not v_stripped:
        return None
    if not EMAIL_REGEX.match(v_stripped):
        raise ValueError("Invalid email format")
    return v_stripped

def validate_phone_val(v: str | None) -> str | None:
    if v is None:
        return None
    v_stripped = v.strip()
    if not v_stripped:
        return None
    if len(v_stripped) > 30:
        raise ValueError("Phone number must not exceed 30 characters")
    if not re.match(r"^[+\d\s().-]{3,30}$", v_stripped):
        raise ValueError("Invalid phone number format")
    return v_stripped

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
    email: str | None = None
    phone_number: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return validate_email_val(v)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v):
        return validate_phone_val(v)

class EngineerUpdate(BaseModel):
    company_id: UUID | None = None
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
    email: str | None = None
    phone_number: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return validate_email_val(v)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v):
        return validate_phone_val(v)

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
    email: str | None = None
    phone_number: str | None = None
    country: str | None = None
    city: str | None = None
    assigned_site: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
