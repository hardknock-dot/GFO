from sqlalchemy.orm import Session
from sqlalchemy import select, text, and_

from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid
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

def get_engineers(db: Session, company_id: Optional[Union[UUID, List[UUID]]] = None) -> List[Engineer]:
    stmt = select(Engineer)
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            stmt = stmt.where(Engineer.company_id.in_(company_id))
        else:
            stmt = stmt.where(Engineer.company_id == company_id)
    result = db.scalars(stmt).all()
    return list(result)

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
    db.execute(text("DELETE FROM engineer_deletion_requests WHERE engineer_id = :eid"), {"eid": engineer_id})
    db.execute(text("DELETE FROM delete_requests WHERE entity_type = 'Engineer' AND entity_id = :eid"), {"eid": engineer_id})

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
