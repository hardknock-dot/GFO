from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.schedule import Schedule
from app.models.engineer import Engineer
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.missed_schedule import MissedSchedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate
from fastapi import HTTPException, status

from sqlalchemy.orm import Session, aliased

def get_schedules_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    schedule_status: Optional[str] = None,
    comment_status: Optional[str] = None,
    has_comments: Optional[bool] = None,
    comment_adressal: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    SeniorEng = aliased(Engineer)
    stmt = (
        select(
            Schedule,
            Engineer.engineer_name,
            Engineer.orbit_id,
            SeniorEng.engineer_name.label("senior_engineer_name"),
            SeniorEng.orbit_id.label("senior_engineer_orbit_id"),
            SeniorEng.goes_by.label("senior_engineer_goes_by")
        )
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        .outerjoin(SeniorEng, Schedule.senior_engineer_id == SeniorEng.engineer_id)
    )
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if engineer_id:
        conditions.append(Schedule.engineer_id == engineer_id)

    if schedule_status:
        conditions.append(Schedule.schedule_status == schedule_status)

    if comment_adressal is False:
        conditions.append(
            and_(
                Schedule.remarks.isnot(None),
                Schedule.remarks != '',
                Schedule.remarks != 'None',
                Schedule.comment_adressal == False
            )
        )
    elif comment_adressal is True:
        conditions.append(Schedule.comment_adressal == True)
    elif comment_status:
        st = str(comment_status).upper().strip()
        if st in ("UNADDRESSED", "FALSE", "PENDING"):
            conditions.append(
                and_(
                    Schedule.remarks.isnot(None),
                    Schedule.remarks != '',
                    Schedule.remarks != 'None',
                    or_(
                        Schedule.comment_adressal == False,
                        Schedule.comment_status == 'UNADDRESSED'
                    )
                )
            )
        elif st in ("ADDRESSED", "TRUE"):
            conditions.append(or_(Schedule.comment_adressal == True, Schedule.comment_status == 'ADDRESSED'))

    if has_comments is True:
        conditions.append(and_(Schedule.remarks.isnot(None), Schedule.remarks != ''))
    elif has_comments is False:
        conditions.append(or_(Schedule.remarks.is_(None), Schedule.remarks == ''))

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Schedule.support_type.ilike(search_pattern),
                Schedule.country.ilike(search_pattern),
                Schedule.fab_city.ilike(search_pattern),
                Schedule.fab_site.ilike(search_pattern),
                Schedule.remarks.ilike(search_pattern),
                Engineer.engineer_name.ilike(search_pattern),
                Engineer.orbit_id.ilike(search_pattern),
                SeniorEng.engineer_name.ilike(search_pattern),
                SeniorEng.orbit_id.ilike(search_pattern)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Schedule.start_date.desc()).offset(offset).limit(page_size)

    rows = db.execute(stmt).all()
    items = []
    for sch, eng_name, orb_id, se_name, se_orb_id, se_goes_by in rows:
        sch.engineer_name = eng_name
        sch.orbit_id = orb_id
        sch._senior_engineer_name = se_name
        sch._senior_engineer_orbit_id = se_orb_id
        sch._senior_engineer_goes_by = se_goes_by
        items.append(sch)

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_schedules(db: Session, engineer_id: UUID) -> List[Schedule]:
    """
    Retrieve all schedule records associated with one engineer from PostgreSQL.
    """
    SeniorEng = aliased(Engineer)
    stmt = (
        select(
            Schedule,
            SeniorEng.engineer_name.label("senior_engineer_name"),
            SeniorEng.orbit_id.label("senior_engineer_orbit_id"),
            SeniorEng.goes_by.label("senior_engineer_goes_by")
        )
        .outerjoin(SeniorEng, Schedule.senior_engineer_id == SeniorEng.engineer_id)
        .where(Schedule.engineer_id == engineer_id)
        .order_by(Schedule.start_date.desc())
    )
    rows = db.execute(stmt).all()
    items = []
    for sch, se_name, se_orb_id, se_goes_by in rows:
        sch._senior_engineer_name = se_name
        sch._senior_engineer_orbit_id = se_orb_id
        sch._senior_engineer_goes_by = se_goes_by

        # Find engineers assigned under this engineer as Senior Engineer
        assigned_stmt = (
            select(Engineer)
            .join(Schedule, Schedule.engineer_id == Engineer.engineer_id)
            .where(Schedule.senior_engineer_id == engineer_id)
        )
        juniors = db.scalars(assigned_stmt).all()
        if juniors:
            seen = set()
            unique_juniors = []
            for j in juniors:
                if j.engineer_id not in seen and j.engineer_id != engineer_id:
                    seen.add(j.engineer_id)
                    unique_juniors.append({
                        "engineer_id": j.engineer_id,
                        "engineer_name": j.engineer_name,
                        "orbit_id": j.orbit_id,
                        "level": j.level
                    })
            sch.assigned_engineers = unique_juniors
        else:
            sch.assigned_engineers = []

        items.append(sch)
    return items

def create_schedule(db: Session, engineer_id: UUID, schedule_data: ScheduleCreate) -> Schedule:
    """
    Create a new schedule record associated with one engineer.
    """
    # 1. Verify engineer exists
    engineer = db.get(Engineer, engineer_id)
    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    senior_engineer_id = schedule_data.senior_engineer_id
    senior_eng_obj = None
    if senior_engineer_id is not None:
        if str(senior_engineer_id) == str(engineer_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Engineer cannot be assigned as their own Senior Engineer."
            )
        senior_eng_obj = db.get(Engineer, senior_engineer_id)
        if senior_eng_obj is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Senior Engineer not found"
            )
        if senior_eng_obj.company_id != engineer.company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senior Engineer must belong to the same company as the schedule engineer."
            )

    initial_adressal = schedule_data.comment_adressal
    if initial_adressal is None and schedule_data.remarks and schedule_data.remarks.strip():
        initial_adressal = False

    # 2. Create schedule
    db_schedule = Schedule(
        schedule_id=uuid.uuid4(),
        engineer_id=engineer_id,
        senior_engineer_id=senior_engineer_id,
        support_type=schedule_data.support_type,
        country=schedule_data.country,
        fab_city=schedule_data.fab_city,
        fab_site=schedule_data.fab_site,
        start_date=schedule_data.start_date,
        end_date=schedule_data.end_date,
        schedule_status=schedule_data.schedule_status or "Upcoming",
        remarks=schedule_data.remarks,
        comment_adressal=initial_adressal,
        comment_status="UNADDRESSED" if initial_adressal is False else ("ADDRESSED" if initial_adressal is True else None),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    if senior_eng_obj:
        db_schedule._senior_engineer_name = senior_eng_obj.engineer_name
        db_schedule._senior_engineer_orbit_id = senior_eng_obj.orbit_id
        db_schedule._senior_engineer_goes_by = senior_eng_obj.goes_by
    return db_schedule

def update_schedule(db: Session, schedule_id: UUID, schedule_data: ScheduleUpdate) -> Schedule:
    """
    Update an existing schedule record.
    """
    # 1. Find schedule
    db_schedule = db.get(Schedule, schedule_id)
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Validate dates if either start_date or end_date is updated
    new_start_date = schedule_data.start_date if schedule_data.start_date is not None else db_schedule.start_date
    new_end_date = schedule_data.end_date if schedule_data.end_date is not None else db_schedule.end_date
    if new_start_date is not None and new_end_date is not None:
        if new_end_date < new_start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="end_date should not be earlier than start_date"
            )

    # 3. Update senior engineer if present in payload
    senior_eng_obj = None
    if "senior_engineer_id" in schedule_data.model_fields_set:
        se_id = schedule_data.senior_engineer_id
        if se_id is not None:
            schedule_eng = db.get(Engineer, db_schedule.engineer_id)
            if str(se_id) == str(db_schedule.engineer_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Engineer cannot be assigned as their own Senior Engineer."
                )
            senior_eng_obj = db.get(Engineer, se_id)
            if senior_eng_obj is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Senior Engineer not found"
                )
            if schedule_eng and senior_eng_obj.company_id and schedule_eng.company_id:
                if str(senior_eng_obj.company_id).lower() != str(schedule_eng.company_id).lower():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Senior Engineer must belong to the same company as the schedule engineer."
                    )
            db_schedule.senior_engineer_id = se_id
        else:
            db_schedule.senior_engineer_id = None
    elif db_schedule.senior_engineer_id:
        senior_eng_obj = db.get(Engineer, db_schedule.senior_engineer_id)

    # 4. Update permitted fields
    if schedule_data.support_type is not None:
        db_schedule.support_type = schedule_data.support_type
    if schedule_data.country is not None:
        db_schedule.country = schedule_data.country
    if schedule_data.fab_city is not None:
        db_schedule.fab_city = schedule_data.fab_city
    if schedule_data.fab_site is not None:
        db_schedule.fab_site = schedule_data.fab_site
    if schedule_data.start_date is not None:
        db_schedule.start_date = schedule_data.start_date
    if schedule_data.end_date is not None:
        db_schedule.end_date = schedule_data.end_date
    if schedule_data.schedule_status is not None:
        db_schedule.schedule_status = schedule_data.schedule_status
    if schedule_data.remarks is not None:
        db_schedule.remarks = schedule_data.remarks
        if "comment_adressal" not in schedule_data.model_fields_set:
            if schedule_data.remarks and schedule_data.remarks.strip():
                db_schedule.comment_adressal = False
                db_schedule.comment_status = "UNADDRESSED"
            else:
                db_schedule.comment_adressal = None
                db_schedule.comment_status = None
    if "comment_adressal" in schedule_data.model_fields_set:
        if schedule_data.comment_adressal is False:
            db_schedule.comment_adressal = False
            db_schedule.comment_status = "UNADDRESSED"
        elif schedule_data.comment_adressal is True:
            db_schedule.comment_adressal = True
            db_schedule.comment_status = "ADDRESSED"
        else:
            db_schedule.comment_adressal = None
            db_schedule.comment_status = None
    elif "comment_status" in schedule_data.model_fields_set:
        st = str(schedule_data.comment_status).upper().strip() if schedule_data.comment_status else ""
        if st in ("ADDRESSED", "APPROVED", "TRUE"):
            db_schedule.comment_adressal = True
            db_schedule.comment_status = "ADDRESSED"
        elif st in ("UNADDRESSED", "FALSE", "PENDING"):
            db_schedule.comment_adressal = False
            db_schedule.comment_status = "UNADDRESSED"
        else:
            db_schedule.comment_status = schedule_data.comment_status

    db_schedule.updated_at = datetime.utcnow()
    db.commit()
    db.expire(db_schedule)
    db.refresh(db_schedule)
    if db_schedule.senior_engineer_id:
        se_check = senior_eng_obj or db.get(Engineer, db_schedule.senior_engineer_id)
        if se_check:
            db_schedule._senior_engineer_name = se_check.engineer_name
            db_schedule._senior_engineer_orbit_id = se_check.orbit_id
            db_schedule._senior_engineer_goes_by = se_check.goes_by
    else:
        db_schedule._senior_engineer_name = None
        db_schedule._senior_engineer_orbit_id = None
        db_schedule._senior_engineer_goes_by = None
    return db_schedule

def delete_schedule(db: Session, schedule_id: UUID) -> None:
    """
    Delete a schedule record after verifying no related records exist.
    """
    # 1. Find schedule
    db_schedule = db.get(Schedule, schedule_id)
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Check for child records in travel_arrangements, performances, missed_schedules
    has_travel = db.scalar(select(Travel).where(Travel.schedule_id == schedule_id).limit(1)) is not None
    has_perf = db.scalar(select(Performance).where(Performance.schedule_id == schedule_id).limit(1)) is not None
    has_missed = db.scalar(select(MissedSchedule).where(MissedSchedule.schedule_id == schedule_id).limit(1)) is not None

    if has_travel or has_perf or has_missed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Schedule cannot be deleted because related records exist."
        )

    # 3. Delete schedule
    db.delete(db_schedule)
    db.commit()
