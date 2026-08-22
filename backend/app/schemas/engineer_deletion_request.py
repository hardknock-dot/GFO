from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional

class EngineerDeletionRequestCreate(BaseModel):
    engineer_id: UUID
    reason: Optional[str] = None

class EngineerDeletionRequestReview(BaseModel):
    review_comment: Optional[str] = None

class EngineerDeletionRequestResponse(BaseModel):
    request_id: UUID
    engineer_id: UUID
    engineer_name: Optional[str] = None
    orbit_id: Optional[str] = None
    requested_by: UUID
    requested_by_name: Optional[str] = None
    company_id: UUID
    company_name: Optional[str] = None
    reason: Optional[str] = None
    status: str
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
