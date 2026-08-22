from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class BulkUploadResponse(BaseModel):
    upload_id: UUID
    company_id: UUID
    company_name: str
    uploaded_by: UUID
    uploaded_by_name: str
    file_name: str
    upload_type: str
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_rows: int
    existing_rows: int
    warning_rows: int
    imported_rows: int
    failed_rows: int
    status: str
    report_file: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
