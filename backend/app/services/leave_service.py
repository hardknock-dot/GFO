from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime, date

from app.models.leave import Leave
from app.models.engineer import Engineer
from app.schemas.leave import LeaveCreate, LeaveUpdate
from fastapi import HTTPException, status

def get_leaves_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(Leave, Engineer.engineer_name, Engineer.orbit_id).join(Engineer, Leave.engineer_id == Engineer.engineer_id)
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if engineer_id:
        conditions.append(Leave.engineer_id == engineer_id)

    if status_filter:
        conditions.append(Leave.approval_status == status_filter)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Leave.created_at.desc()).offset(offset).limit(page_size)

    rows = db.execute(stmt).all()
    items = []
    for l, eng_name, orb_id in rows:
        l.engineer_name = eng_name
        l.orbit_id = orb_id
        items.append(l)

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_leaves(db: Session, engineer_id: UUID) -> List[Leave]:
    """
    Retrieve all leave records associated with one engineer from PostgreSQL.
    """
    eng = db.get(Engineer, engineer_id)
    if eng is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )
    stmt = select(Leave).where(Leave.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_leave(db: Session, engineer_id: UUID, leave_data: LeaveCreate, owner_id: Optional[UUID] = None) -> Leave:
    """
    Create a new leave record associated with an engineer.
    """
    eng = db.get(Engineer, engineer_id)
    if eng is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    db_leave = Leave(
        leave_id=uuid.uuid4(),
        engineer_id=engineer_id,
        owner_id=owner_id,
        leave_type=leave_data.leave_type,
        requested_date=leave_data.requested_date,
        requested_on=leave_data.requested_on or date.today(),
        approval_status=leave_data.approval_status or "Pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

def update_leave(db: Session, leave_id: UUID, leave_data: LeaveUpdate) -> Leave:
    """
    Update an existing leave record.
    """
    db_leave = db.get(Leave, leave_id)
    if db_leave is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave record not found"
        )

    new_requested_date = leave_data.requested_date if leave_data.requested_date is not None else db_leave.requested_date
    new_requested_on = leave_data.requested_on if leave_data.requested_on is not None else db_leave.requested_on
    if new_requested_on is not None and new_requested_date is not None:
        if new_requested_on > new_requested_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="requested_on date cannot be later than requested_date"
            )

    if leave_data.leave_type is not None:
        db_leave.leave_type = leave_data.leave_type
    if leave_data.requested_date is not None:
        db_leave.requested_date = leave_data.requested_date
    if leave_data.requested_on is not None:
        db_leave.requested_on = leave_data.requested_on
    if leave_data.approval_status is not None:
        db_leave.approval_status = leave_data.approval_status

    db_leave.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_leave)
    return db_leave

def delete_leave(db: Session, leave_id: UUID) -> None:
    """
    Delete an existing leave record.
    """
    db_leave = db.get(Leave, leave_id)
    if db_leave is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave record not found"
        )

    db.delete(db_leave)
    db.commit()
