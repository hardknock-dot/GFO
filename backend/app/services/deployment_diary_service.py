import uuid
import math
from datetime import date, datetime
from typing import List, Optional, Dict, Any, Union
from uuid import UUID

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.deployment_diary import DeploymentDiary
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.schemas.deployment_diary import DeploymentDiaryCreate, DeploymentDiaryUpdate

def get_active_schedules_for_engineer(
    db: Session,
    engineer_id: UUID,
    company_id: UUID,
    as_of_date: Optional[date] = None
) -> List[Schedule]:
    """
    Retrieve active schedules for an engineer where start_date <= today and (end_date >= today OR end_date IS NULL).
    """
    target_date = as_of_date or date.today()
    stmt = (
        select(Schedule)
        .where(
            and_(
                Schedule.engineer_id == engineer_id,
                Schedule.start_date <= target_date,
                or_(Schedule.end_date.is_(None), Schedule.end_date >= target_date),
                or_(Schedule.schedule_status.is_(None), Schedule.schedule_status != 'Completed')
            )
        )
        .order_by(Schedule.start_date.desc())
    )
    return db.scalars(stmt).all()

def enrich_diary_metadata(db: Session, diary: DeploymentDiary) -> DeploymentDiary:
    """
    Enrich DeploymentDiary instance with associated Schedule and Engineer details for API serialization.
    """
    fab_site = None
    fab_city = None
    country = None
    support_type = None

    if diary.schedule_id:
        sch = db.get(Schedule, diary.schedule_id)
        if sch:
            fab_site = sch.fab_site
            fab_city = sch.fab_city
            country = sch.country
            support_type = sch.support_type

    engineer_name = None
    if diary.engineer_id:
        eng = db.get(Engineer, diary.engineer_id)
        if eng:
            engineer_name = eng.engineer_name
            if not country:
                country = getattr(eng, 'country', None)

    setattr(diary, 'fab_site', fab_site)
    setattr(diary, 'fab_city', fab_city)
    setattr(diary, 'country', country)
    setattr(diary, 'support_type', support_type)
    setattr(diary, 'engineer_name', engineer_name)

    return diary

def get_deployment_diaries(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    schedule_id: Optional[UUID] = None,
    entry_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Retrieve paginated deployment diary records with company isolation and filters.
    """
    stmt = (
        select(
            DeploymentDiary,
            Schedule.fab_site,
            Schedule.fab_city,
            Schedule.country.label("schedule_country"),
            Schedule.support_type,
            Engineer.engineer_name
        )
        .outerjoin(Schedule, DeploymentDiary.schedule_id == Schedule.schedule_id)
        .join(Engineer, DeploymentDiary.engineer_id == Engineer.engineer_id)
    )

    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(DeploymentDiary.company_id.in_(company_id))
        else:
            conditions.append(DeploymentDiary.company_id == company_id)

    if engineer_id:
        conditions.append(DeploymentDiary.engineer_id == engineer_id)

    if schedule_id:
        conditions.append(DeploymentDiary.schedule_id == schedule_id)

    if entry_date:
        conditions.append(DeploymentDiary.entry_date == entry_date)

    if start_date:
        conditions.append(DeploymentDiary.entry_date >= start_date)

    if end_date:
        conditions.append(DeploymentDiary.entry_date <= end_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                DeploymentDiary.entry.ilike(search_pattern),
                Schedule.fab_site.ilike(search_pattern),
                Schedule.fab_city.ilike(search_pattern),
                Schedule.country.ilike(search_pattern),
                Schedule.support_type.ilike(search_pattern),
                Engineer.engineer_name.ilike(search_pattern)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(DeploymentDiary.entry_date), desc(DeploymentDiary.created_at)).offset(offset).limit(page_size)

    rows = db.execute(stmt).all()
    items = []
    for diary, fab_site, fab_city, sch_country, supp_type, eng_name in rows:
        diary.fab_site = fab_site
        diary.fab_city = fab_city
        diary.country = sch_country
        diary.support_type = supp_type
        diary.engineer_name = eng_name
        items.append(diary)

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_deployment_diary_by_id(db: Session, diary_id: UUID) -> DeploymentDiary:
    """
    Retrieve single deployment diary record.
    """
    diary = db.get(DeploymentDiary, diary_id)
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment diary entry not found"
        )
    return enrich_diary_metadata(db, diary)

def create_deployment_diary(
    db: Session,
    company_id: UUID,
    engineer_id: UUID,
    diary_data: DeploymentDiaryCreate
) -> DeploymentDiary:
    """
    Create a new deployment diary entry.
    """
    eng = db.get(Engineer, engineer_id)
    if not eng:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer profile not found"
        )
    if eng.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Engineer does not belong to the target company context"
        )

    if diary_data.schedule_id:
        sch = db.get(Schedule, diary_data.schedule_id)
        if not sch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected deployment schedule not found"
            )
        if sch.engineer_id != engineer_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Selected schedule does not belong to the specified engineer"
            )

    db_diary = DeploymentDiary(
        id=uuid.uuid4(),
        engineer_id=engineer_id,
        company_id=company_id,
        schedule_id=diary_data.schedule_id,
        entry_date=diary_data.entry_date or date.today(),
        entry=diary_data.entry,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_diary)
    db.commit()
    db.refresh(db_diary)
    return enrich_diary_metadata(db, db_diary)

def update_deployment_diary(
    db: Session,
    diary_id: UUID,
    diary_data: DeploymentDiaryUpdate
) -> DeploymentDiary:
    """
    Update an existing deployment diary entry.
    """
    db_diary = db.get(DeploymentDiary, diary_id)
    if not db_diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment diary entry not found"
        )

    fields_set = diary_data.model_fields_set

    if "schedule_id" in fields_set and diary_data.schedule_id is not None:
        sch = db.get(Schedule, diary_data.schedule_id)
        if not sch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected deployment schedule not found"
            )
        if sch.engineer_id != db_diary.engineer_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Selected schedule does not belong to the specified engineer"
            )
        db_diary.schedule_id = diary_data.schedule_id
    elif "schedule_id" in fields_set and diary_data.schedule_id is None:
        db_diary.schedule_id = None

    if "entry_date" in fields_set and diary_data.entry_date is not None:
        db_diary.entry_date = diary_data.entry_date

    if "entry" in fields_set and diary_data.entry is not None:
        if not diary_data.entry.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Diary entry text cannot be empty"
            )
        db_diary.entry = diary_data.entry

    db_diary.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_diary)
    return enrich_diary_metadata(db, db_diary)

def delete_deployment_diary(db: Session, diary_id: UUID) -> None:
    """
    Delete an existing deployment diary entry.
    """
    db_diary = db.get(DeploymentDiary, diary_id)
    if not db_diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment diary entry not found"
        )
    db.delete(db_diary)
    db.commit()
