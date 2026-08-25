import logging
import uuid
from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.user_company import UserCompany
from app.schemas.user import UserResponse, UserCreateRequest, UserUpdateRequest, CompanySummary
from app.services.security import get_password_hash
from app.services.auth_service import get_current_user, is_main_admin, get_user_company_summaries
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_user)])

def check_global_admin(user: User):
    if not is_main_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Main Admin can manage system users and roles."
        )

@router.get("", response_model=List[UserResponse])
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieve all user accounts with complete multi-tenant company mappings.
    """
    check_global_admin(current_user)
    users = db.scalars(select(User)).all()
    companies_map = {c.company_id: c for c in db.scalars(select(Company)).all()}
    
    result = []
    for u in users:
        summaries = get_user_company_summaries(db, u)
        comp_obj = companies_map.get(u.company_id)
        result.append(UserResponse(
            user_id=u.user_id,
            company_id=u.company_id,
            company_name=comp_obj.company_name if comp_obj else "Unknown",
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            engineer_id=u.engineer_id,
            is_active=bool(u.is_active),
            companies=[CompanySummary.model_validate(c) for c in summaries]
        ))
    return result

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(req: UserCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Provision a new user account with multi-company access support.
    """
    check_global_admin(current_user)
    existing = db.scalar(select(User).where(User.email == req.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists.")
    
    target_company_ids = req.company_ids if req.company_ids else ([req.company_id] if req.company_id else [])
    if not target_company_ids:
        all_comps = db.scalars(select(Company.company_id)).all()
        if not all_comps:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active companies exist.")
        target_company_ids = [all_comps[0]]

    primary_company_id = req.company_id if req.company_id else target_company_ids[0]
    primary_company = db.get(Company, primary_company_id)
    if not primary_company:
        primary_company_id = target_company_ids[0]
        primary_company = db.get(Company, primary_company_id)

    new_user_id = uuid.uuid4()
    new_user = User(
        user_id=new_user_id,
        company_id=primary_company_id,
        engineer_id=req.engineer_id,
        full_name=req.full_name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_user)
    db.flush()

    # Persist all user_companies relationships
    for cid in set(target_company_ids):
        comp = db.get(Company, cid)
        if comp:
            uc = UserCompany(user_id=new_user_id, company_id=cid)
            db.add(uc)

    db.commit()
    db.refresh(new_user)

    summaries = get_user_company_summaries(db, new_user)

    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=primary_company_id,
        action="USER_CREATED",
        entity_type="User",
        entity_id=new_user.user_id,
        description=f"User account created: {new_user.full_name} ({new_user.role}) with {len(summaries)} company scope(s)",
        new_values={"email": new_user.email, "role": new_user.role, "companies": [s["company_name"] for s in summaries]}
    )
    
    return UserResponse(
        user_id=new_user.user_id,
        company_id=new_user.company_id,
        company_name=primary_company.company_name if primary_company else "Unknown",
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role,
        engineer_id=new_user.engineer_id,
        is_active=bool(new_user.is_active),
        companies=[CompanySummary.model_validate(c) for c in summaries]
    )

@router.put("/{target_user_id}", response_model=UserResponse)
def update_user_details(target_user_id: UUID, req: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Update user details, role, active status, or multi-company scope transactionally.
    Emits USER_COMPANY_ACCESS_CHANGED audit event when company assignments change.
    """
    check_global_admin(current_user)
    target_user = db.get(User, target_user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    old_summaries = get_user_company_summaries(db, target_user)
    old_cids = set(s["company_id"] for s in old_summaries)
    old_comp_names = [s["company_name"] for s in old_summaries]

    if req.full_name is not None:
        target_user.full_name = req.full_name
    if req.role is not None:
        target_user.role = req.role
    if req.engineer_id is not None:
        target_user.engineer_id = req.engineer_id
    if req.is_active is not None:
        target_user.is_active = req.is_active
    if req.password and req.password.strip():
        target_user.password_hash = get_password_hash(req.password)

    # Handle multi-company scope updates
    company_access_changed = False
    if req.company_ids is not None:
        company_access_changed = True
        new_cids = set(req.company_ids)
        if req.company_id and req.company_id not in new_cids:
            new_cids.add(req.company_id)

        added_cids = new_cids - old_cids
        removed_cids = old_cids - new_cids

        # Delete removed assignments
        if removed_cids:
            db.execute(delete(UserCompany).where(
                UserCompany.user_id == target_user_id,
                UserCompany.company_id.in_(removed_cids)
            ))

        # Add new assignments
        for cid in added_cids:
            comp = db.get(Company, cid)
            if comp:
                db.add(UserCompany(user_id=target_user_id, company_id=cid))

        if req.company_id:
            target_user.company_id = req.company_id
        elif new_cids:
            target_user.company_id = list(new_cids)[0]
    elif req.company_id is not None:
        target_user.company_id = req.company_id
        existing_uc = db.scalar(select(UserCompany).where(UserCompany.user_id == target_user_id, UserCompany.company_id == req.company_id))
        if not existing_uc:
            db.add(UserCompany(user_id=target_user_id, company_id=req.company_id))

    target_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(target_user)

    new_summaries = get_user_company_summaries(db, target_user)
    new_comp_names = [s["company_name"] for s in new_summaries]

    if company_access_changed:
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=target_user.company_id,
            action="USER_COMPANY_ACCESS_CHANGED",
            entity_type="User",
            entity_id=target_user.user_id,
            description=f"Company access updated for user '{target_user.full_name}' by {current_user.full_name}",
            old_values={"companies": old_comp_names},
            new_values={
                "companies": new_comp_names,
                "added_companies": [s["company_name"] for s in new_summaries if s["company_id"] in (new_cids - old_cids)],
                "removed_companies": [s["company_name"] for s in old_summaries if s["company_id"] in (old_cids - new_cids)]
            }
        )

    comp = db.get(Company, target_user.company_id)
    return UserResponse(
        user_id=target_user.user_id,
        company_id=target_user.company_id,
        company_name=comp.company_name if comp else "Unknown",
        full_name=target_user.full_name,
        email=target_user.email,
        role=target_user.role,
        engineer_id=target_user.engineer_id,
        is_active=bool(target_user.is_active),
        companies=[CompanySummary.model_validate(c) for c in new_summaries]
    )

@router.delete("/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_account(target_user_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete a user account safely by unlinking associated foreign key relationships.
    """
    check_global_admin(current_user)
    if target_user_id == current_user.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own active Main Admin account.")
    target_user = db.get(User, target_user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE bulk_uploads ALTER COLUMN uploaded_by DROP NOT NULL;"))
        db.commit()
    except Exception:
        db.rollback()

    safe_queries = [
        ("UPDATE bulk_uploads SET uploaded_by = NULL WHERE uploaded_by = :uid", {"uid": target_user_id}),
        ("UPDATE schedules SET owner_id = NULL WHERE owner_id = :uid", {"uid": target_user_id}),
        ("UPDATE visa_details SET owner_id = NULL WHERE owner_id = :uid", {"uid": target_user_id}),
        ("UPDATE general_delete_requests SET requested_by = NULL WHERE requested_by = :uid", {"uid": target_user_id}),
        ("UPDATE general_delete_requests SET reviewed_by = NULL WHERE reviewed_by = :uid", {"uid": target_user_id}),
        ("DELETE FROM user_company_access WHERE user_id = :uid", {"uid": target_user_id}),
    ]

    for stmt, params in safe_queries:
        try:
            db.execute(text(stmt), params)
            db.commit()
        except Exception:
            db.rollback()

    try:
        db.delete(target_user)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {target_user_id}: {e}", exc_info=True)
        target_user = db.get(User, target_user_id)
        if target_user:
            target_user.is_active = False
            db.commit()
    return
