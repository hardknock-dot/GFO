from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Self

class VisaCreate(BaseModel):
    country: str
    visa_type: str | None = None
    applied_on: date | None = None
    visa_start_date: date | None = None
    visa_end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.visa_start_date is not None and self.visa_end_date is not None:
            if self.visa_end_date < self.visa_start_date:
                raise ValueError("visa_end_date should not be earlier than visa_start_date")
        return self

class VisaUpdate(BaseModel):
    country: str | None = None
    visa_type: str | None = None
    applied_on: date | None = None
    visa_start_date: date | None = None
    visa_end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.visa_start_date is not None and self.visa_end_date is not None:
            if self.visa_end_date < self.visa_start_date:
                raise ValueError("visa_end_date should not be earlier than visa_start_date")
        return self

class VisaResponse(BaseModel):
    visa_id: UUID
    engineer_id: UUID
    owner_id: UUID | None = None
    country: str
    visa_type: str | None = None
    applied_on: date | None = None
    visa_start_date: date | None = None
    visa_end_date: date | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
