import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.schemas.visa import VisaResponse, VisaUpdate, VisaCommentStatusUpdate
from app.services import visa_service
from app.services.auth_service import get_current_user, get_visa_and_verify, enforce_write_permission, enforce_delete_permission, is_engineer_user
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

from typing import Optional, List
from fastapi import Query
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import enforce_company_isolation

router = APIRouter(prefix="/visa", tags=["visa"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[VisaResponse])
def read_visas(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    owner_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    comment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated visa records with tenant isolation and optional filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = visa_service.get_visa_paginated(
            db=db,
            company_id=validated_cids,
            engineer_id=engineer_id,
            owner_id=owner_id,
            search=search,
            comment_status=comment_status,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[VisaResponse](
            items=[VisaResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving visa records: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve visa records from database"
        )

@router.put("/{visa_id}", response_model=VisaResponse)
def update_existing_visa(
    visa_id: UUID,
    visa_data: VisaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        visa = get_visa_and_verify(db, visa_id, current_user)
        old_dict = object_to_dict(visa)
        updated_visa = visa_service.update_visa(db, visa_id, visa_data)
        
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="Visa",
            entity_id=visa_id,
            description=f"Visa updated ({visa_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated_visa)
        )
        return updated_visa
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating visa %s: %s", str(visa_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update visa record in database"
        )

@router.delete("/{visa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_visa(
    visa_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        visa = get_visa_and_verify(db, visa_id, current_user)
        old_dict = object_to_dict(visa)
        
        visa_service.delete_visa(db, visa_id)
        
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Visa",
            entity_id=visa_id,
            description=f"Visa deleted ({visa_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting visa %s: %s", str(visa_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete visa details from database"
        )

@router.patch("/{visa_id}/comments/status", response_model=VisaResponse)
def update_visa_comment_status(
    visa_id: UUID,
    payload: VisaCommentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if is_engineer_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Engineers cannot mark comments as addressed."
        )
    enforce_write_permission(current_user)
    visa = get_visa_and_verify(db, visa_id, current_user)
    visa.comment_status = payload.comment_status
    visa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(visa)
    return visa
