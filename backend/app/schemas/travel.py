from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator
from typing import Self

class TravelCreate(BaseModel):
    booking_date: date | None = None
    travel_date: date | None = None
    purpose: str | None = None
    comments: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.booking_date is not None and self.travel_date is not None:
            if self.travel_date < self.booking_date:
                raise ValueError("travel_date should not be earlier than booking_date")
        return self

class TravelUpdate(BaseModel):
    booking_date: date | None = None
    travel_date: date | None = None
    purpose: str | None = None
    comments: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.booking_date is not None and self.travel_date is not None:
            if self.travel_date < self.booking_date:
                raise ValueError("travel_date should not be earlier than booking_date")
        return self

class TravelResponse(BaseModel):
    travel_id: UUID
    schedule_id: UUID
    owner_id: UUID | None = None
    booking_date: date | None = None
    travel_date: date | None = None
    purpose: str | None = None
    comments: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
