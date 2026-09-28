import logging
from typing import Optional, List
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.ion_skill import (
    IonSkillToolResponse,
    IonSkillExperienceCreate,
    IonSkillExperienceUpdate,
    IonSkillExperienceResponse,
    IonEngineerSkillSummaryResponse,
    IonSkillHistoryItem
)
from app.services import ion_skill_service
from app.services.auth_service import (
    get_current_user,
    enforce_company_isolation,
    enforce_write_permission,
    enforce_delete_permission,
    enforce_engineer_self_service,
    is_engineer_user
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ion-skills",
    tags=["ion-skills"],
    dependencies=[Depends(get_current_user)]
)

ION_COMPANY_ID = ion_skill_service.ION_COMPANY_ID


@router.get("/tools", response_model=List[IonSkillToolResponse])
def list_ion_tools(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all available Axcelis ION skill tools.
    Requires user to have authorized access to Axcelis ION company scope.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    tools = ion_skill_service.get_all_tools(db, active_only=active_only)
    return [IonSkillToolResponse.model_validate(t) for t in tools]


@router.get("/experiences", response_model=PaginatedResponse[IonSkillExperienceResponse])
def list_ion_experiences(
    engineer_id: Optional[UUID] = Query(None),
    tool_id: Optional[UUID] = Query(None),
    skill_level: Optional[int] = Query(None, ge=1, le=4),
    min_skill_level: Optional[int] = Query(None, ge=1, le=4),
    search: Optional[str] = Query(None),
    where_location: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List and filter ION skill experiences with tenant authorization and pagination.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if is_engineer_user(current_user):
        enforce_engineer_self_service(current_user, engineer_id or current_user.engineer_id)
        engineer_id = current_user.engineer_id

    res = ion_skill_service.get_experiences_paginated(
        db=db,
        engineer_id=engineer_id,
        tool_id=tool_id,
        skill_level=skill_level,
        min_skill_level=min_skill_level,
        search=search,
        where_location=where_location,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size
    )

    return PaginatedResponse[IonSkillExperienceResponse](
        items=res["items"],
        page=res["page"],
        page_size=res["page_size"],
        total=res["total"],
        total_pages=res["total_pages"]
    )


@router.get("/experiences/{experience_id}", response_model=IonSkillExperienceResponse)
def get_single_ion_experience(
    experience_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a single ION skill experience.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    exp = ion_skill_service.get_experience_by_id(db, experience_id)
    if is_engineer_user(current_user):
        enforce_engineer_self_service(current_user, exp.engineer_id)
    return ion_skill_service.map_experience_to_response(exp)


@router.post("/experiences", response_model=IonSkillExperienceResponse, status_code=status.HTTP_201_CREATED)
def create_ion_experience(
    data: IonSkillExperienceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new ION skill experience with optional tool assessments.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if not is_engineer_user(current_user):
        enforce_write_permission(current_user)
    else:
        enforce_engineer_self_service(current_user, data.engineer_id)

    return ion_skill_service.create_experience(db, data, current_user)


@router.put("/experiences/{experience_id}", response_model=IonSkillExperienceResponse)
def update_ion_experience(
    experience_id: UUID,
    data: IonSkillExperienceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing ION skill experience.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    exp = ion_skill_service.get_experience_by_id(db, experience_id)
    if not is_engineer_user(current_user):
        enforce_write_permission(current_user)
    else:
        enforce_engineer_self_service(current_user, exp.engineer_id)

    return ion_skill_service.update_experience(db, experience_id, data, current_user)


@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ion_experience(
    experience_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an ION skill experience and cascade assessments.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if not is_engineer_user(current_user):
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Engineers cannot delete historical experience records directly."
        )

    ion_skill_service.delete_experience(db, experience_id, current_user)
    return None


@router.delete("/assessments/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ion_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific ION skill assessment row.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if not is_engineer_user(current_user):
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Engineers cannot delete historical assessment records directly."
        )

    ion_skill_service.delete_assessment(db, assessment_id, current_user)
    return None


@router.get("/engineers/{engineer_id}/current-summary", response_model=IonEngineerSkillSummaryResponse)
def get_engineer_current_skills(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve derived current / latest skill levels per tool for a specific ION engineer.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if is_engineer_user(current_user):
        enforce_engineer_self_service(current_user, engineer_id)
    return ion_skill_service.get_engineer_current_summary(db, engineer_id)


@router.get("/engineers/{engineer_id}/history", response_model=List[IonSkillHistoryItem])
def get_engineer_skills_history(
    engineer_id: UUID,
    tool_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve chronological assessment progression for a specific ION engineer.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    if is_engineer_user(current_user):
        enforce_engineer_self_service(current_user, engineer_id)
    return ion_skill_service.get_engineer_skill_history(db, engineer_id, tool_id=tool_id)


@router.get("/summary", response_model=List[IonEngineerSkillSummaryResponse])
def get_company_ion_skills_summary(
    search: Optional[str] = Query(None),
    tool_id: Optional[UUID] = Query(None),
    min_level: Optional[int] = Query(None, ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Company-wide overview of all ION engineers with their latest skills.
    """
    enforce_company_isolation(db, current_user, ION_COMPANY_ID)
    return ion_skill_service.get_all_engineers_summary(
        db=db,
        search=search,
        tool_id=tool_id,
        min_level=min_level
    )
