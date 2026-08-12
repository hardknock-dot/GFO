from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Self

class ScheduleCreate(BaseModel):
    support_type: str
    country: str
    fab_city: str | None = None
    fab_site: str | None = None
    start_date: date
    end_date: date | None = None
    schedule_status: str | None = "Upcoming"
    remarks: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date should not be earlier than start_date")
        return self

class ScheduleUpdate(BaseModel):
    support_type: str | None = None
    country: str | None = None
    fab_city: str | None = None
    fab_site: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    schedule_status: str | None = None
    remarks: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date should not be earlier than start_date")
        return self

class ScheduleResponse(BaseModel):
    schedule_id: UUID
    engineer_id: UUID
    support_type: str
    country: str
    fab_city: str | None = None
    fab_site: str | None = None
    start_date: date
    end_date: date | None = None
    schedule_status: str | None = None
    remarks: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
