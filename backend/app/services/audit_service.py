import logging
import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc, func

from app.models.audit_log import AuditLog
from app.models.user import User

from decimal import Decimal

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {"password", "password_hash", "token", "secret", "jwt", "access_token"}

def sanitize_values(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, UUID):
        return str(val)
    if isinstance(val, dict):
        clean = {}
        for k, v in val.items():
            if k in SENSITIVE_KEYS:
                continue
            clean[k] = sanitize_values(v)
        return clean
    if isinstance(val, list):
        return [sanitize_values(item) for item in val]
    return val

def object_to_dict(obj: Any) -> Optional[Dict[str, Any]]:
    if not obj:
        return None
    res = {}
    for col in obj.__table__.columns:
        if col.name in SENSITIVE_KEYS:
            continue
        val = getattr(obj, col.name, None)
        res[col.name] = sanitize_values(val)
    return res

def log_audit(
    db: Session,
    user_id: UUID,
    company_id: Optional[UUID],
    action: str,
    entity_type: str,
    entity_id: Optional[UUID] = None,
    description: Optional[str] = None,
    old_values: Optional[Any] = None,
    new_values: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    try:
        clean_old = sanitize_values(old_values)
        clean_new = sanitize_values(new_values)
        
        audit_entry = AuditLog(
            audit_id=uuid.uuid4(),
            user_id=user_id,
            company_id=company_id,
            action=action.upper(),
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            old_values=clean_old,
            new_values=clean_new,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")
        db.rollback()
        return None

def get_audit_logs(
    db: Session,
    company_id: Optional[UUID] = None,
    company_ids: Optional[List[UUID]] = None,
    user_id: Optional[UUID] = None,
    role: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
) -> Dict[str, Any]:
    query = select(AuditLog, User.full_name, User.email, User.role)\
        .outerjoin(User, AuditLog.user_id == User.user_id)
    
    conditions = []
    if company_ids is not None:
        conditions.append(AuditLog.company_id.in_(company_ids))
    elif company_id:
        conditions.append(AuditLog.company_id == company_id)
    if user_id:
        conditions.append(AuditLog.user_id == user_id)
    if role:
        conditions.append(func.lower(User.role) == role.lower())
    if action and action != 'ALL':
        conditions.append(AuditLog.action == action.upper())
    if entity_type and entity_type != 'ALL':
        conditions.append(func.lower(AuditLog.entity_type) == entity_type.lower())
    if start_date:
        conditions.append(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(
                AuditLog.description.ilike(search_pattern),
                AuditLog.action.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = db.scalar(count_stmt) or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)
    results = db.execute(query).all()

    items = []
    from app.models.company import Company
    for row in results:
        audit, user_name, user_email, user_role = row[0], row[1], row[2], row[3]
        company_name = None
        if audit.company_id:
            comp = db.get(Company, audit.company_id)
            if comp:
                company_name = comp.company_name
        
        items.append({
            "audit_id": str(audit.audit_id),
            "user_id": str(audit.user_id),
            "user_name": user_name or "Unknown",
            "user_email": user_email or "",
            "user_role": user_role or "Unknown",
            "company_id": str(audit.company_id) if audit.company_id else None,
            "company_name": company_name or "All Companies",
            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": str(audit.entity_id) if audit.entity_id else None,
            "description": audit.description,
            "old_values": audit.old_values,
            "new_values": audit.new_values,
            "ip_address": audit.ip_address,
            "created_at": audit.created_at.isoformat() if audit.created_at else None
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1
    }
