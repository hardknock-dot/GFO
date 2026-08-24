from datetime import datetime
from typing import List, Optional
from uuid import UUID
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status

from app.models.engineer_deletion_request import EngineerDeletionRequest
from app.models.engineer import Engineer
from app.models.company import Company
from app.models.user import User
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.leave import Leave
from app.schemas.engineer_deletion_request import EngineerDeletionRequestResponse

def has_engineer_child_records(db: Session, engineer_id: UUID) -> bool:
    """
    Check whether an engineer has active child records in skills, schedules, visa_details, or leaves.
    """
    sk_count = db.scalar(select(Skill).where(Skill.engineer_id == engineer_id).limit(1))
    if sk_count is not None:
        return True
    sch_count = db.scalar(select(Schedule).where(Schedule.engineer_id == engineer_id).limit(1))
    if sch_count is not None:
        return True
    v_count = db.scalar(select(Visa).where(Visa.engineer_id == engineer_id).limit(1))
    if v_count is not None:
        return True
    lv_count = db.scalar(select(Leave).where(Leave.engineer_id == engineer_id).limit(1))
    if lv_count is not None:
        return True
    return False

def create_deletion_request(
    db: Session,
    engineer_id: UUID,
    requested_by: UUID,
    company_id: UUID,
    reason: Optional[str] = None
) -> EngineerDeletionRequest:
    eng = db.get(Engineer, engineer_id)
    if eng is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # Check for existing PENDING request
    existing = db.scalar(
        select(EngineerDeletionRequest).where(
            and_(
                EngineerDeletionRequest.engineer_id == engineer_id,
                EngineerDeletionRequest.status == "PENDING"
            )
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An engineer deletion request is already pending."
        )

    req = EngineerDeletionRequest(
        request_id=uuid.uuid4(),
        engineer_id=engineer_id,
        requested_by=requested_by,
        company_id=company_id,
        reason=reason,
        status="PENDING",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(req)

    # ALSO sync to unified delete_requests table so it appears in /delete-requests page
    from app.models.delete_request import DeleteRequest
    existing_unified = db.scalar(
        select(DeleteRequest).where(
            and_(
                DeleteRequest.entity_type == "Engineer",
                DeleteRequest.entity_id == engineer_id,
                DeleteRequest.status == "PENDING"
            )
        )
    )
    if not existing_unified:
        unified_req = DeleteRequest(
            request_id=req.request_id,
            requested_by=requested_by,
            company_id=company_id,
            entity_type="Engineer",
            entity_id=engineer_id,
            reason=reason or "Engineer deletion requested",
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(unified_req)

    db.commit()
    db.refresh(req)
    return req

def get_deletion_requests_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    import math
    stmt = select(EngineerDeletionRequest)
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            stmt = stmt.where(EngineerDeletionRequest.company_id.in_(company_id))
        else:
            stmt = stmt.where(EngineerDeletionRequest.company_id == company_id)
    if status_filter:
        stmt = stmt.where(EngineerDeletionRequest.status == status_filter)
    
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size

    stmt = stmt.order_by(EngineerDeletionRequest.created_at.desc()).offset(offset).limit(page_size)
    records = list(db.scalars(stmt).all())

    items = []
    for r in records:
        eng = db.get(Engineer, r.engineer_id) if r.engineer_id else None
        usr = db.get(User, r.requested_by)
        comp = db.get(Company, r.company_id)
        
        items.append(EngineerDeletionRequestResponse(
            request_id=r.request_id,
            engineer_id=r.engineer_id,
            engineer_name=eng.engineer_name if eng else "Deleted Engineer",
            orbit_id=eng.orbit_id if eng else "N/A",
            requested_by=r.requested_by,
            requested_by_name=usr.full_name if usr else "Unknown User",
            company_id=r.company_id,
            company_name=comp.company_name if comp else "Unknown Company",
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
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

def get_deletion_requests(
    db: Session,
    company_id: Optional[UUID] = None,
    status_filter: Optional[str] = None
) -> List[EngineerDeletionRequestResponse]:
    stmt = select(EngineerDeletionRequest)
    if company_id:
        stmt = stmt.where(EngineerDeletionRequest.company_id == company_id)
    if status_filter:
        stmt = stmt.where(EngineerDeletionRequest.status == status_filter)
    
    stmt = stmt.order_by(EngineerDeletionRequest.created_at.desc())
    records = list(db.scalars(stmt).all())

    result = []
    for r in records:
        eng = db.get(Engineer, r.engineer_id) if r.engineer_id else None
        usr = db.get(User, r.requested_by)
        comp = db.get(Company, r.company_id)
        
        result.append(EngineerDeletionRequestResponse(
            request_id=r.request_id,
            engineer_id=r.engineer_id,
            engineer_name=eng.engineer_name if eng else "Deleted Engineer",
            orbit_id=eng.orbit_id if eng else "N/A",
            requested_by=r.requested_by,
            requested_by_name=usr.full_name if usr else "Unknown User",
            company_id=r.company_id,
            company_name=comp.company_name if comp else "Unknown Company",
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at,
            review_comment=r.review_comment,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return result

def approve_deletion_request(
    db: Session,
    request_id: UUID,
    reviewer: User
) -> EngineerDeletionRequestResponse:
    from app.services.auth_service import is_main_admin, is_manager, enforce_company_isolation
    if not (is_main_admin(reviewer) or is_manager(reviewer)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can approve engineer deletion requests."
        )

    req = db.get(EngineerDeletionRequest, request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deletion request not found."
        )

    enforce_company_isolation(db, reviewer, req.company_id)

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve request with status '{req.status}'."
        )

    eng = db.get(Engineer, req.engineer_id) if req.engineer_id else None
    if not eng:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target engineer record no longer exists."
        )

    eng_name = eng.engineer_name
    eng_orbit_id = eng.orbit_id
    target_eng_id = req.engineer_id

    # Mark request APPROVED first
    req.status = "APPROVED"
    req.reviewed_by = reviewer.user_id
    req.reviewed_at = datetime.utcnow()
    req.updated_at = datetime.utcnow()
    req.engineer_id = None

    # Also update unified delete_requests table
    from app.models.delete_request import DeleteRequest
    del_req = db.get(DeleteRequest, request_id)
    if not del_req:
        del_req = db.scalar(
            select(DeleteRequest).where(
                and_(DeleteRequest.entity_type == "Engineer", DeleteRequest.entity_id == target_eng_id)
            )
        )
    if del_req:
        del_req.status = "APPROVED"
        del_req.reviewed_by = reviewer.user_id
        del_req.reviewed_at = datetime.utcnow()

    db.flush()

    # Delete engineer and all child records using delete_engineer helper
    from app.services.engineer_service import delete_engineer
    delete_engineer(db, target_eng_id, current_user_id=reviewer.user_id)
    db.refresh(req)

    usr = db.get(User, req.requested_by)
    comp = db.get(Company, req.company_id)

    return EngineerDeletionRequestResponse(
        request_id=req.request_id,
        engineer_id=target_eng_id,
        engineer_name=eng_name,
        orbit_id=eng_orbit_id,
        requested_by=req.requested_by,
        requested_by_name=usr.full_name if usr else "Unknown User",
        company_id=req.company_id,
        company_name=comp.company_name if comp else "Unknown Company",
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_at=req.reviewed_at,
        review_comment=req.review_comment,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


def reject_deletion_request(
    db: Session,
    request_id: UUID,
    reviewer: User,
    review_comment: Optional[str] = None
) -> EngineerDeletionRequestResponse:
    from app.services.auth_service import is_main_admin, is_manager, enforce_company_isolation
    if not (is_main_admin(reviewer) or is_manager(reviewer)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Manager or Main Admin can reject engineer deletion requests."
        )

    req = db.get(EngineerDeletionRequest, request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deletion request not found."
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

    # Also update unified delete_requests table
    from app.models.delete_request import DeleteRequest
    del_req = db.get(DeleteRequest, request_id)
    if not del_req and req.engineer_id:
        del_req = db.scalar(
            select(DeleteRequest).where(
                and_(DeleteRequest.entity_type == "Engineer", DeleteRequest.entity_id == req.engineer_id)
            )
        )
    if del_req:
        del_req.status = "REJECTED"
        del_req.reviewed_by = reviewer.user_id
        del_req.reviewed_at = datetime.utcnow()
        del_req.review_comment = review_comment

    db.commit()
    db.refresh(req)

    eng = db.get(Engineer, req.engineer_id) if req.engineer_id else None
    usr = db.get(User, req.requested_by)
    comp = db.get(Company, req.company_id)

    return EngineerDeletionRequestResponse(
        request_id=req.request_id,
        engineer_id=req.engineer_id,
        engineer_name=eng.engineer_name if eng else "Unknown Engineer",
        orbit_id=eng.orbit_id if eng else "N/A",
        requested_by=req.requested_by,
        requested_by_name=usr.full_name if usr else "Unknown User",
        company_id=req.company_id,
        company_name=comp.company_name if comp else "Unknown Company",
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_at=req.reviewed_at,
        review_comment=req.review_comment,
        created_at=req.created_at,
        updated_at=req.updated_at
    )
