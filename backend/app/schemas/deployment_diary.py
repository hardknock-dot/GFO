from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class DeploymentDiaryCreate(BaseModel):
    entry_date: date = Field(default_factory=date.today)
    entry: str = Field(..., min_length=1, description="Diary entry text")
    schedule_id: Optional[UUID] = None
    engineer_id: Optional[UUID] = None  # Optional for admin override, ignored for Engineer role

class DeploymentDiaryUpdate(BaseModel):
    entry_date: Optional[date] = None
    entry: Optional[str] = None
    schedule_id: Optional[UUID] = None

class DeploymentDiaryResponse(BaseModel):
    id: UUID
    engineer_id: UUID
    company_id: UUID
    schedule_id: Optional[UUID] = None
    entry_date: date
    entry: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Enriched schedule & engineer details for frontend display
    fab_site: Optional[str] = None
    fab_city: Optional[str] = None
    country: Optional[str] = None
    support_type: Optional[str] = None
    engineer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
