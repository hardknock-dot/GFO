from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class PerformanceResponse(BaseModel):
    performance_id: UUID
    schedule_id: UUID
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
