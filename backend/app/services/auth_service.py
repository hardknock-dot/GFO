from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID
from typing import Optional, List, Any

from app.database import get_db
from app.models.user import User
from app.services.security import decode_access_token

security_scheme = HTTPBearer()

# Role Constants
ROLE_MAIN_ADMIN = "Main Admin"
ROLE_MANAGER = "Manager"
ROLE_OPS_EXECUTIVE = "Ops Executive"
ROLE_ENGINEER = "Engineer"
ROLE_VIEWER = "Viewer"

def is_main_admin(user: User) -> bool:
    return user.role in (ROLE_MAIN_ADMIN, "Global Admin")

def is_manager(user: User) -> bool:
    return user.role in (ROLE_MANAGER, "Company Admin")

def is_ops_executive(user: User) -> bool:
    return user.role in (ROLE_OPS_EXECUTIVE, "Resource Manager")

def is_engineer_user(user: User) -> bool:
    return user.role in (ROLE_ENGINEER, "Field Engineer")

def is_viewer(user: User) -> bool:
    return user.role == ROLE_VIEWER

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_uuid = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

from app.models.user_company import UserCompany
from app.models.company import Company

def get_user_authorized_company_ids(db: Session, user: User) -> List[UUID]:
    """
    Retrieve all company UUIDs authorized for the given user from user_companies table.
    """
    if is_main_admin(user):
        comps = db.scalars(select(Company.company_id).where(Company.is_active.is_(True))).all()
        return list(comps)

    stmt = select(UserCompany.company_id).where(UserCompany.user_id == user.user_id)
    cids = list(db.scalars(stmt).all())
    
    if user.company_id and user.company_id not in cids:
        cids.append(user.company_id)
    return cids

def get_user_company_summaries(db: Session, user: User) -> List[dict]:
    cids = get_user_authorized_company_ids(db, user)
    if not cids:
        return []
    comps = db.scalars(select(Company).where(Company.company_id.in_(cids))).all()
    return [
        {
            "company_id": c.company_id,
            "company_name": c.company_name,
            "short_name": c.short_name
        }
        for c in comps
    ]

def enforce_company_isolation(
    db: Any,
    current_user: Any = None,
    company_ids: Optional[Any] = None
) -> Any:
    """
    Ensure non-Main Admin users can only access company scopes assigned to them in user_companies.
    Supports both 2-arg (user, company_ids) and 3-arg (db, user, company_ids).
    Preserves single UUID return type when passed a single UUID.
    Always cleans up transient sessions to prevent pool exhaustion.
    """
    should_close = False
    if isinstance(db, User):
        company_ids = current_user
        current_user = db
        from app.database import SessionLocal
        db = SessionLocal()
        should_close = True

    try:
        was_single = isinstance(company_ids, (UUID, str))
        if isinstance(company_ids, str):
            try:
                company_ids = UUID(company_ids)
            except Exception:
                pass

        authorized_cids = get_user_authorized_company_ids(db, current_user)

        if is_main_admin(current_user):
            if company_ids is None:
                return None
            if isinstance(company_ids, UUID):
                return company_ids if was_single else [company_ids]
            if isinstance(company_ids, list):
                valid = [c for c in company_ids if c is not None]
                return valid if valid else None
            return company_ids

        if company_ids is None:
            return authorized_cids[0] if (was_single and authorized_cids) else authorized_cids

        if isinstance(company_ids, list) and len(company_ids) == 0:
            return authorized_cids

        requested_list: List[UUID] = []
        if isinstance(company_ids, UUID):
            requested_list = [company_ids]
        elif isinstance(company_ids, list):
            for c in company_ids:
                if isinstance(c, str):
                    try:
                        c = UUID(c)
                    except Exception:
                        pass
                if c is not None:
                    requested_list.append(c)

        authorized_set = set(authorized_cids)
        for cid in requested_list:
            if cid not in authorized_set:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: You do not have access to company scope '{cid}'."
                )

        if was_single and len(requested_list) == 1:
            return requested_list[0]
        return requested_list
    finally:
        if should_close:
            db.close()

def enforce_write_permission(current_user: User):
    """
    Ensure Viewers cannot perform write/mutation operations.
    Engineers can perform limited self-service write operations.
    """
    if is_viewer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Your role (Viewer) is read-only and does not have permission to modify data."
        )

def enforce_delete_permission(current_user: User):
    """
    Direct deletion requires Main Admin or Manager role.
    Ops Executive cannot delete directly (must submit Delete Request).
    Viewer and Engineer roles cannot directly delete database records.
    """
    if is_main_admin(current_user) or is_manager(current_user):
        return
    if is_ops_executive(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Ops Executives cannot delete records directly. Please submit a delete request for Manager review."
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Forbidden: Your role ({current_user.role}) does not have permission to delete records."
    )

def enforce_engineer_self_service(current_user: User, target_engineer_id: Optional[UUID]):
    """
    Ensure users with Engineer role can only access/modify their own engineer profile and records.
    """
    if is_engineer_user(current_user):
        if not current_user.engineer_id or current_user.engineer_id != target_engineer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Engineers are only allowed to access and modify their own information."
            )

def get_engineer_and_verify(db: Session, engineer_id: UUID, current_user: User) -> Any:
    from app.models.engineer import Engineer
    eng = db.get(Engineer, engineer_id)
    if not eng:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engineer not found")
    enforce_company_isolation(db, current_user, eng.company_id)
    enforce_engineer_self_service(current_user, eng.engineer_id)
    return eng

def get_schedule_and_verify(db: Session, schedule_id: UUID, current_user: User) -> Any:
    from app.models.schedule import Schedule
    from app.models.engineer import Engineer
    sch = db.get(Schedule, schedule_id)
    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    eng = db.get(Engineer, sch.engineer_id)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    enforce_engineer_self_service(current_user, sch.engineer_id)
    return sch

def get_visa_and_verify(db: Session, visa_id: UUID, current_user: User) -> Any:
    from app.models.visa import Visa
    from app.models.engineer import Engineer
    visa = db.get(Visa, visa_id)
    if not visa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visa not found")
    eng = db.get(Engineer, visa.engineer_id)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    enforce_engineer_self_service(current_user, visa.engineer_id)
    return visa

def get_leave_and_verify(db: Session, leave_id: UUID, current_user: User) -> Any:
    from app.models.leave import Leave
    from app.models.engineer import Engineer
    lv = db.get(Leave, leave_id)
    if not lv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")
    eng = db.get(Engineer, lv.engineer_id)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    enforce_engineer_self_service(current_user, lv.engineer_id)
    return lv

def get_travel_and_verify(db: Session, travel_id: UUID, current_user: User) -> Any:
    from app.models.travel import TravelArrangement
    from app.models.schedule import Schedule
    from app.models.engineer import Engineer
    tr = db.get(TravelArrangement, travel_id)
    if not tr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel arrangement not found")
    sch = db.get(Schedule, tr.schedule_id)
    eng = db.get(Engineer, sch.engineer_id if sch else None)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    if sch:
        enforce_engineer_self_service(current_user, sch.engineer_id)
    return tr

def get_performance_and_verify(db: Session, performance_id: UUID, current_user: User) -> Any:
    from app.models.performance import Performance
    from app.models.schedule import Schedule
    from app.models.engineer import Engineer
    perf = db.get(Performance, performance_id)
    if not perf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance record not found")
    sch = db.get(Schedule, perf.schedule_id)
    eng = db.get(Engineer, sch.engineer_id if sch else None)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    if sch:
        enforce_engineer_self_service(current_user, sch.engineer_id)
    return perf

def get_missed_schedule_and_verify(db: Session, missed_id: UUID, current_user: User) -> Any:
    from app.models.missed_schedule import MissedSchedule
    from app.models.schedule import Schedule
    from app.models.engineer import Engineer
    ms = db.get(MissedSchedule, missed_id)
    if not ms:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Missed schedule record not found")
    sch = db.get(Schedule, ms.schedule_id)
    eng = db.get(Engineer, sch.engineer_id if sch else None)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    if sch:
        enforce_engineer_self_service(current_user, sch.engineer_id)
    return ms

def get_skill_and_verify(db: Session, skill_id: UUID, current_user: User) -> Any:
    from app.models.skill import Skill
    from app.models.engineer import Engineer
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill record not found")
    eng = db.get(Engineer, skill.engineer_id)
    enforce_company_isolation(db, current_user, eng.company_id if eng else None)
    enforce_engineer_self_service(current_user, skill.engineer_id)
    return skill
