from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class LeaveResponse(BaseModel):
    leave_id: UUID
    engineer_id: UUID
    owner_id: UUID | None = None
    leave_type: str | None = None
    requested_date: date | None = None
    requested_on: date | None = None
    approval_status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
