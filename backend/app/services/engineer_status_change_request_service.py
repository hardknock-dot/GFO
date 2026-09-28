from datetime import datetime
from typing import List, Optional, Union, Dict, Any
from uuid import UUID
import uuid
import math
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status

from app.models.engineer_status_change_request import EngineerStatusChangeRequest
from app.models.engineer import Engineer
from app.models.company import Company
from app.models.user import User
from app.schemas.engineer_status_change_request import EngineerStatusChangeRequestResponse
from app.services.audit_service import log_audit

ALLOWED_REQUESTED_STATUSES = {"Resigned", "Terminated", "Resigned / Terminated", "Resigned/Terminated"}

def create_status_change_request(
    db: Session,
    engineer_id: UUID,
    requested_by: UUID,
    company_id: UUID,
    requested_status: str,
    reason: Optional[str] = None
) -> EngineerStatusChangeRequest:
    eng = db.get(Engineer, engineer_id)
    if eng is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    clean_req_status = requested_status.strip()
    if clean_req_status not in ALLOWED_REQUESTED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid requested status '{requested_status}'. Only 'Resigned' or 'Terminated' are allowed."
        )

    # Check for existing PENDING status change request for this engineer
    existing = db.scalar(
        select(EngineerStatusChangeRequest).where(
            and_(
                EngineerStatusChangeRequest.engineer_id == engineer_id,
                EngineerStatusChangeRequest.status == "PENDING"
            )
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An engineer status change request is already pending for this engineer."
        )

    req = EngineerStatusChangeRequest(
        request_id=uuid.uuid4(),
        engineer_id=engineer_id,
        requested_by=requested_by,
        company_id=company_id,
        current_status=eng.status,
        requested_status=clean_req_status,
        reason=reason,
        status="PENDING",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(req)

    log_audit(
        db=db,
        user_id=requested_by,
        company_id=company_id,
        action="STATUS_CHANGE_REQUEST_CREATED",
        entity_type="EngineerStatusChangeRequest",
        entity_id=req.request_id,
        description=f"Status change requested for {eng.engineer_name}: {eng.status} -> {clean_req_status}"
    )

    db.commit()
    db.refresh(req)
    return req

def get_status_change_requests_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(EngineerStatusChangeRequest)
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            stmt = stmt.where(EngineerStatusChangeRequest.company_id.in_(company_id))
        else:
            stmt = stmt.where(EngineerStatusChangeRequest.company_id == company_id)
    if status_filter:
        stmt = stmt.where(EngineerStatusChangeRequest.status == status_filter)
    
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size

    stmt = stmt.order_by(EngineerStatusChangeRequest.created_at.desc()).offset(offset).limit(page_size)
    records = list(db.scalars(stmt).all())

    items = []
    for r in records:
        eng = db.get(Engineer, r.engineer_id) if r.engineer_id else None
        usr = db.get(User, r.requested_by)
        rev_usr = db.get(User, r.reviewed_by) if r.reviewed_by else None
        comp = db.get(Company, r.company_id)
        
        items.append(EngineerStatusChangeRequestResponse(
            request_id=r.request_id,
            engineer_id=r.engineer_id,
            engineer_name=eng.engineer_name if eng else "Unknown Engineer",
            orbit_id=eng.orbit_id if eng else "N/A",
            requested_by=r.requested_by,
            requested_by_name=usr.full_name if usr else "Unknown User",
            company_id=r.company_id,
            company_name=comp.company_name if comp else "Unknown Company",
            current_status=r.current_status,
            requested_status=r.requested_status,
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewed_by_name=rev_usr.full_name if rev_usr else None,
            reviewed_at=r.reviewed_at,
            review_comment=r.review_comment,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_status_change_requests(
    db: Session,
    company_id: Optional[UUID] = None,
    status_filter: Optional[str] = None
) -> List[EngineerStatusChangeRequestResponse]:
    stmt = select(EngineerStatusChangeRequest)
    if company_id:
        stmt = stmt.where(EngineerStatusChangeRequest.company_id == company_id)
    if status_filter:
        stmt = stmt.where(EngineerStatusChangeRequest.status == status_filter)
    
    stmt = stmt.order_by(EngineerStatusChangeRequest.created_at.desc())
    records = list(db.scalars(stmt).all())

    result = []
    for r in records:
        eng = db.get(Engineer, r.engineer_id) if r.engineer_id else None
        usr = db.get(User, r.requested_by)
        rev_usr = db.get(User, r.reviewed_by) if r.reviewed_by else None
        comp = db.get(Company, r.company_id)
        
        result.append(EngineerStatusChangeRequestResponse(
            request_id=r.request_id,
            engineer_id=r.engineer_id,
            engineer_name=eng.engineer_name if eng else "Unknown Engineer",
            orbit_id=eng.orbit_id if eng else "N/A",
            requested_by=r.requested_by,
            requested_by_name=usr.full_name if usr else "Unknown User",
            company_id=r.company_id,
            company_name=comp.company_name if comp else "Unknown Company",
            current_status=r.current_status,
            requested_status=r.requested_status,
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewed_by_name=rev_usr.full_name if rev_usr else None,
            reviewed_at=r.reviewed_at,
            review_comment=r.review_comment,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return result

def approve_status_change_request(
    db: Session,
    request_id: UUID,
    reviewer: User
) -> EngineerStatusChangeRequestResponse:
    from app.services.auth_service import is_main_admin, is_manager, enforce_company_isolation
    if not (is_main_admin(reviewer) or is_manager(reviewer)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can approve status change requests."
        )

    req = db.get(EngineerStatusChangeRequest, request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status change request not found."
        )

    enforce_company_isolation(db, reviewer, req.company_id)

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve request with status '{req.status}'."
        )

    # Check requester vs reviewer
    if req.requested_by == reviewer.user_id and not is_main_admin(reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Users cannot approve their own status change requests."
        )

    eng = db.get(Engineer, req.engineer_id) if req.engineer_id else None
    if not eng:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target engineer record no longer exists."
        )

    # Stale request protection: verify engineer status has not changed in the interim
    if eng.status != req.current_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Stale request: Engineer status has changed from '{req.current_status}' to '{eng.status}' since this request was created."
        )

    old_status = eng.status
    target_status = req.requested_status

    # Update engineer status atomically
    eng.status = target_status
    eng.updated_at = datetime.utcnow()

    # Update request record
    req.status = "APPROVED"
    req.reviewed_by = reviewer.user_id
    req.reviewed_at = datetime.utcnow()
    req.updated_at = datetime.utcnow()

    log_audit(
        db=db,
        user_id=reviewer.user_id,
        company_id=req.company_id,
        action="STATUS_CHANGE_REQUEST_APPROVED",
        entity_type="EngineerStatusChangeRequest",
        entity_id=req.request_id,
        description=f"Approved status change for {eng.engineer_name} from {old_status} to {target_status}"
    )

    db.commit()
    db.refresh(req)
    db.refresh(eng)

    usr = db.get(User, req.requested_by)
    comp = db.get(Company, req.company_id)

    return EngineerStatusChangeRequestResponse(
        request_id=req.request_id,
        engineer_id=eng.engineer_id,
        engineer_name=eng.engineer_name,
        orbit_id=eng.orbit_id,
        requested_by=req.requested_by,
        requested_by_name=usr.full_name if usr else "Unknown User",
        company_id=req.company_id,
        company_name=comp.company_name if comp else "Unknown Company",
        current_status=req.current_status,
        requested_status=req.requested_status,
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_by_name=reviewer.full_name,
        reviewed_at=req.reviewed_at,
        review_comment=req.review_comment,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

def reject_status_change_request(
    db: Session,
    request_id: UUID,
    reviewer: User,
    review_comment: Optional[str] = None
) -> EngineerStatusChangeRequestResponse:
    from app.services.auth_service import is_main_admin, is_manager, enforce_company_isolation
    if not (is_main_admin(reviewer) or is_manager(reviewer)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can reject status change requests."
        )

    req = db.get(EngineerStatusChangeRequest, request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status change request not found."
        )

    enforce_company_isolation(db, reviewer, req.company_id)

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject request with status '{req.status}'."
        )

    req.status = "REJECTED"
    req.reviewed_by = reviewer.user_id
    req.reviewed_at = datetime.utcnow()
    req.review_comment = review_comment
    req.updated_at = datetime.utcnow()

    log_audit(
        db=db,
        user_id=reviewer.user_id,
        company_id=req.company_id,
        action="STATUS_CHANGE_REQUEST_REJECTED",
        entity_type="EngineerStatusChangeRequest",
        entity_id=req.request_id,
        description=f"Rejected status change request for engineer ID {req.engineer_id}"
    )

    db.commit()
    db.refresh(req)

    eng = db.get(Engineer, req.engineer_id) if req.engineer_id else None
    usr = db.get(User, req.requested_by)
    comp = db.get(Company, req.company_id)

    return EngineerStatusChangeRequestResponse(
        request_id=req.request_id,
        engineer_id=req.engineer_id,
        engineer_name=eng.engineer_name if eng else "Unknown Engineer",
        orbit_id=eng.orbit_id if eng else "N/A",
        requested_by=req.requested_by,
        requested_by_name=usr.full_name if usr else "Unknown User",
        company_id=req.company_id,
        company_name=comp.company_name if comp else "Unknown Company",
        current_status=req.current_status,
        requested_status=req.requested_status,
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_by_name=reviewer.full_name,
        reviewed_at=req.reviewed_at,
        review_comment=req.review_comment,
        created_at=req.created_at,
        updated_at=req.updated_at
    )
