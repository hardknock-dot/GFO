import logging
from sqlalchemy import select, text, and_, or_, func, String, exists, not_
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime, date

from app.models.engineer import Engineer
from app.models.company import Company
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.leave import Leave
from app.models.performance import Performance
from app.schemas.engineer import EngineerCreate, EngineerUpdate
from app.services.audit_service import log_audit, object_to_dict
from fastapi import HTTPException, status

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def get_engineer_filter_options(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None
) -> Dict[str, Any]:
    # 1. Distinct Tool Modules (from engineers.primary_tool_type and skills.tool_type)
    tm_stmt = select(Engineer.primary_tool_type).where(
        Engineer.primary_tool_type.isnot(None),
        Engineer.primary_tool_type != ""
    )
    if company_id:
        if isinstance(company_id, list):
            tm_stmt = tm_stmt.where(Engineer.company_id.in_(company_id))
        else:
            tm_stmt = tm_stmt.where(Engineer.company_id == company_id)

    try:
        raw_tms = db.scalars(tm_stmt.distinct()).all()
    except Exception as e:
        logger.warning("Error fetching tool modules from DB: %s", e)
        raw_tms = []

    sk_stmt = select(Skill.tool_type).where(
        Skill.tool_type.isnot(None),
        Skill.tool_type != ""
    )
    if company_id:
        if isinstance(company_id, list):
            sk_stmt = sk_stmt.join(Engineer, Skill.engineer_id == Engineer.engineer_id).where(Engineer.company_id.in_(company_id))
        else:
            sk_stmt = sk_stmt.join(Engineer, Skill.engineer_id == Engineer.engineer_id).where(Engineer.company_id == company_id)

    try:
        sk_tms = db.scalars(sk_stmt.distinct()).all()
    except Exception as e:
        logger.warning("Error fetching skill tool modules from DB: %s", e)
        sk_tms = []

    all_tms = set()
    for tm in (list(raw_tms) + list(sk_tms)):
        if not tm or not str(tm).strip():
            continue
        s_val = str(tm).strip()
        sub_items = [item.strip() for item in s_val.replace('\n', ',').split(',') if item and item.strip()]
        for item in sub_items:
            all_tms.add(item)
        cleaned_full = ' '.join(s_val.split())
        if cleaned_full:
            all_tms.add(cleaned_full)
    tool_modules = sorted(list(all_tms), key=lambda s: s.lower())

    # 2. Distinct Tool Names (from skills.tool_type and engineers.primary_tool_type)
    tn_stmt = select(Skill.tool_type).where(
        Skill.tool_type.isnot(None),
        Skill.tool_type != ""
    )
    if company_id:
        if isinstance(company_id, list):
            tn_stmt = tn_stmt.join(Engineer, Skill.engineer_id == Engineer.engineer_id).where(Engineer.company_id.in_(company_id))
        else:
            tn_stmt = tn_stmt.join(Engineer, Skill.engineer_id == Engineer.engineer_id).where(Engineer.company_id == company_id)

    try:
        raw_tns = db.scalars(tn_stmt.distinct()).all()
    except Exception as e:
        logger.warning("Error fetching tool names from DB: %s", e)
        raw_tns = []

    all_tns = set()
    for tn in (list(raw_tns) + list(raw_tms)):
        if not tn or not str(tn).strip():
            continue
        s_val = str(tn).strip()
        sub_items = [item.strip() for item in s_val.replace('\n', ',').split(',') if item and item.strip()]
        for item in sub_items:
            all_tns.add(item)
        cleaned_full = ' '.join(s_val.split())
        if cleaned_full:
            all_tns.add(cleaned_full)
    tool_names = sorted(list(all_tns), key=lambda s: s.lower())

    # 3. Distinct Countries (from engineers' ongoing schedules in schedules table)
    today = date.today()
    c_stmt = (
        select(Schedule.country)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        .where(
            Schedule.start_date <= today,
            or_(Schedule.end_date >= today, Schedule.end_date.is_(None)),
            Schedule.country.isnot(None),
            Schedule.country != ""
        )
        .distinct()
    )
    if company_id:
        if isinstance(company_id, list):
            c_stmt = c_stmt.where(Engineer.company_id.in_(company_id))
        else:
            c_stmt = c_stmt.where(Engineer.company_id == company_id)

    try:
        raw_cs = db.scalars(c_stmt).all()
    except Exception as e:
        logger.warning("Error fetching countries from DB: %s", e)
        raw_cs = []

    real_countries = sorted(
        list(set(c.strip() for c in raw_cs if c and str(c).strip() and str(c).strip().lower() != "no schedule")),
        key=lambda s: s.lower()
    )
    countries = real_countries + ["No Schedule"]

    # 4. Distinct Fabs / Sites (from engineers' ongoing schedules in schedules table)
    f_stmt = (
        select(Schedule.fab_site)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        .where(
            Schedule.start_date <= today,
            or_(Schedule.end_date >= today, Schedule.end_date.is_(None)),
            Schedule.fab_site.isnot(None),
            Schedule.fab_site != ""
        )
        .distinct()
    )
    if company_id:
        if isinstance(company_id, list):
            f_stmt = f_stmt.where(Engineer.company_id.in_(company_id))
        else:
            f_stmt = f_stmt.where(Engineer.company_id == company_id)

    try:
        raw_fs = db.scalars(f_stmt).all()
    except Exception as e:
        logger.warning("Error fetching fabs from DB: %s", e)
        raw_fs = []

    real_fabs = sorted(
        list(set(f.strip() for f in raw_fs if f and str(f).strip() and str(f).strip().lower() != "no schedule")),
        key=lambda s: s.lower()
    )
    fabs = real_fabs + ["No Schedule"]

    # 5. Consumer Experience Min/Max
    exp_stmt = select(
        func.min(Engineer.lam_experience),
        func.max(Engineer.lam_experience),
        func.min(Engineer.industry_experience),
        func.max(Engineer.industry_experience)
    )
    if company_id:
        if isinstance(company_id, list):
            exp_stmt = exp_stmt.where(Engineer.company_id.in_(company_id))
        else:
            exp_stmt = exp_stmt.where(Engineer.company_id == company_id)

    try:
        res = db.execute(exp_stmt).first()
        c_min = float(res[0]) if res and res[0] is not None else 0.0
        c_max = float(res[1]) if res and res[1] is not None else 20.0
        i_min = float(res[2]) if res and res[2] is not None else 0.0
        i_max = float(res[3]) if res and res[3] is not None else 20.0
    except Exception as e:
        logger.warning("Error fetching experience bounds from DB: %s", e)
        c_min, c_max, i_min, i_max = 0.0, 20.0, 0.0, 20.0

    return {
        "tool_modules": tool_modules,
        "tool_names": tool_names,
        "countries": countries,
        "fabs": fabs,
        "consumer_experience": {
            "min": int(math.floor(c_min)),
            "max": int(math.ceil(max(c_max, 1.0)))
        },
        "customer_experience": {
            "min": int(math.floor(c_min)),
            "max": int(math.ceil(max(c_max, 1.0)))
        },
        "industry_experience": {
            "min": int(math.floor(i_min)),
            "max": int(math.ceil(max(i_max, 1.0)))
        }
    }

def get_engineers_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    search: Optional[str] = None,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    level_filter: Optional[str] = None,
    primary_tool_filter: Optional[str] = None,
    tool_name_filter: Optional[str] = None,
    tool_modules: Optional[List[str]] = None,
    tool_names: Optional[List[str]] = None,
    consumer_min: Optional[float] = None,
    consumer_max: Optional[float] = None,
    industry_min: Optional[float] = None,
    industry_max: Optional[float] = None,
    country_filter: Optional[str] = None,
    countries: Optional[List[str]] = None,
    fab_filter: Optional[str] = None,
    fabs: Optional[List[str]] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(Engineer)
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    # 1. Primary Search across name, orbit_id, company_id (cast text), goes_by
    effective_search = q if (q is not None and q.strip()) else search
    if effective_search and effective_search.strip():
        pattern = f"%{effective_search.strip()}%"
        conditions.append(
            or_(
                Engineer.engineer_name.ilike(pattern),
                Engineer.orbit_id.ilike(pattern),
                func.cast(Engineer.company_id, String).ilike(pattern),
                Engineer.goes_by.ilike(pattern),
                Engineer.lam_id.ilike(pattern),
                Engineer.email.ilike(pattern),
                Engineer.level.ilike(pattern),
                Engineer.primary_tool_type.ilike(pattern)
            )
        )

    # 2. Consumer Experience Slider Range Filter (customer_experience / lam_experience)
    if consumer_min is not None:
        conditions.append(func.coalesce(Engineer.lam_experience, 0.0) >= consumer_min)
    if consumer_max is not None:
        conditions.append(func.coalesce(Engineer.lam_experience, 0.0) <= consumer_max)

    # 3. Industry Experience Slider Range Filter (industry_experience)
    if industry_min is not None:
        conditions.append(func.coalesce(Engineer.industry_experience, 0.0) >= industry_min)
    if industry_max is not None:
        conditions.append(func.coalesce(Engineer.industry_experience, 0.0) <= industry_max)

    # 4. Tool Module Multi-Select Filter (engineers.primary_tool_type & skills.tool_type / wafer_size)
    if tool_modules:
        clean_modules = [m.strip() for m in tool_modules if m and m.strip()]
        if clean_modules:
            mod_or_list = []
            for m in clean_modules:
                pattern = f"%{m}%"
                mod_or_list.append(Engineer.primary_tool_type.ilike(pattern))
                mod_or_list.append(
                    Engineer.engineer_id.in_(
                        select(Skill.engineer_id).where(
                            or_(
                                Skill.tool_type.ilike(pattern),
                                Skill.wafer_size.ilike(pattern)
                            )
                        )
                    )
                )
            conditions.append(or_(*mod_or_list))
    elif primary_tool_filter and primary_tool_filter.strip():
        pts = [p.strip() for p in primary_tool_filter.split(',') if p.strip()]
        mod_or_list = []
        for p in pts:
            pattern = f"%{p}%"
            mod_or_list.append(Engineer.primary_tool_type.ilike(pattern))
            mod_or_list.append(
                Engineer.engineer_id.in_(
                    select(Skill.engineer_id).where(
                        or_(
                            Skill.tool_type.ilike(pattern),
                            Skill.wafer_size.ilike(pattern)
                        )
                    )
                )
            )
        if mod_or_list:
            conditions.append(or_(*mod_or_list))

    # 5. Tool Name Multi-Select Filter (skills.tool_type & engineers.primary_tool_type)
    if tool_names:
        clean_names = [n.strip() for n in tool_names if n and n.strip()]
        if clean_names:
            name_or_list = []
            for n in clean_names:
                pattern = f"%{n}%"
                name_or_list.append(Engineer.primary_tool_type.ilike(pattern))
                name_or_list.append(
                    Engineer.engineer_id.in_(
                        select(Skill.engineer_id).where(Skill.tool_type.ilike(pattern))
                    )
                )
            conditions.append(or_(*name_or_list))
    elif tool_name_filter and tool_name_filter.strip():
        tns = [t.strip() for t in tool_name_filter.split(',') if t.strip()]
        name_or_list = []
        for t in tns:
            pattern = f"%{t}%"
            name_or_list.append(Engineer.primary_tool_type.ilike(pattern))
            name_or_list.append(
                Engineer.engineer_id.in_(
                    select(Skill.engineer_id).where(Skill.tool_type.ilike(pattern))
                )
            )
        if name_or_list:
            conditions.append(or_(*name_or_list))

    # 6. Current Country Filter (derived DIRECTLY from schedules table using EXISTS / NOT EXISTS)
    today = date.today()
    all_country_queries = []
    if countries:
        all_country_queries.extend([c.strip() for c in countries if c and c.strip()])
    if country_filter and country_filter.strip() and country_filter.lower() != "all":
        for part in country_filter.split(","):
            part_str = part.strip()
            if part_str and part_str.lower() != "all" and part_str not in all_country_queries:
                all_country_queries.append(part_str)

    if all_country_queries:
        has_no_schedule = any(c.lower() == "no schedule" for c in all_country_queries)
        real_countries = [c for c in all_country_queries if c.lower() != "no schedule"]

        c_subconds = []
        if real_countries:
            c_matches = [Schedule.country.ilike(c) for c in real_countries]
            c_subconds.append(
                exists().where(
                    and_(
                        Schedule.engineer_id == Engineer.engineer_id,
                        Schedule.start_date <= today,
                        or_(Schedule.end_date >= today, Schedule.end_date.is_(None)),
                        or_(*c_matches)
                    )
                )
            )
        if has_no_schedule:
            c_subconds.append(
                not_(
                    exists().where(
                        and_(
                            Schedule.engineer_id == Engineer.engineer_id,
                            Schedule.start_date <= today,
                            or_(Schedule.end_date >= today, Schedule.end_date.is_(None))
                        )
                    )
                )
            )
        if c_subconds:
            conditions.append(or_(*c_subconds))

    # 7. Current Fab Filter (derived DIRECTLY from schedules table using EXISTS / NOT EXISTS)
    all_fab_queries = []
    if fabs:
        all_fab_queries.extend([f.strip() for f in fabs if f and f.strip()])
    if fab_filter and fab_filter.strip() and fab_filter.lower() != "all":
        for part in fab_filter.split(","):
            part_str = part.strip()
            if part_str and part_str.lower() != "all" and part_str not in all_fab_queries:
                all_fab_queries.append(part_str)

    if all_fab_queries:
        has_no_fab_schedule = any(f.lower() == "no schedule" for f in all_fab_queries)
        real_fabs = [f for f in all_fab_queries if f.lower() != "no schedule"]

        f_subconds = []
        if real_fabs:
            f_matches = [Schedule.fab_site.ilike(f"%{f}%") for f in real_fabs]
            f_subconds.append(
                exists().where(
                    and_(
                        Schedule.engineer_id == Engineer.engineer_id,
                        Schedule.start_date <= today,
                        or_(Schedule.end_date >= today, Schedule.end_date.is_(None)),
                        or_(*f_matches)
                    )
                )
            )
        if has_no_fab_schedule:
            f_subconds.append(
                not_(
                    exists().where(
                        and_(
                            Schedule.engineer_id == Engineer.engineer_id,
                            Schedule.start_date <= today,
                            or_(Schedule.end_date >= today, Schedule.end_date.is_(None)),
                            Schedule.fab_site.isnot(None),
                            Schedule.fab_site != ""
                        )
                    )
                )
            )
        if f_subconds:
            conditions.append(or_(*f_subconds))

    # 8. Additional legacy filters
    if status_filter and status_filter.strip() and status_filter.lower() != "all":
        conditions.append(Engineer.status == status_filter.strip())
    if level_filter and level_filter.strip() and level_filter.lower() != "all":
        conditions.append(Engineer.level == level_filter.strip())

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Count total matching rows
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    # Paginate in PostgreSQL
    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Engineer.engineer_name.asc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    # Bulk pre-fetch current ongoing schedules for all returned engineers to prevent N+1 query overhead
    if items:
        try:
            eng_ids = [item.engineer_id for item in items]
            all_schedules = db.scalars(
                select(Schedule)
                .where(Schedule.engineer_id.in_(eng_ids))
                .order_by(Schedule.start_date.desc())
            ).all()

            sched_map = {}
            for s in all_schedules:
                eid = s.engineer_id
                s_is_active = bool(s.start_date and s.start_date <= today and (not s.end_date or s.end_date >= today))
                if s_is_active and eid not in sched_map:
                    sched_map[eid] = s

            for item in items:
                item._cached_current_schedule = sched_map.get(item.engineer_id)
        except Exception as e:
            logger.warning("Could not pre-fetch current schedules: %s", str(e))

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineers(db: Session, company_id: Optional[Union[UUID, List[UUID]]] = None) -> List[Engineer]:
    stmt = select(Engineer)
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            stmt = stmt.where(Engineer.company_id.in_(company_id))
        else:
            stmt = stmt.where(Engineer.company_id == company_id)
    return list(db.scalars(stmt).all())

def get_engineer_by_id(db: Session, engineer_id: UUID) -> Optional[Engineer]:
    return db.get(Engineer, engineer_id)

def create_engineer(db: Session, engineer_data: EngineerCreate, current_user_id: Optional[UUID] = None) -> Engineer:
    company = db.get(Company, engineer_data.company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    existing = db.scalars(
        select(Engineer).where(Engineer.orbit_id == engineer_data.orbit_id)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An engineer with this Orbit ID already exists."
        )

    db_engineer = Engineer(
        engineer_id=uuid.uuid4(),
        company_id=engineer_data.company_id,
        engineer_name=engineer_data.engineer_name,
        goes_by=engineer_data.goes_by,
        lam_id=engineer_data.employee_id,
        orbit_id=engineer_data.orbit_id,
        level=engineer_data.level,
        date_of_joining=engineer_data.date_of_joining,
        primary_tool_type=engineer_data.primary_tool,
        lam_experience=engineer_data.customer_experience,
        industry_experience=engineer_data.industry_experience,
        status=engineer_data.status,
        email=engineer_data.email,
        phone_number=engineer_data.phone_number,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_engineer)
    db.commit()
    db.refresh(db_engineer)

    if current_user_id:
        log_audit(
            db=db,
            user_id=current_user_id,
            company_id=db_engineer.company_id,
            action="CREATE",
            entity_type="Engineer",
            entity_id=db_engineer.engineer_id,
            description=f"Engineer created: {db_engineer.engineer_name} ({db_engineer.orbit_id})",
            new_values=object_to_dict(db_engineer)
        )

    return db_engineer

def update_engineer(db: Session, engineer_id: UUID, engineer_data: EngineerUpdate, current_user_id: Optional[UUID] = None) -> Engineer:
    db_engineer = db.get(Engineer, engineer_id)
    if db_engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    old_dict = object_to_dict(db_engineer)
    update_dict = engineer_data.model_dump(exclude_unset=True)

    new_orbit_id = update_dict.get("orbit_id")
    if new_orbit_id is not None and new_orbit_id != db_engineer.orbit_id:
        existing = db.scalars(
            select(Engineer).where(Engineer.orbit_id == new_orbit_id)
        ).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An engineer with this Orbit ID already exists."
            )

    if "engineer_name" in update_dict:
        db_engineer.engineer_name = update_dict["engineer_name"]
    if "goes_by" in update_dict:
        db_engineer.goes_by = update_dict["goes_by"]
    if "employee_id" in update_dict:
        db_engineer.lam_id = update_dict["employee_id"]
    if "orbit_id" in update_dict:
        db_engineer.orbit_id = update_dict["orbit_id"]
    if "level" in update_dict:
        db_engineer.level = update_dict["level"]
    if "date_of_joining" in update_dict:
        db_engineer.date_of_joining = update_dict["date_of_joining"]
    if "primary_tool" in update_dict:
        db_engineer.primary_tool_type = update_dict["primary_tool"]
    if "customer_experience" in update_dict:
        db_engineer.lam_experience = update_dict["customer_experience"]
    if "industry_experience" in update_dict:
        db_engineer.industry_experience = update_dict["industry_experience"]
    if "status" in update_dict:
        db_engineer.status = update_dict["status"]
    if "email" in update_dict:
        db_engineer.email = update_dict["email"]
    if "phone_number" in update_dict:
        db_engineer.phone_number = update_dict["phone_number"]

    db_engineer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_engineer)

    if current_user_id:
        log_audit(
            db=db,
            user_id=current_user_id,
            company_id=db_engineer.company_id,
            action="UPDATE",
            entity_type="Engineer",
            entity_id=db_engineer.engineer_id,
            description=f"Engineer updated: {db_engineer.engineer_name}",
            old_values=old_dict,
            new_values=object_to_dict(db_engineer)
        )

    return db_engineer

def delete_engineer(db: Session, engineer_id: UUID, current_user_id: Optional[UUID] = None) -> None:
    db_engineer = db.get(Engineer, engineer_id)
    if db_engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    old_dict = object_to_dict(db_engineer)
    company_id = db_engineer.company_id
    engineer_email = db_engineer.email

    schedule_ids = db.scalars(
        select(Schedule.schedule_id).where(Schedule.engineer_id == engineer_id)
    ).all()

    if schedule_ids:
        s_id_list = list(schedule_ids)
        db.execute(text("DELETE FROM travel_arrangements WHERE schedule_id = ANY(:sids)"), {"sids": s_id_list})
        db.execute(text("DELETE FROM performances WHERE schedule_id = ANY(:sids)"), {"sids": s_id_list})
        db.execute(text("DELETE FROM missed_schedules WHERE schedule_id = ANY(:sids)"), {"sids": s_id_list})

    db.execute(text("DELETE FROM skills WHERE engineer_id = :eid"), {"eid": engineer_id})
    db.execute(text("DELETE FROM visa_details WHERE engineer_id = :eid"), {"eid": engineer_id})
    db.execute(text("DELETE FROM leaves WHERE engineer_id = :eid"), {"eid": engineer_id})
    db.execute(text("DELETE FROM schedules WHERE engineer_id = :eid"), {"eid": engineer_id})
    db.execute(text("DELETE FROM engineer_deletion_requests WHERE engineer_id = :eid AND status = 'PENDING'"), {"eid": engineer_id})
    db.execute(text("DELETE FROM delete_requests WHERE entity_type = 'Engineer' AND entity_id = :eid AND status = 'PENDING'"), {"eid": engineer_id})

    if engineer_email:
        db.execute(text("DELETE FROM users WHERE email = :email AND role IN ('Field Engineer', 'Engineer')"), {"email": engineer_email})
    db.execute(text("DELETE FROM users WHERE engineer_id = :eid AND role IN ('Field Engineer', 'Engineer')"), {"eid": engineer_id})
    db.execute(text("UPDATE users SET engineer_id = NULL WHERE engineer_id = :eid"), {"eid": engineer_id})

    db.delete(db_engineer)
    db.commit()

    if current_user_id:
        log_audit(
            db=db,
            user_id=current_user_id,
            company_id=company_id,
            action="DELETE",
            entity_type="Engineer",
            entity_id=engineer_id,
            description=f"Engineer deleted: {old_dict.get('engineer_name', '')} ({old_dict.get('orbit_id', '')})",
            old_values=old_dict,
            new_values=None
        )

def get_engineer_report_data(
    db: Session,
    engineer_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    eng = db.get(Engineer, engineer_id)
    if not eng:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engineer not found.")

    # 1. Schedules / Deployments
    sch_query = select(Schedule).where(Schedule.engineer_id == engineer_id)
    if start_date:
        sch_query = sch_query.where(Schedule.start_date >= start_date)
    if end_date:
        sch_query = sch_query.where(Schedule.start_date <= end_date)
    
    schedules = db.scalars(sch_query.order_by(Schedule.start_date.desc())).all()

    # 2. Performance / Feedback / Escalations
    perf_query = select(Performance).join(Schedule, Performance.schedule_id == Schedule.schedule_id).where(Schedule.engineer_id == engineer_id)
    if start_date:
        perf_query = perf_query.where(Performance.actual_start_date >= start_date)
    if end_date:
        perf_query = perf_query.where(Performance.actual_start_date <= end_date)
    
    performances = db.scalars(perf_query).all()

    scores = [p.score for p in performances if p.score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    escalations = []
    praises = []

    for p in performances:
        if p.escalation:
            escalations.append({
                "performance_id": str(p.performance_id),
                "schedule_id": str(p.schedule_id),
                "escalation_reason": p.escalation_reason or "Unspecified Escalation",
                "feedback": p.feedback,
                "score": p.score,
                "date": p.actual_start_date.isoformat() if p.actual_start_date else None
            })
        elif p.feedback:
            praises.append({
                "performance_id": str(p.performance_id),
                "schedule_id": str(p.schedule_id),
                "feedback": p.feedback,
                "score": p.score,
                "date": p.actual_start_date.isoformat() if p.actual_start_date else None
            })

    # Deployments summary
    deployments = []
    countries = set()
    for s in schedules:
        if s.country:
            countries.add(s.country)
        deployments.append({
            "schedule_id": str(s.schedule_id),
            "country": s.country or "Unknown",
            "fab_city": s.fab_city or "N/A",
            "fab_site": s.fab_site or "N/A",
            "support_type": s.support_type or "N/A",
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "status": s.schedule_status or "Unknown"
        })

    return {
        "engineer_id": str(eng.engineer_id),
        "engineer_name": eng.engineer_name,
        "orbit_id": eng.orbit_id,
        "level": eng.level,
        "email": eng.email,
        "phone_number": eng.phone_number,
        "date_from": start_date.isoformat() if start_date else None,
        "date_to": end_date.isoformat() if end_date else None,
        "performance_score": f"{avg_score}%" if avg_score is not None else "N/A",
        "raw_performance_score": avg_score,
        "total_deployments": len(deployments),
        "unique_countries_count": len(countries),
        "countries": list(countries),
        "escalations": escalations,
        "escalations_count": len(escalations),
        "praises": praises,
        "praises_count": len(praises),
        "deployments": deployments,
        "raises": [],
        "raises_note": "Raise and compensation history feature pending database schema update (salary_history table proposal)."
    }
