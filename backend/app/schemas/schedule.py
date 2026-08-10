from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

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
