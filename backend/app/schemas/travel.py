from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

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
