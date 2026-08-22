import uuid
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.bulk_upload import BulkUpload
from app.models.company import Company
from app.models.user import User
from app.schemas.bulk_upload import BulkUploadResponse

def map_to_response(db: Session, upload: BulkUpload) -> BulkUploadResponse:
    comp = db.get(Company, upload.company_id)
    usr = db.get(User, upload.uploaded_by)
    
    return BulkUploadResponse(
        upload_id=upload.upload_id,
        company_id=upload.company_id,
        company_name=comp.company_name if comp else "Unknown Company",
        uploaded_by=upload.uploaded_by,
        uploaded_by_name=usr.full_name if usr else "Unknown User",
        file_name=upload.file_name,
        upload_type=upload.upload_type,
        total_rows=upload.total_rows,
        valid_rows=upload.valid_rows,
        error_rows=upload.error_rows,
        duplicate_rows=upload.duplicate_rows,
        existing_rows=upload.existing_rows,
        warning_rows=upload.warning_rows,
        imported_rows=upload.imported_rows,
        failed_rows=upload.failed_rows,
        status=upload.status,
        report_file=upload.report_file,
        created_at=upload.created_at,
        completed_at=upload.completed_at
    )

def create_bulk_upload(
    db: Session,
    company_id: UUID,
    uploaded_by: UUID,
    file_name: str,
    upload_type: str
) -> BulkUpload:
    db_upload = BulkUpload(
        upload_id=uuid.uuid4(),
        company_id=company_id,
        uploaded_by=uploaded_by,
        file_name=file_name,
        upload_type=upload_type,
        total_rows=0,
        valid_rows=0,
        error_rows=0,
        duplicate_rows=0,
        existing_rows=0,
        warning_rows=0,
        imported_rows=0,
        failed_rows=0,
        status="VALIDATING",
        created_at=datetime.utcnow()
    )
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)
    return db_upload

def update_bulk_upload(
    db: Session,
    upload_id: UUID,
    **kwargs
) -> Optional[BulkUpload]:
    db_upload = db.get(BulkUpload, upload_id)
    if not db_upload:
        return None
    for k, v in kwargs.items():
        if hasattr(db_upload, k):
            setattr(db_upload, k, v)
    if "status" in kwargs and kwargs["status"] in ("COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"):
        db_upload.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(db_upload)
    return db_upload

def get_bulk_upload_by_id(db: Session, upload_id: UUID) -> Optional[BulkUpload]:
    return db.get(BulkUpload, upload_id)

def get_bulk_uploads_history(
    db: Session,
    company_id: Optional[UUID] = None
) -> List[BulkUpload]:
    stmt = select(BulkUpload)
    if company_id is not None:
        stmt = stmt.where(BulkUpload.company_id == company_id)
    stmt = stmt.order_by(BulkUpload.created_at.desc())
    return list(db.scalars(stmt).all())
