from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional

class EngineerStatusChangeRequestCreate(BaseModel):
    engineer_id: UUID
    requested_status: str  # 'Resigned' or 'Terminated'
    reason: Optional[str] = None

class EngineerStatusChangeRequestReview(BaseModel):
    review_comment: Optional[str] = None

class EngineerStatusChangeRequestResponse(BaseModel):
    request_id: UUID
    engineer_id: Optional[UUID] = None
    engineer_name: Optional[str] = None
    orbit_id: Optional[str] = None
    requested_by: UUID
    requested_by_name: Optional[str] = None
    company_id: UUID
    company_name: Optional[str] = None
    current_status: str
    requested_status: str
    reason: Optional[str] = None
    status: str  # PENDING, APPROVED, REJECTED
    reviewed_by: Optional[UUID] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
