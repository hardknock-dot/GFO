from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class EngineerResponse(BaseModel):
    engineer_id: UUID
    engineer_name: str
    goes_by: str | None = None
    lam_id: str | None = None
    orbit_id: str
    level: str | None = None
    date_of_joining: date | None = None
    primary_tool_type: str | None = None
    lam_experience: float | None = None
    industry_experience: float | None = None
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
