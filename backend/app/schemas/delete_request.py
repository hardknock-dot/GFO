from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class DeleteRequestCreate(BaseModel):
    entity_type: str
    entity_id: UUID
    reason: str

class DeleteRequestReview(BaseModel):
    review_comment: Optional[str] = None

class DeleteRequestResponse(BaseModel):
    request_id: UUID
    requested_by: UUID
    requested_by_name: Optional[str] = None
    company_id: UUID
    company_name: Optional[str] = None
    entity_type: str
    entity_id: UUID
    entity_name: Optional[str] = None
    reason: str
    status: str
    reviewed_by: Optional[UUID] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
