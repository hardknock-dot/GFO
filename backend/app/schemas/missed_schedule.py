from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class MissedScheduleResponse(BaseModel):
    missed_schedule_id: UUID
    schedule_id: UUID
    owner_id: UUID | None = None
    requested_start_date: date | None = None
    requested_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    reason: str | None = None
    evidence: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
