from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.visa import Visa
from app.models.engineer import Engineer
from app.models.user import User
from app.schemas.visa import VisaCreate, VisaUpdate
from fastapi import HTTPException, status

def get_visa_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    owner_id: Optional[UUID] = None,
    search: Optional[str] = None,
    comment_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(Visa, Engineer.engineer_name, Engineer.orbit_id).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if engineer_id:
        conditions.append(Visa.engineer_id == engineer_id)

    if owner_id:
        conditions.append(Visa.owner_id == owner_id)

    if comment_status:
        conditions.append(Visa.comment_status == comment_status)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Visa.country.ilike(search_pattern),
                Visa.visa_type.ilike(search_pattern),
                Visa.comments.ilike(search_pattern),
                Engineer.engineer_name.ilike(search_pattern),
                Engineer.orbit_id.ilike(search_pattern)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Visa.created_at.desc()).offset(offset).limit(page_size)

    rows = db.execute(stmt).all()
    items = []
    for v, eng_name, orb_id in rows:
        v.engineer_name = eng_name
        v.orbit_id = orb_id
        if getattr(v, "owner_user", None):
            v.owner = {
                "id": v.owner_user.user_id,
                "name": v.owner_user.full_name,
                "email": v.owner_user.email
            }
        else:
            v.owner = None
        items.append(v)

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_visa(db: Session, engineer_id: UUID) -> List[Visa]:
    """
    Retrieve all visa records associated with one engineer from PostgreSQL.
    """
    stmt = select(Visa).where(Visa.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    for v in result:
        if getattr(v, "owner_user", None):
            v.owner = {
                "id": v.owner_user.user_id,
                "name": v.owner_user.full_name,
                "email": v.owner_user.email
            }
        else:
            v.owner = None
    return list(result)

def create_visa(db: Session, engineer_id: UUID, visa_data: VisaCreate, owner_id: Optional[UUID] = None) -> Visa:
    """
    Create a new visa record associated with one engineer.
    """
    # 1. Verify engineer exists
    engineer = db.get(Engineer, engineer_id)
    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Determine effective owner_id & validate company isolation
    target_owner_id = visa_data.owner_id if visa_data.owner_id is not None else owner_id
    if target_owner_id is not None:
        owner_user = db.get(User, target_owner_id)
        if owner_user is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Owner user not found"
            )
        if owner_user.company_id != engineer.company_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cross-company owner assignment is not allowed. Owner must belong to the same company."
            )

    # 3. Create Visa
    db_visa = Visa(
        visa_id=uuid.uuid4(),
        engineer_id=engineer_id,
        owner_id=target_owner_id,
        country=visa_data.country,
        visa_type=visa_data.visa_type,
        applied_on=visa_data.applied_on,
        visa_start_date=visa_data.visa_start_date,
        visa_end_date=visa_data.visa_end_date,
        comments=visa_data.comments,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_visa)
    db.commit()
    db.refresh(db_visa)
    if getattr(db_visa, "owner_user", None):
        db_visa.owner = {
            "id": db_visa.owner_user.user_id,
            "name": db_visa.owner_user.full_name,
            "email": db_visa.owner_user.email
        }
    else:
        db_visa.owner = None
    return db_visa

def update_visa(db: Session, visa_id: UUID, visa_data: VisaUpdate) -> Visa:
    """
    Update an existing visa record.
    """
    # 1. Find Visa
    db_visa = db.get(Visa, visa_id)
    if db_visa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visa record not found"
        )

    # 2. Validate merged dates
    new_start_date = visa_data.visa_start_date if visa_data.visa_start_date is not None else db_visa.visa_start_date
    new_end_date = visa_data.visa_end_date if visa_data.visa_end_date is not None else db_visa.visa_end_date
    if new_start_date is not None and new_end_date is not None:
        if new_end_date < new_start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="visa_end_date should not be earlier than visa_start_date"
            )

    # 3. Validate and update owner if provided in request
    if "owner_id" in visa_data.model_fields_set:
        if visa_data.owner_id is None:
            db_visa.owner_id = None
        else:
            owner_user = db.get(User, visa_data.owner_id)
            if owner_user is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Owner user not found"
                )
            engineer = db.get(Engineer, db_visa.engineer_id)
            if engineer and owner_user.company_id != engineer.company_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Cross-company owner assignment is not allowed. Owner must belong to the same company."
                )
            db_visa.owner_id = visa_data.owner_id

    # 4. Update other fields
    if visa_data.country is not None:
        db_visa.country = visa_data.country
    if visa_data.visa_type is not None:
        db_visa.visa_type = visa_data.visa_type
    if visa_data.applied_on is not None:
        db_visa.applied_on = visa_data.applied_on
    if visa_data.visa_start_date is not None:
        db_visa.visa_start_date = visa_data.visa_start_date
    if visa_data.visa_end_date is not None:
        db_visa.visa_end_date = visa_data.visa_end_date
    if visa_data.comments is not None:
        db_visa.comments = visa_data.comments

    db_visa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_visa)
    if getattr(db_visa, "owner_user", None):
        db_visa.owner = {
            "id": db_visa.owner_user.user_id,
            "name": db_visa.owner_user.full_name,
            "email": db_visa.owner_user.email
        }
    else:
        db_visa.owner = None
    return db_visa

def delete_visa(db: Session, visa_id: UUID) -> None:
    """
    Delete an existing visa record.
    """
    # 1. Find Visa
    db_visa = db.get(Visa, visa_id)
    if db_visa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visa record not found"
        )

    # 2. Delete Visa
    db.delete(db_visa)
    db.commit()
