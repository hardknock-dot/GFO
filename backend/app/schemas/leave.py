from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Self

class LeaveCreate(BaseModel):
    leave_type: str | None = None
    requested_date: date | None = None
    requested_on: date | None = None
    approval_status: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.requested_on is not None and self.requested_date is not None:
            if self.requested_on > self.requested_date:
                raise ValueError("requested_on date cannot be later than requested_date")
        return self

class LeaveUpdate(BaseModel):
    leave_type: str | None = None
    requested_date: date | None = None
    requested_on: date | None = None
    approval_status: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.requested_on is not None and self.requested_date is not None:
            if self.requested_on > self.requested_date:
                raise ValueError("requested_on date cannot be later than requested_date")
        return self

class LeaveResponse(BaseModel):
    leave_id: UUID
    engineer_id: UUID
    engineer_name: str | None = None
    orbit_id: str | None = None
    owner_id: UUID | None = None
    leave_type: str | None = None
    requested_date: date | None = None
    requested_on: date | None = None
    approval_status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
