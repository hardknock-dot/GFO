import logging
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import select, func, and_, or_, desc, asc

from app.models.ion_skill import IonSkillTool, IonSkillExperience, IonSkillAssessment
from app.models.engineer import Engineer
from app.models.user import User
from app.schemas.ion_skill import (
    IonSkillExperienceCreate,
    IonSkillExperienceUpdate,
    IonSkillAssessmentCreateItem,
    IonSkillAssessmentUpdateItem,
    IonSkillAssessmentResponse,
    IonSkillExperienceResponse,
    IonEngineerCurrentSkillItem,
    IonEngineerSkillSummaryResponse,
    IonSkillHistoryItem
)
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

ION_COMPANY_ID = UUID("f81bd16c-2f63-4818-a653-7486fe3f45ec")


def get_all_tools(db: Session, active_only: bool = True) -> List[IonSkillTool]:
    """
    Fetch ION skill tools sorted by display_order.
    """
    stmt = select(IonSkillTool)
    if active_only:
        stmt = stmt.where(IonSkillTool.is_active.is_(True))
    stmt = stmt.order_by(IonSkillTool.display_order.asc(), IonSkillTool.tool_name.asc())
    return list(db.scalars(stmt).all())


def verify_ion_engineer(db: Session, engineer_id: UUID) -> Engineer:
    """
    Verify that engineer exists and strictly belongs to the Axcelis ION company.
    """
    engineer = db.get(Engineer, engineer_id)
    if not engineer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engineer with ID '{engineer_id}' not found."
        )
    if engineer.company_id != ION_COMPANY_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Engineer '{engineer.engineer_name}' does not belong to Axcelis Technologies (ION). ION Skill experiences are restricted to ION engineers."
        )
    return engineer


def get_experience_by_id(db: Session, experience_id: UUID) -> IonSkillExperience:
    """
    Fetch an experience by ID and ensure it belongs to ION company.
    """
    stmt = (
        select(IonSkillExperience)
        .options(
            joinedload(IonSkillExperience.engineer),
            selectinload(IonSkillExperience.assessments).joinedload(IonSkillAssessment.tool)
        )
        .where(
            and_(
                IonSkillExperience.experience_id == experience_id,
                IonSkillExperience.company_id == ION_COMPANY_ID
            )
        )
    )
    exp = db.scalars(stmt).first()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ION Skill Experience with ID '{experience_id}' not found."
        )
    return exp


def map_experience_to_response(exp: IonSkillExperience) -> IonSkillExperienceResponse:
    assessments_res: List[IonSkillAssessmentResponse] = []
    for ass in exp.assessments:
        tool_name = ass.tool.tool_name if ass.tool else None
        display_order = ass.tool.display_order if ass.tool else 0
        assessments_res.append(
            IonSkillAssessmentResponse(
                assessment_id=ass.assessment_id,
                experience_id=ass.experience_id,
                engineer_id=ass.engineer_id,
                company_id=ass.company_id,
                tool_id=ass.tool_id,
                tool_name=tool_name,
                display_order=display_order,
                skill_level=ass.skill_level,
                assessment_comment=ass.assessment_comment,
                created_at=ass.created_at,
                updated_at=ass.updated_at,
            )
        )
    # Sort assessments by tool display order
    assessments_res.sort(key=lambda x: (x.display_order or 0, x.tool_name or ""))

    eng = exp.engineer
    return IonSkillExperienceResponse(
        experience_id=exp.experience_id,
        engineer_id=exp.engineer_id,
        engineer_name=eng.engineer_name if eng else None,
        orbit_id=eng.orbit_id if eng else None,
        avatar_url=eng.avatar_url if eng else None,
        company_id=exp.company_id,
        where_location=exp.where_location,
        start_date=exp.start_date,
        end_date=exp.end_date,
        notes=exp.notes,
        assessments=assessments_res,
        created_at=exp.created_at,
        updated_at=exp.updated_at,
    )


def get_experiences_paginated(
    db: Session,
    engineer_id: Optional[UUID] = None,
    tool_id: Optional[UUID] = None,
    skill_level: Optional[int] = None,
    min_skill_level: Optional[int] = None,
    search: Optional[str] = None,
    where_location: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """
    Search and filter ION skill experiences.
    """
    conditions = [IonSkillExperience.company_id == ION_COMPANY_ID]

    if engineer_id:
        conditions.append(IonSkillExperience.engineer_id == engineer_id)

    if where_location:
        conditions.append(IonSkillExperience.where_location.ilike(f"%{where_location.strip()}%"))

    if start_date:
        conditions.append(
            or_(
                IonSkillExperience.start_date >= start_date,
                IonSkillExperience.end_date >= start_date
            )
        )

    if end_date:
        conditions.append(
            or_(
                IonSkillExperience.end_date <= end_date,
                IonSkillExperience.start_date <= end_date
            )
        )

    # Tool and skill level subquery filters
    if tool_id or skill_level or min_skill_level:
        subq_conditions = [
            IonSkillAssessment.experience_id == IonSkillExperience.experience_id,
            IonSkillAssessment.company_id == ION_COMPANY_ID
        ]
        if tool_id:
            subq_conditions.append(IonSkillAssessment.tool_id == tool_id)
        if skill_level:
            subq_conditions.append(IonSkillAssessment.skill_level == skill_level)
        if min_skill_level:
            subq_conditions.append(IonSkillAssessment.skill_level >= min_skill_level)
        
        conditions.append(
            select(IonSkillAssessment.assessment_id)
            .where(and_(*subq_conditions))
            .exists()
        )

    if search and search.strip():
        term = f"%{search.strip()}%"
        # Can match engineer name, orbit ID, where_location, notes, or assessment comments
        search_conds = [
            IonSkillExperience.where_location.ilike(term),
            IonSkillExperience.notes.ilike(term),
            IonSkillExperience.engineer_id.in_(
                select(Engineer.engineer_id).where(
                    and_(
                        Engineer.company_id == ION_COMPANY_ID,
                        or_(
                            Engineer.engineer_name.ilike(term),
                            Engineer.orbit_id.ilike(term)
                        )
                    )
                )
            ),
            select(IonSkillAssessment.assessment_id).where(
                and_(
                    IonSkillAssessment.experience_id == IonSkillExperience.experience_id,
                    IonSkillAssessment.assessment_comment.ilike(term)
                )
            ).exists()
        ]
        conditions.append(or_(*search_conds))

    base_query = (
        select(IonSkillExperience)
        .options(
            joinedload(IonSkillExperience.engineer),
            selectinload(IonSkillExperience.assessments).joinedload(IonSkillAssessment.tool)
        )
        .where(and_(*conditions))
    )

    # Count total
    count_stmt = select(func.count(IonSkillExperience.experience_id)).where(and_(*conditions))
    total_count = db.scalar(count_stmt) or 0

    # Order by start_date desc, created_at desc
    ordered_query = (
        base_query
        .order_by(
            desc(func.coalesce(IonSkillExperience.start_date, IonSkillExperience.created_at)),
            desc(IonSkillExperience.created_at)
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    experiences = db.scalars(ordered_query).unique().all()
    items = [map_experience_to_response(exp) for exp in experiences]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1
    }


def create_experience(
    db: Session,
    data: IonSkillExperienceCreate,
    current_user: User
) -> IonSkillExperienceResponse:
    """
    Create a new ION skill experience and any associated tool assessments.
    """
    # 1. Verify engineer is ION
    eng = verify_ion_engineer(db, data.engineer_id)

    # 2. Verify all tools exist and validate skill levels
    if data.assessments:
        tool_ids = [a.tool_id for a in data.assessments]
        valid_tools = db.scalars(
            select(IonSkillTool).where(IonSkillTool.tool_id.in_(tool_ids))
        ).all()
        valid_tool_ids = {t.tool_id for t in valid_tools}
        for a in data.assessments:
            if a.tool_id not in valid_tool_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tool with ID '{a.tool_id}' is not a valid ION tool."
                )
            if a.skill_level < 1 or a.skill_level > 4:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Skill level must be between 1 and 4."
                )

    # 3. Create Experience
    exp = IonSkillExperience(
        experience_id=uuid4(),
        engineer_id=data.engineer_id,
        company_id=ION_COMPANY_ID,
        where_location=data.where_location.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes.strip() if data.notes else None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(exp)
    db.flush()

    # 4. Create child Assessments
    for a in data.assessments:
        ass = IonSkillAssessment(
            assessment_id=uuid4(),
            experience_id=exp.experience_id,
            engineer_id=data.engineer_id,
            company_id=ION_COMPANY_ID,
            tool_id=a.tool_id,
            skill_level=a.skill_level,
            assessment_comment=a.assessment_comment.strip() if a.assessment_comment else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ass)

    db.commit()
    db.refresh(exp)

    # Audit log
    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=ION_COMPANY_ID,
        action="CREATE",
        entity_type="IonSkillExperience",
        entity_id=exp.experience_id,
        description=f"Created ION skill experience in {exp.where_location} with {len(data.assessments)} tool assessments for engineer {eng.engineer_name} ({eng.orbit_id})",
        old_values=None,
        new_values=object_to_dict(exp)
    )

    full_exp = get_experience_by_id(db, exp.experience_id)
    return map_experience_to_response(full_exp)


def update_experience(
    db: Session,
    experience_id: UUID,
    data: IonSkillExperienceUpdate,
    current_user: User
) -> IonSkillExperienceResponse:
    """
    Update an existing ION skill experience and sync its assessments.
    """
    exp = get_experience_by_id(db, experience_id)
    old_dict = object_to_dict(exp)

    if data.where_location is not None:
        exp.where_location = data.where_location.strip()
    if data.start_date is not None or "start_date" in data.model_fields_set:
        exp.start_date = data.start_date
    if data.end_date is not None or "end_date" in data.model_fields_set:
        exp.end_date = data.end_date
    if data.notes is not None or "notes" in data.model_fields_set:
        exp.notes = data.notes.strip() if data.notes else None
    exp.updated_at = datetime.utcnow()

    # If assessments were provided, sync them
    if data.assessments is not None:
        # Validate tools
        tool_ids = [a.tool_id for a in data.assessments]
        valid_tools = db.scalars(
            select(IonSkillTool).where(IonSkillTool.tool_id.in_(tool_ids))
        ).all()
        valid_tool_ids = {t.tool_id for t in valid_tools}
        for a in data.assessments:
            if a.tool_id not in valid_tool_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tool with ID '{a.tool_id}' is not a valid ION tool."
                )
            if a.skill_level < 1 or a.skill_level > 4:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Skill level must be between 1 and 4."
                )

        # Existing assessments map by tool_id
        existing_by_tool: Dict[UUID, IonSkillAssessment] = {
            a.tool_id: a for a in exp.assessments
        }
        incoming_tool_ids = {a.tool_id for a in data.assessments}

        # Delete assessments not in incoming list
        for tool_id, existing_ass in list(existing_by_tool.items()):
            if tool_id not in incoming_tool_ids:
                db.delete(existing_ass)

        # Upsert incoming assessments
        for a in data.assessments:
            if a.tool_id in existing_by_tool:
                target_ass = existing_by_tool[a.tool_id]
                target_ass.skill_level = a.skill_level
                target_ass.assessment_comment = a.assessment_comment.strip() if a.assessment_comment else None
                target_ass.updated_at = datetime.utcnow()
            else:
                new_ass = IonSkillAssessment(
                    assessment_id=uuid4(),
                    experience_id=exp.experience_id,
                    engineer_id=exp.engineer_id,
                    company_id=ION_COMPANY_ID,
                    tool_id=a.tool_id,
                    skill_level=a.skill_level,
                    assessment_comment=a.assessment_comment.strip() if a.assessment_comment else None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_ass)

    db.commit()
    db.refresh(exp)

    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=ION_COMPANY_ID,
        action="UPDATE",
        entity_type="IonSkillExperience",
        entity_id=exp.experience_id,
        description=f"Updated ION skill experience ({exp.experience_id})",
        old_values=old_dict,
        new_values=object_to_dict(exp)
    )

    full_exp = get_experience_by_id(db, exp.experience_id)
    return map_experience_to_response(full_exp)


def delete_experience(
    db: Session,
    experience_id: UUID,
    current_user: User
):
    """
    Delete an ION skill experience and cascade assessments.
    """
    exp = get_experience_by_id(db, experience_id)
    old_dict = object_to_dict(exp)
    eng_name = exp.engineer.engineer_name if exp.engineer else str(exp.engineer_id)

    db.delete(exp)
    db.commit()

    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=ION_COMPANY_ID,
        action="DELETE",
        entity_type="IonSkillExperience",
        entity_id=experience_id,
        description=f"Deleted ION skill experience in {exp.where_location} for engineer {eng_name}",
        old_values=old_dict,
        new_values=None
    )


def get_engineer_current_summary(
    db: Session,
    engineer_id: UUID
) -> IonEngineerSkillSummaryResponse:
    """
    Derive the current/latest skill level for each assessed tool for this engineer.
    Uses the most recent relevant assessment according to experience dates:
    COALESCE(exp.end_date, exp.start_date, exp.created_at) DESC, ass.updated_at DESC, ass.created_at DESC.
    """
    eng = verify_ion_engineer(db, engineer_id)

    # Fetch all assessments with their experience and tool
    stmt = (
        select(IonSkillAssessment, IonSkillExperience, IonSkillTool)
        .join(IonSkillExperience, IonSkillAssessment.experience_id == IonSkillExperience.experience_id)
        .join(IonSkillTool, IonSkillAssessment.tool_id == IonSkillTool.tool_id)
        .where(
            and_(
                IonSkillAssessment.engineer_id == engineer_id,
                IonSkillAssessment.company_id == ION_COMPANY_ID
            )
        )
        .order_by(
            desc(func.coalesce(IonSkillExperience.end_date, IonSkillExperience.start_date, IonSkillExperience.created_at)),
            desc(IonSkillAssessment.updated_at),
            desc(IonSkillAssessment.created_at)
        )
    )

    results = db.execute(stmt).all()

    # Track latest assessment per tool_id
    seen_tools = set()
    current_skills: List[IonEngineerCurrentSkillItem] = []

    for row in results:
        ass: IonSkillAssessment = row[0]
        exp: IonSkillExperience = row[1]
        tool: IonSkillTool = row[2]

        if tool.tool_id not in seen_tools:
            seen_tools.add(tool.tool_id)
            current_skills.append(
                IonEngineerCurrentSkillItem(
                    tool_id=tool.tool_id,
                    tool_name=tool.tool_name,
                    display_order=tool.display_order,
                    skill_level=ass.skill_level,
                    assessment_comment=ass.assessment_comment,
                    experience_id=exp.experience_id,
                    where_location=exp.where_location,
                    start_date=exp.start_date,
                    end_date=exp.end_date,
                    assessed_at=ass.updated_at or ass.created_at or exp.created_at
                )
            )

    # Sort by tool display order
    current_skills.sort(key=lambda x: (x.display_order, x.tool_name))

    return IonEngineerSkillSummaryResponse(
        engineer_id=eng.engineer_id,
        engineer_name=eng.engineer_name,
        orbit_id=eng.orbit_id,
        avatar_url=eng.avatar_url,
        current_skills=current_skills
    )


def get_engineer_skill_history(
    db: Session,
    engineer_id: UUID,
    tool_id: Optional[UUID] = None
) -> List[IonSkillHistoryItem]:
    """
    Fetch historical skill assessments progression for an engineer, sorted chronologically.
    """
    verify_ion_engineer(db, engineer_id)

    conditions = [
        IonSkillAssessment.engineer_id == engineer_id,
        IonSkillAssessment.company_id == ION_COMPANY_ID
    ]
    if tool_id:
        conditions.append(IonSkillAssessment.tool_id == tool_id)

    stmt = (
        select(IonSkillAssessment, IonSkillExperience, IonSkillTool)
        .join(IonSkillExperience, IonSkillAssessment.experience_id == IonSkillExperience.experience_id)
        .join(IonSkillTool, IonSkillAssessment.tool_id == IonSkillTool.tool_id)
        .where(and_(*conditions))
        .order_by(
            asc(func.coalesce(IonSkillExperience.start_date, IonSkillExperience.end_date, IonSkillExperience.created_at)),
            asc(IonSkillAssessment.created_at)
        )
    )

    results = db.execute(stmt).all()
    history: List[IonSkillHistoryItem] = []

    for row in results:
        ass: IonSkillAssessment = row[0]
        exp: IonSkillExperience = row[1]
        tool: IonSkillTool = row[2]

        history.append(
            IonSkillHistoryItem(
                assessment_id=ass.assessment_id,
                experience_id=exp.experience_id,
                engineer_id=ass.engineer_id,
                tool_id=tool.tool_id,
                tool_name=tool.tool_name,
                skill_level=ass.skill_level,
                assessment_comment=ass.assessment_comment,
                where_location=exp.where_location,
                start_date=exp.start_date,
                end_date=exp.end_date,
                created_at=ass.created_at,
                updated_at=ass.updated_at
            )
        )

    return history


def get_all_engineers_summary(
    db: Session,
    search: Optional[str] = None,
    tool_id: Optional[UUID] = None,
    min_level: Optional[int] = None
) -> List[IonEngineerSkillSummaryResponse]:
    """
    Get current skill summaries across all active ION engineers.
    """
    eng_stmt = select(Engineer).where(
        and_(
            Engineer.company_id == ION_COMPANY_ID,
            Engineer.status != "Resigned / Terminated"
        )
    )
    if search and search.strip():
        term = f"%{search.strip()}%"
        eng_stmt = eng_stmt.where(
            or_(
                Engineer.engineer_name.ilike(term),
                Engineer.orbit_id.ilike(term)
            )
        )
    eng_stmt = eng_stmt.order_by(Engineer.engineer_name.asc())
    engineers = db.scalars(eng_stmt).all()

    summaries: List[IonEngineerSkillSummaryResponse] = []
    for eng in engineers:
        summary = get_engineer_current_summary(db, eng.engineer_id)
        if tool_id or min_level:
            matching = [
                s for s in summary.current_skills
                if (not tool_id or s.tool_id == tool_id) and (not min_level or s.skill_level >= min_level)
            ]
            if not matching:
                continue
        summaries.append(summary)

    return summaries
