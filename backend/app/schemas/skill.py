from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Self

class SkillCreate(BaseModel):
    country: str | None = None
    fab: str | None = None
    wafer_size: str | None = None
    tool_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    number_of_tools: int | None = Field(None, ge=0)
    role: str | None = None
    previous_process_startup: bool | None = None
    previous_cm_pm: bool | None = None
    ready_for_primary_role: bool | None = None
    comments: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date should not be earlier than start_date")
        return self

class SkillUpdate(BaseModel):
    country: str | None = None
    fab: str | None = None
    wafer_size: str | None = None
    tool_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    number_of_tools: int | None = Field(None, ge=0)
    role: str | None = None
    previous_process_startup: bool | None = None
    previous_cm_pm: bool | None = None
    ready_for_primary_role: bool | None = None
    comments: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date should not be earlier than start_date")
        return self

class SkillResponse(BaseModel):
    skill_id: UUID
    engineer_id: UUID
    country: str | None = None
    fab: str | None = None
    wafer_size: str | None = None
    tool_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    number_of_tools: int | None = None
    role: str | None = None
    previous_process_startup: bool | None = None
    previous_cm_pm: bool | None = None
    ready_for_primary_role: bool | None = None
    comments: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
