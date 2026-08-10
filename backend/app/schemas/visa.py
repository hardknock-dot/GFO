from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

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
