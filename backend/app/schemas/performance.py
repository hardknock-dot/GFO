from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Self

class PerformanceCreate(BaseModel):
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    escalation: bool | None = None
    escalation_reason: str | None = None
    feedback: str | None = None
    score: float | None = Field(None, ge=1.0, le=5.0)
    attachment: str | None = None

    @model_validator(mode="after")
    def validate_dates_and_escalation(self) -> Self:
        if self.actual_start_date is not None and self.actual_end_date is not None:
            if self.actual_end_date < self.actual_start_date:
                raise ValueError("actual_end_date should not be earlier than actual_start_date")
        if self.escalation is True and not self.escalation_reason:
            raise ValueError("Escalation reason is required when escalation is enabled.")
        return self

class PerformanceUpdate(BaseModel):
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    escalation: bool | None = None
    escalation_reason: str | None = None
    feedback: str | None = None
    score: float | None = Field(None, ge=1.0, le=5.0)
    attachment: str | None = None

    @model_validator(mode="after")
    def validate_dates_and_escalation(self) -> Self:
        if self.actual_start_date is not None and self.actual_end_date is not None:
            if self.actual_end_date < self.actual_start_date:
                raise ValueError("actual_end_date should not be earlier than actual_start_date")
        if self.escalation is True and not self.escalation_reason:
            raise ValueError("Escalation reason is required when escalation is enabled.")
        return self

class PerformanceResponse(BaseModel):
    performance_id: UUID
    schedule_id: UUID
    engineer_id: UUID | None = None
    engineer_name: str | None = None
    orbit_id: str | None = None
    owner_id: UUID | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    escalation: bool | None = None
    escalation_reason: str | None = None
    feedback: str | None = None
    score: float | None = None
    attachment: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
