import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.engineer_deletion_request import (
    EngineerDeletionRequestCreate,
    EngineerDeletionRequestReview,
    EngineerDeletionRequestResponse,
)
from app.services import engineer_deletion_request_service
from app.services.auth_service import get_current_user, enforce_company_isolation, enforce_write_permission, is_main_admin, is_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineer-deletion-requests", tags=["engineer-deletion-requests"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=EngineerDeletionRequestResponse, status_code=status.HTTP_201_CREATED)
def request_engineer_deletion(
    req_data: EngineerDeletionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit an engineer deletion request. Accessible to authorized users (Ops Executive, Manager, Main Admin).
    """
    enforce_write_permission(current_user)
    
    # Ensure company isolation for the target engineer
    from app.models.engineer import Engineer
    eng = db.get(Engineer, req_data.engineer_id)
    if not eng:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engineer not found.")
    
    enforce_company_isolation(db, current_user, eng.company_id)

    req = engineer_deletion_request_service.create_deletion_request(
        db=db,
        engineer_id=req_data.engineer_id,
        requested_by=current_user.user_id,
        company_id=eng.company_id,
        reason=req_data.reason
    )
    
    # Return formatted response
    res_list = engineer_deletion_request_service.get_deletion_requests(db, company_id=eng.company_id)
    target = next((r for r in res_list if r.request_id == req.request_id), None)
    if target:
        return target
    return EngineerDeletionRequestResponse.model_validate(req)

from app.schemas.pagination import PaginatedResponse

@router.get("", response_model=PaginatedResponse[EngineerDeletionRequestResponse])
def list_engineer_deletion_requests(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List engineer deletion requests. Scoped by company isolation.
    """
    target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
    validated_cids = enforce_company_isolation(db, current_user, target_cids)
    res = engineer_deletion_request_service.get_deletion_requests_paginated(
        db,
        company_id=validated_cids,
        status_filter=status_filter,
        page=page,
        page_size=page_size
    )
    return PaginatedResponse[EngineerDeletionRequestResponse](
        items=res["items"],
        page=res["page"],
        page_size=res["page_size"],
        total=res["total"],
        total_pages=res["total_pages"]
    )

@router.post("/{request_id}/approve", response_model=EngineerDeletionRequestResponse)
def approve_deletion_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve engineer deletion request. Requires Main Admin or Manager.
    """
    if not (is_main_admin(current_user) or is_manager(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can approve engineer deletion requests."
        )
    return engineer_deletion_request_service.approve_deletion_request(db, request_id, current_user)

@router.post("/{request_id}/reject", response_model=EngineerDeletionRequestResponse)
def reject_deletion_request(
    request_id: UUID,
    review_data: Optional[EngineerDeletionRequestReview] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject engineer deletion request. Requires Main Admin or Manager.
    """
    if not (is_main_admin(current_user) or is_manager(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can reject engineer deletion requests."
        )
    comment = review_data.review_comment if review_data else None
    return engineer_deletion_request_service.reject_deletion_request(db, request_id, current_user, comment)
