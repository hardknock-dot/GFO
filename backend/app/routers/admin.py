import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services import admin_service, audit_service
from app.services.auth_service import get_current_user, is_main_admin, enforce_company_isolation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_user)])

def check_main_admin(user: User):
    if not is_main_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Main Admin access required."
        )

@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Main Admin Control Center overview data.
    """
    check_main_admin(current_user)
    return admin_service.get_admin_overview(db)

@router.get("/audit-logs")
def get_audit_logs(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    user_id: Optional[UUID] = Query(None),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-side paginated & filterable Audit Logs. Scoped by company isolation.
    """
    target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
    validated_cids = enforce_company_isolation(db, current_user, target_cids)
    return audit_service.get_audit_logs(
        db=db,
        company_id=None,
        company_ids=validated_cids,
        user_id=user_id,
        role=role,
        action=action,
        entity_type=entity_type,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size
    )

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all system users for Main Admin.
    """
    check_main_admin(current_user)
    return admin_service.get_all_users(db)

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user account (Main Admin only). Audited.
    """
    check_main_admin(current_user)
    return admin_service.create_user_admin(db, current_user, payload)

@router.put("/users/{user_id}")
def update_user(
    user_id: UUID,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update role, company, or active status of a user (Main Admin only). Audited.
    """
    check_main_admin(current_user)
    return admin_service.update_user_admin(db, current_user, user_id, payload)
