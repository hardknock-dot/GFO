from datetime import date, datetime
from uuid import UUID
from typing import Self, Any
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

class MissedScheduleCreate(BaseModel):
    requested_start_date: date | None = None
    requested_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    reason: str | None = None
    evidence: str | None = None
    delay_reason: str | None = None
    delay_responsible: str | None = None
    delay_comment: str | None = None

    @field_validator("delay_responsible", mode="before")
    @classmethod
    def validate_delay_responsible(cls, v: Any) -> str | None:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        if v not in ("Engineer", "Operations Team"):
            raise ValueError("delay_responsible must be 'Engineer', 'Operations Team', or NULL")
        return v

    @model_validator(mode="after")
    def validate_date_ranges(self) -> Self:
        if self.requested_start_date is not None and self.requested_end_date is not None:
            if self.requested_end_date < self.requested_start_date:
                raise ValueError("requested_end_date cannot be earlier than requested_start_date")
        if self.actual_start_date is not None and self.actual_end_date is not None:
            if self.actual_end_date < self.actual_start_date:
                raise ValueError("actual_end_date cannot be earlier than actual_start_date")
        return self

class MissedScheduleUpdate(BaseModel):
    requested_start_date: date | None = None
    requested_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    reason: str | None = None
    evidence: str | None = None
    delay_reason: str | None = None
    delay_responsible: str | None = None
    delay_comment: str | None = None

    @field_validator("delay_responsible", mode="before")
    @classmethod
    def validate_delay_responsible(cls, v: Any) -> str | None:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        if v not in ("Engineer", "Operations Team"):
            raise ValueError("delay_responsible must be 'Engineer', 'Operations Team', or NULL")
        return v

    @model_validator(mode="after")
    def validate_date_ranges(self) -> Self:
        if self.requested_start_date is not None and self.requested_end_date is not None:
            if self.requested_end_date < self.requested_start_date:
                raise ValueError("requested_end_date cannot be earlier than requested_start_date")
        if self.actual_start_date is not None and self.actual_end_date is not None:
            if self.actual_end_date < self.actual_start_date:
                raise ValueError("actual_end_date cannot be earlier than actual_start_date")
        return self

class MissedScheduleResponse(BaseModel):
    missed_schedule_id: UUID
    schedule_id: UUID
    engineer_id: UUID | None = None
    engineer_name: str | None = None
    orbit_id: str | None = None
    owner_id: UUID | None = None
    requested_start_date: date | None = None
    requested_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    reason: str | None = None
    evidence: str | None = None
    delay_reason: str | None = None
    delay_responsible: str | None = None
    delay_comment: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
