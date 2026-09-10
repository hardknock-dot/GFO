import logging
from typing import Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.schemas.company_settings import CompanySettingsResponse, CompanySettingsUpdateRequest
from app.services.auth_service import get_current_user, is_main_admin, get_user_authorized_company_ids
from app.services.company_settings_service import get_or_create_company_settings, update_company_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(get_current_user)])

def check_settings_admin(user: User):
    """
    Ensure user has administrative permissions to modify company settings.
    """
    allowed_roles = ["Main Admin", "Global Admin", "Company Admin", "Manager"]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators and managers can modify company settings."
        )

def resolve_effective_company_id(db: Session, user: User, requested_cid: Optional[Any] = None) -> UUID:
    """
    Safely resolve a company UUID from a UUID, UUID string, company slug ('lam-research', 'axcelis', 'vishay', 'all-data'),
    or fallback to the user's primary company / first authorized company / first active company in DB.
    """
    if requested_cid is not None:
        cid_str = str(requested_cid).strip()
        if cid_str and cid_str.lower() != "all-data" and cid_str.lower() != "undefined" and cid_str.lower() != "null":
            # 1. Try direct UUID parse
            try:
                return UUID(cid_str)
            except Exception:
                pass
            
            # 2. Try lookup by short_name or company_name slug
            clean_term = cid_str.replace("-", " ").lower()
            slug_term = cid_str.lower()
            comp = db.scalar(
                select(Company).where(
                    or_(
                        Company.short_name.ilike(f"%{slug_term}%"),
                        Company.company_name.ilike(f"%{clean_term}%"),
                        Company.company_name.ilike(f"%{slug_term}%")
                    )
                )
            )
            if comp:
                return comp.company_id

    # Fallback to user's assigned company_id
    if user.company_id:
        return user.company_id

    # Fallback to first authorized company
    auth_cids = get_user_authorized_company_ids(db, user)
    if auth_cids:
        return auth_cids[0]

    # Fallback to first active company in database
    first_comp = db.scalar(select(Company.company_id).where(Company.is_active.is_(True)).limit(1))
    if first_comp:
        return first_comp

    # Fallback to any company in database
    any_comp = db.scalar(select(Company.company_id).limit(1))
    if any_comp:
        return any_comp

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active company exists to configure settings."
    )

@router.get("", response_model=CompanySettingsResponse)
def get_current_user_company_settings(
    company_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve settings for the active company.
    """
    eff_cid = resolve_effective_company_id(db, current_user, company_id)
    return get_or_create_company_settings(db, eff_cid)

@router.get("/company/{company_id}", response_model=CompanySettingsResponse)
def get_company_settings_by_id(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve settings for a specific company with strict tenant isolation check.
    """
    eff_cid = resolve_effective_company_id(db, current_user, company_id)
    auth_cids = get_user_authorized_company_ids(db, current_user)
    if not is_main_admin(current_user) and eff_cid not in auth_cids and current_user.company_id != eff_cid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have access to view settings for this company."
        )
    return get_or_create_company_settings(db, eff_cid)

@router.put("", response_model=CompanySettingsResponse)
def update_settings(
    req: CompanySettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update company settings for the authorized company.
    Respects company isolation and records audit trail.
    """
    check_settings_admin(current_user)
    
    target_company_id = resolve_effective_company_id(db, current_user, req.company_id)

    auth_cids = get_user_authorized_company_ids(db, current_user)
    if not is_main_admin(current_user) and target_company_id not in auth_cids and current_user.company_id != target_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify settings for another company."
        )

    return update_company_settings(
        db=db,
        company_id=target_company_id,
        req=req,
        current_user=current_user
    )
