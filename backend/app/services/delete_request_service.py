import uuid
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, desc

from app.models.delete_request import DeleteRequest
from app.models.user import User
from app.models.company import Company
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

from app.services.auth_service import enforce_company_isolation

def resolve_entity_company_id(db: Session, entity_type: str, entity_id: UUID) -> Optional[UUID]:
    if entity_type == "Engineer":
        from app.models.engineer import Engineer
        eng = db.get(Engineer, entity_id)
        return eng.company_id if eng else None
    elif entity_type == "Skill":
        from app.models.skill import Skill
        from app.models.engineer import Engineer
        sk = db.get(Skill, entity_id)
        if sk:
            eng = db.get(Engineer, sk.engineer_id)
            return eng.company_id if eng else None
    elif entity_type == "Schedule":
        from app.models.schedule import Schedule
        from app.models.engineer import Engineer
        sch = db.get(Schedule, entity_id)
        if sch:
            eng = db.get(Engineer, sch.engineer_id)
            return eng.company_id if eng else None
    elif entity_type == "Visa":
        from app.models.visa import Visa
        from app.models.engineer import Engineer
        v = db.get(Visa, entity_id)
        if v:
            eng = db.get(Engineer, v.engineer_id)
            return eng.company_id if eng else None
    elif entity_type == "Leave":
        from app.models.leave import Leave
        from app.models.engineer import Engineer
        l = db.get(Leave, entity_id)
        if l:
            eng = db.get(Engineer, l.engineer_id)
            return eng.company_id if eng else None
    elif entity_type == "Travel":
        from app.models.travel import TravelArrangement
        from app.models.schedule import Schedule
        from app.models.engineer import Engineer
        tr = db.get(TravelArrangement, entity_id)
        if tr:
            sch = db.get(Schedule, tr.schedule_id)
            eng = db.get(Engineer, sch.engineer_id) if sch else None
            return eng.company_id if eng else None
    elif entity_type == "Performance":
        from app.models.performance import Performance
        from app.models.schedule import Schedule
        from app.models.engineer import Engineer
        p = db.get(Performance, entity_id)
        if p:
            sch = db.get(Schedule, p.schedule_id)
            eng = db.get(Engineer, sch.engineer_id) if sch else None
            return eng.company_id if eng else None
    elif entity_type == "MissedSchedule":
        from app.models.missed_schedule import MissedSchedule
        from app.models.schedule import Schedule
        from app.models.engineer import Engineer
        ms = db.get(MissedSchedule, entity_id)
        if ms:
            sch = db.get(Schedule, ms.schedule_id)
            eng = db.get(Engineer, sch.engineer_id) if sch else None
            return eng.company_id if eng else None
    return None

def create_delete_request(
    db: Session,
    user: User,
    entity_type: str,
    entity_id: UUID,
    reason: str
) -> DeleteRequest:
    target_company_id = resolve_entity_company_id(db, entity_type, entity_id) or user.company_id
    enforce_company_isolation(db, user, target_company_id)
    
    req = DeleteRequest(
        request_id=uuid.uuid4(),
        requested_by=user.user_id,
        company_id=target_company_id,
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason,
        status="PENDING",
        created_at=datetime.utcnow()
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    log_audit(
        db=db,
        user_id=user.user_id,
        company_id=target_company_id,
        action="DELETE_REQUESTED",
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Delete request submitted for {entity_type} ({entity_id}): {reason}",
        new_values={"reason": reason, "status": "PENDING"}
    )
    return req

def get_delete_requests(
    db: Session,
    company_ids: Optional[List[UUID]] = None,
    status_filter: Optional[str] = None
) -> List[dict]:
    # Auto-sync legacy/un-synced EngineerDeletionRequest entries into DeleteRequest table
    try:
        from app.models.engineer_deletion_request import EngineerDeletionRequest
        edr_stmt = select(EngineerDeletionRequest)
        if status_filter:
            edr_stmt = edr_stmt.where(EngineerDeletionRequest.status == status_filter.upper())
        un_synced_edrs = db.scalars(edr_stmt).all()
        synced_any = False
        for edr in un_synced_edrs:
            del_entry = db.get(DeleteRequest, edr.request_id)
            if not del_entry:
                new_del = DeleteRequest(
                    request_id=edr.request_id,
                    requested_by=edr.requested_by,
                    company_id=edr.company_id,
                    entity_type="Engineer",
                    entity_id=edr.engineer_id or edr.request_id,
                    reason=edr.reason or "Engineer deletion requested",
                    status=edr.status,
                    reviewed_by=edr.reviewed_by,
                    reviewed_at=edr.reviewed_at,
                    review_comment=edr.review_comment,
                    created_at=edr.created_at
                )
                db.add(new_del)
                synced_any = True
        if synced_any:
            db.commit()
    except Exception as e:
        logger.error(f"Error auto-syncing EngineerDeletionRequest: {e}")
        db.rollback()

    query = select(DeleteRequest).order_by(desc(DeleteRequest.created_at))
    conditions = []
    if company_ids is not None:
        conditions.append(DeleteRequest.company_id.in_(company_ids))
    if status_filter:
        conditions.append(DeleteRequest.status == status_filter.upper())
    
    if conditions:
        query = query.where(and_(*conditions))
    
    requests = db.scalars(query).all()
    results = []
    
    for r in requests:
        req_user = db.get(User, r.requested_by)
        rev_user = db.get(User, r.reviewed_by) if r.reviewed_by else None
        comp = db.get(Company, r.company_id) if r.company_id else None

        # Resolve entity name summary
        entity_name = f"{r.entity_type} {str(r.entity_id)[:8]}"
        if r.entity_type == "Engineer":
            from app.models.engineer import Engineer
            eng = db.get(Engineer, r.entity_id)
            if eng:
                entity_name = f"{eng.engineer_name} ({eng.orbit_id})"
        elif r.entity_type == "Skill":
            from app.models.skill import Skill
            sk = db.get(Skill, r.entity_id)
            if sk:
                entity_name = f"{sk.tool_type or 'Skill'} ({sk.role or ''})"

        results.append({
            "request_id": r.request_id,
            "requested_by": r.requested_by,
            "requested_by_name": req_user.full_name if req_user else "Unknown User",
            "company_id": r.company_id,
            "company_name": comp.company_name if comp else "Unknown Company",
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "entity_name": entity_name,
            "reason": r.reason,
            "status": r.status,
            "reviewed_by": r.reviewed_by,
            "reviewed_by_name": rev_user.full_name if rev_user else None,
            "reviewed_at": r.reviewed_at,
            "review_comment": r.review_comment,
            "created_at": r.created_at
        })
    return results

def approve_delete_request(db: Session, request_id: UUID, reviewer: User) -> dict:
    req = db.get(DeleteRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delete request not found.")
    enforce_company_isolation(db, reviewer, req.company_id)
    if req.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Request is already {req.status}.")

    # Execute actual deletion based on entity_type
    if req.entity_type == "Engineer":
        from app.models.engineer import Engineer
        from app.models.engineer_deletion_request import EngineerDeletionRequest
        eng = db.get(Engineer, req.entity_id)
        if eng:
            old_data = object_to_dict(eng)
            db.delete(eng)
        edr = db.scalar(
            select(EngineerDeletionRequest).where(
                and_(EngineerDeletionRequest.engineer_id == req.entity_id, EngineerDeletionRequest.status == "PENDING")
            )
        )
        if edr:
            edr.status = "APPROVED"
            edr.reviewed_by = reviewer.user_id
            edr.reviewed_at = datetime.utcnow()
            edr.engineer_id = None
    elif req.entity_type == "Skill":
        from app.models.skill import Skill
        sk = db.get(Skill, req.entity_id)
        if sk:
            old_data = object_to_dict(sk)
            db.delete(sk)
    elif req.entity_type == "Schedule":
        from app.models.schedule import Schedule
        sch = db.get(Schedule, req.entity_id)
        if sch:
            old_data = object_to_dict(sch)
            db.delete(sch)
    elif req.entity_type == "Visa":
        from app.models.visa import Visa
        v = db.get(Visa, req.entity_id)
        if v:
            old_data = object_to_dict(v)
            db.delete(v)
    elif req.entity_type == "Leave":
        from app.models.leave import Leave
        l = db.get(Leave, req.entity_id)
        if l:
            old_data = object_to_dict(l)
            db.delete(l)
    elif req.entity_type == "Travel":
        from app.models.travel import TravelArrangement
        tr = db.get(TravelArrangement, req.entity_id)
        if tr:
            old_data = object_to_dict(tr)
            db.delete(tr)
    elif req.entity_type == "Performance":
        from app.models.performance import Performance
        p = db.get(Performance, req.entity_id)
        if p:
            old_data = object_to_dict(p)
            db.delete(p)
    elif req.entity_type == "MissedSchedule":
        from app.models.missed_schedule import MissedSchedule
        ms = db.get(MissedSchedule, req.entity_id)
        if ms:
            old_data = object_to_dict(ms)
            db.delete(ms)

    req.status = "APPROVED"
    req.reviewed_by = reviewer.user_id
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    # Audit log
    log_audit(
        db=db,
        user_id=reviewer.user_id,
        company_id=req.company_id,
        action="DELETE_APPROVED",
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        description=f"Delete request approved by {reviewer.full_name} for {req.entity_type} ({req.entity_id})",
        old_values=old_data,
        new_values={"status": "APPROVED", "reviewed_by": str(reviewer.user_id)}
    )

    # Return summary dict
    req_list = get_delete_requests(db, company_ids=[req.company_id])
    return next((r for r in req_list if r["request_id"] == req.request_id), {})

def reject_delete_request(db: Session, request_id: UUID, reviewer: User, comment: Optional[str] = None) -> dict:
    req = db.get(DeleteRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delete request not found.")
    enforce_company_isolation(db, reviewer, req.company_id)
    if req.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Request is already {req.status}.")

    req.status = "REJECTED"
    req.reviewed_by = reviewer.user_id
    req.reviewed_at = datetime.utcnow()
    req.review_comment = comment

    if req.entity_type == "Engineer":
        from app.models.engineer_deletion_request import EngineerDeletionRequest
        edr = db.scalar(
            select(EngineerDeletionRequest).where(
                and_(EngineerDeletionRequest.engineer_id == req.entity_id, EngineerDeletionRequest.status == "PENDING")
            )
        )
        if edr:
            edr.status = "REJECTED"
            edr.reviewed_by = reviewer.user_id
            edr.reviewed_at = datetime.utcnow()
            edr.review_comment = comment

    db.commit()
    db.refresh(req)

    # Audit log
    log_audit(
        db=db,
        user_id=reviewer.user_id,
        company_id=req.company_id,
        action="DELETE_REJECTED",
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        description=f"Delete request rejected by {reviewer.full_name}: {comment or 'No comment'}",
        new_values={"status": "REJECTED", "review_comment": comment}
    )

    req_list = get_delete_requests(db, company_ids=[req.company_id])
    return next((r for r in req_list if r["request_id"] == req.request_id), {})
