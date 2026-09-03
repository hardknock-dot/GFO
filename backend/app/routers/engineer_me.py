import logging
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func

from app.database import get_db
from app.models.user import User
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.skill import Skill
from app.models.visa import Visa
from app.models.performance import Performance
from app.schemas.engineer import EngineerResponse
from app.schemas.schedule import ScheduleResponse, ScheduleCommentUpdate
from app.schemas.skill import SkillResponse, SkillCreate, SkillUpdate
from app.schemas.visa import VisaResponse, VisaCommentUpdate
from app.schemas.performance import PerformanceResponse
from app.schemas.leave import LeaveResponse, LeaveCreate
from app.services import engineer_service, skill_service, schedule_service, visa_service, performance_service, leave_service
from app.services.auth_service import get_current_user, enforce_company_isolation, is_engineer_user



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineer/me", tags=["engineer-me"], dependencies=[Depends(get_current_user)])

def get_current_engineer_profile(db: Session, current_user: User) -> Engineer:
    """
    Resolve the authenticated engineer record using users.engineer_id.
    """
    if current_user.engineer_id:
        eng = db.get(Engineer, current_user.engineer_id)
        if eng:
            enforce_company_isolation(current_user, eng.company_id)
            return eng
    
    # Fallback lookup by email if users.engineer_id is not yet set
    if current_user.email:
        eng = db.scalar(
            select(Engineer).where(
                and_(
                    func.lower(Engineer.email) == current_user.email.lower(),
                    Engineer.company_id == current_user.company_id
                )
            )
        )
        if eng:
            current_user.engineer_id = eng.engineer_id
            db.commit()
            return eng


    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No associated field engineer profile found for this user account."
    )

@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_my_skill(
    skill_data: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a new skill matrix record for the authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    return skill_service.create_skill(db, eng.engineer_id, skill_data)

@router.put("/skills/{skill_id}", response_model=SkillResponse)
def update_my_skill(
    skill_id: UUID,
    skill_data: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update skill record belonging to authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    if skill.engineer_id != eng.engineer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify another engineer's skill record."
        )
    return skill_service.update_skill(db, skill_id, skill_data)

@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_skill(
    skill_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a skill matrix record belonging to authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    if skill.engineer_id != eng.engineer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot delete another engineer's skill record."
        )
    skill_service.delete_skill(db, skill_id)
    return




from pydantic import BaseModel

class ContactUpdatePayload(BaseModel):
    email: Optional[str] = None
    phone_number: Optional[str] = None

@router.get("", response_model=EngineerResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve authenticated user's Engineer profile.
    """
    return get_current_engineer_profile(db, current_user)

@router.patch("/profile", response_model=EngineerResponse)
def update_my_contact_info(
    payload: ContactUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Field Engineer self-service contact details update (email, phone).
    """
    eng = get_current_engineer_profile(db, current_user)
    if payload.email:
        eng.email = payload.email
        current_user.email = payload.email
    if payload.phone_number:
        eng.phone_number = payload.phone_number
    eng.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(eng)
    return eng


@router.get("/schedules", response_model=List[ScheduleResponse])
def get_my_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve authenticated user's schedule records.
    """
    eng = get_current_engineer_profile(db, current_user)
    return schedule_service.get_engineer_schedules(db, eng.engineer_id)

@router.get("/schedules/next", response_model=Optional[ScheduleResponse])
def get_my_next_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve nearest future schedule for authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    today = date.today()
    stmt = (
        select(Schedule)
        .where(
            and_(
                Schedule.engineer_id == eng.engineer_id,
                Schedule.start_date >= today
            )
        )
        .order_by(Schedule.start_date.asc())
        .limit(1)
    )
    next_sch = db.scalar(stmt)
    return next_sch

@router.patch("/schedules/{schedule_id}/comments", response_model=ScheduleResponse)
def update_my_schedule_comments(
    schedule_id: UUID,
    payload: ScheduleCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update ONLY remarks field on schedule belonging to authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    sch = db.get(Schedule, schedule_id)
    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
    if sch.engineer_id != eng.engineer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify remarks on another engineer's schedule."
        )
    
    sch.remarks = payload.remarks
    if payload.remarks and payload.remarks.strip():
        sch.comment_adressal = False
        sch.comment_status = "UNADDRESSED"
    else:
        sch.comment_adressal = None
        sch.comment_status = None
    sch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sch)
    return sch

@router.get("/skills", response_model=List[SkillResponse])
def get_my_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve authenticated user's skill matrix records.
    """
    eng = get_current_engineer_profile(db, current_user)
    return skill_service.get_engineer_skills(db, eng.engineer_id)


@router.get("/visa", response_model=List[VisaResponse])
def get_my_visa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve authenticated user's visa records.
    """
    eng = get_current_engineer_profile(db, current_user)
    return visa_service.get_engineer_visa(db, eng.engineer_id)


@router.patch("/visa/{visa_id}/comments", response_model=VisaResponse)
def update_my_visa_comments(
    visa_id: UUID,
    payload: VisaCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update ONLY comments field on visa belonging to authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    visa = db.get(Visa, visa_id)
    if not visa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visa record not found.")
    if visa.engineer_id != eng.engineer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify comments on another engineer's visa record."
        )
    
    visa.comments = payload.comments
    visa.comment_status = "UNADDRESSED"
    visa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(visa)
    return visa


@router.get("/performance", response_model=List[PerformanceResponse])
def get_my_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve authenticated user's performance records (read-only).
    """
    eng = get_current_engineer_profile(db, current_user)
    # Query performance records through schedule relationship
    stmt = (
        select(Performance)
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)
        .where(Schedule.engineer_id == eng.engineer_id)
    )
    return db.scalars(stmt).all()

def generate_engineer_report_summary(db: Session, eng: Engineer):
    today = date.today()

    schedules = schedule_service.get_engineer_schedules(db, eng.engineer_id)
    skills = skill_service.get_engineer_skills(db, eng.engineer_id)
    visas = visa_service.get_engineer_visa(db, eng.engineer_id)

    # Performance
    perf_stmt = (
        select(Performance)
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)
        .where(Schedule.engineer_id == eng.engineer_id)
    )
    perfs = db.scalars(perf_stmt).all()
    
    avg_score = None
    if perfs:
        scores = [p.score for p in perfs if p.score is not None]
        if scores:
            avg_score = sum(scores) / len(scores)

    upcoming_count = len([s for s in schedules if s.start_date >= today and (s.schedule_status != 'Completed')])
    completed_count = len([s for s in schedules if s.schedule_status == 'Completed' or (s.end_date and s.end_date < today)])

    # Next schedule
    future_schedules = sorted([s for s in schedules if s.start_date >= today], key=lambda x: x.start_date)
    next_schedule = future_schedules[0] if future_schedules else None

    # Skills summary
    skills_summary = []
    for sk in skills:
        skills_summary.append({
            "category": sk.tool_type or "General Equipment",
            "tool_type": sk.tool_type or "Standard Tool",
            "number_of_tools": sk.number_of_tools or 1,
            "role": sk.role or "Engineer",
            "ready_for_primary_role": sk.ready_for_primary_role or False
        })

    return {
        "engineer_id": str(eng.engineer_id),
        "engineer_name": eng.engineer_name,
        "upcoming_schedules": upcoming_count,
        "active_skills": len(skills),
        "visa_records": len(visas),
        "performance_score": f"{round(avg_score, 1)}%" if avg_score is not None else "N/A",
        "raw_performance_score": avg_score,
        "schedules_completed": completed_count,
        "next_schedule": {
            "schedule_id": str(next_schedule.schedule_id) if next_schedule else None,
            "support_type": next_schedule.support_type if next_schedule else None,
            "country": next_schedule.country if next_schedule else None,
            "fab_city": next_schedule.fab_city if next_schedule else None,
            "fab_site": next_schedule.fab_site if next_schedule else None,
            "start_date": str(next_schedule.start_date) if next_schedule else None,
            "end_date": str(next_schedule.end_date) if next_schedule else None,
            "schedule_status": next_schedule.schedule_status if next_schedule else None,
            "remarks": next_schedule.remarks if next_schedule else None
        } if next_schedule else None,
        "skills_summary": skills_summary
    }

from fastapi import Query

@router.get("/reports/summary")
def get_my_reports_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve summary report data isolated strictly to the authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    return engineer_service.get_engineer_report_data(db, eng.engineer_id, start_date=start_date, end_date=end_date)


@router.post("/leaves", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_my_pto_request(
    leave_data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Field Engineer self-service PTO request endpoint.
    Automatically binds to authenticated engineer profile and sets status to 'PTO Requested'.
    """
    if current_user.is_active is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")
    
    if not is_engineer_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Field Engineers can submit self-service PTO requests."
        )

    eng = get_current_engineer_profile(db, current_user)
    
    # Overwrite approval_status to 'PTO Requested' for self-service requests
    leave_data.approval_status = "PTO Requested"
    
    return leave_service.create_leave(
        db=db,
        engineer_id=eng.engineer_id,
        leave_data=leave_data,
        owner_id=current_user.user_id
    )

@router.get("/leaves", response_model=List[LeaveResponse])
def get_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all leave records belonging to authenticated engineer.
    """
    eng = get_current_engineer_profile(db, current_user)
    return leave_service.get_engineer_leaves(db, eng.engineer_id)


