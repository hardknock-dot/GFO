import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.delete_request import (
    DeleteRequestCreate,
    DeleteRequestReview,
    DeleteRequestResponse,
)
from app.services import delete_request_service
from app.services.auth_service import (
    get_current_user,
    enforce_company_isolation,
    enforce_write_permission,
    is_main_admin,
    is_manager,
    is_viewer,
    is_engineer_user
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delete-requests", tags=["delete-requests"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=DeleteRequestResponse, status_code=status.HTTP_201_CREATED)
def create_delete_request(
    req_data: DeleteRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a delete request for Manager/Admin review.
    ONLY Ops Executive role can submit delete requests.
    """
    if current_user.role != "Ops Executive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Ops Executive role can submit delete requests."
        )

    req = delete_request_service.create_delete_request(
        db=db,
        user=current_user,
        entity_type=req_data.entity_type,
        entity_id=req_data.entity_id,
        reason=req_data.reason
    )
    
    res_list = delete_request_service.get_delete_requests(db, company_ids=[req.company_id] if req.company_id else None)
    target = next((r for r in res_list if r["request_id"] == req.request_id), None)
    if target:
        return target
    return DeleteRequestResponse.model_validate(req)

from app.schemas.pagination import PaginatedResponse

@router.get("", response_model=PaginatedResponse[DeleteRequestResponse])
def list_delete_requests(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List delete requests.
    - Main Admin gets delete requests across all companies.
    - Manager and Ops Executive get delete requests for their specified company / user_companies.
    """
    if is_viewer(current_user) or is_engineer_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Access denied to delete requests."
        )

    target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
    validated_cids = enforce_company_isolation(db, current_user, target_cids)
    res = delete_request_service.get_delete_requests_paginated(
        db,
        company_ids=validated_cids,
        status_filter=status_filter,
        page=page,
        page_size=page_size
    )
    return PaginatedResponse[DeleteRequestResponse](
        items=[DeleteRequestResponse.model_validate(item) for item in res["items"]],
        page=res["page"],
        page_size=res["page_size"],
        total=res["total"],
        total_pages=res["total_pages"]
    )

@router.post("/{request_id}/approve", response_model=DeleteRequestResponse)
def approve_delete_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve delete request. Requires Main Admin or Manager (for authorized company).
    Ops Executive CANNOT approve.
    """
    if not (is_main_admin(current_user) or is_manager(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can approve delete requests."
        )
    return delete_request_service.approve_delete_request(db, request_id, current_user)

@router.post("/{request_id}/reject", response_model=DeleteRequestResponse)
def reject_delete_request(
    request_id: UUID,
    review_data: Optional[DeleteRequestReview] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject delete request. Requires Main Admin or Manager (for authorized company).
    Ops Executive CANNOT reject.
    """
    if not (is_main_admin(current_user) or is_manager(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can reject delete requests."
        )
    comment = review_data.review_comment if review_data else None
    return delete_request_service.reject_delete_request(db, request_id, current_user, comment)
