import uuid
import logging
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, and_

from app.models.user import User
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.delete_request import DeleteRequest
from app.models.audit_log import AuditLog
from app.services.security import get_password_hash
from app.services.audit_service import log_audit, object_to_dict, get_audit_logs

logger = logging.getLogger(__name__)

def get_admin_overview(db: Session) -> Dict[str, Any]:
    total_companies = db.scalar(select(func.count(Company.company_id))) or 0
    total_engineers = db.scalar(select(func.count(Engineer.engineer_id))) or 0
    
    users = db.scalars(select(User)).all()
    total_managers = len([u for u in users if u.role in ('Manager', 'Company Admin')])
    total_ops = len([u for u in users if u.role in ('Ops Executive', 'Resource Manager')])
    total_users = len(users)

    pending_deletes = db.scalar(
        select(func.count(DeleteRequest.request_id)).where(DeleteRequest.status == "PENDING")
    ) or 0

    # Recent Audit Activity (top 10)
    recent_audits = get_audit_logs(db, page=1, page_size=10)["items"]

    # Companies summary
    companies = db.scalars(select(Company)).all()
    comp_summary = []
    for c in companies:
        eng_count = db.scalar(select(func.count(Engineer.engineer_id)).where(Engineer.company_id == c.company_id)) or 0
        usr_count = db.scalar(select(func.count(User.user_id)).where(User.company_id == c.company_id)) or 0
        comp_summary.append({
            "company_id": str(c.company_id),
            "company_name": c.company_name,
            "region": getattr(c, "region", "Global"),
            "country": getattr(c, "country", "Global"),
            "status": "Active" if getattr(c, "is_active", True) else "Inactive",
            "engineers_count": eng_count,
            "users_count": usr_count
        })

    return {
        "total_companies": total_companies,
        "total_engineers": total_engineers,
        "total_managers": total_managers,
        "total_ops_executives": total_ops,
        "total_users": total_users,
        "pending_delete_requests": pending_deletes,
        "companies": comp_summary,
        "recent_activity": recent_audits
    }

def get_all_users(db: Session) -> List[Dict[str, Any]]:
    users = db.scalars(select(User).order_by(User.full_name)).all()
    res = []
    for u in users:
        comp = db.get(Company, u.company_id) if u.company_id else None
        res.append({
            "user_id": str(u.user_id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "company_id": str(u.company_id) if u.company_id else None,
            "company_name": comp.company_name if comp else "All Companies",
            "engineer_id": str(u.engineer_id) if u.engineer_id else None,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return res

def create_user_admin(db: Session, admin_user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    email = payload.get("email")
    if db.scalar(select(User).where(func.lower(User.email) == email.lower())):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is already registered.")

    raw_password = payload.get("password") or "OrbitAdmin123!"
    user_id = uuid.uuid4()
    
    new_user = User(
        user_id=user_id,
        company_id=UUID(payload["company_id"]) if payload.get("company_id") and payload["company_id"] != "all-data" else admin_user.company_id,
        engineer_id=UUID(payload["engineer_id"]) if payload.get("engineer_id") else None,
        full_name=payload["full_name"],
        email=email,
        password_hash=get_password_hash(raw_password),
        role=payload.get("role", "Engineer"),
        is_active=payload.get("is_active", True),
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    new_dict = object_to_dict(new_user)
    log_audit(
        db=db,
        user_id=admin_user.user_id,
        company_id=new_user.company_id,
        action="USER_CREATED",
        entity_type="User",
        entity_id=new_user.user_id,
        description=f"User created: {new_user.full_name} ({new_user.role})",
        new_values=new_dict
    )
    
    return {
        "user_id": str(new_user.user_id),
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role,
        "company_id": str(new_user.company_id),
        "is_active": new_user.is_active
    }

def update_user_admin(db: Session, admin_user: User, user_id: UUID, payload: Dict[str, Any]) -> Dict[str, Any]:
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_dict = object_to_dict(target_user)

    role_changed = False
    company_changed = False

    if "full_name" in payload:
        target_user.full_name = payload["full_name"]
    if "email" in payload:
        target_user.email = payload["email"]
    if "role" in payload and payload["role"] != target_user.role:
        target_user.role = payload["role"]
        role_changed = True
    if "company_id" in payload:
        new_comp = UUID(payload["company_id"]) if payload["company_id"] and payload["company_id"] != "all-data" else target_user.company_id
        if new_comp != target_user.company_id:
            target_user.company_id = new_comp
            company_changed = True
    if "is_active" in payload:
        target_user.is_active = payload["is_active"]
    if payload.get("password"):
        target_user.password_hash = get_password_hash(payload["password"])

    target_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(target_user)

    new_dict = object_to_dict(target_user)

    # Specific audit actions for role/company changes
    action = "USER_UPDATED"
    if role_changed:
        action = "USER_ROLE_CHANGED"
    elif company_changed:
        action = "USER_COMPANY_CHANGED"

    log_audit(
        db=db,
        user_id=admin_user.user_id,
        company_id=target_user.company_id,
        action=action,
        entity_type="User",
        entity_id=target_user.user_id,
        description=f"User updated: {target_user.full_name} ({target_user.role})",
        old_values=old_dict,
        new_values=new_dict
    )

    return {
        "user_id": str(target_user.user_id),
        "full_name": target_user.full_name,
        "email": target_user.email,
        "role": target_user.role,
        "company_id": str(target_user.company_id),
        "is_active": target_user.is_active
    }
