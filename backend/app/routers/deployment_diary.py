import logging
from typing import Optional, List
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.engineer import Engineer
from app.schemas.deployment_diary import (
    DeploymentDiaryCreate,
    DeploymentDiaryUpdate,
    DeploymentDiaryResponse
)
from app.schemas.pagination import PaginatedResponse
from app.services import deployment_diary_service
from app.services.auth_service import (
    get_current_user,
    enforce_company_isolation,
    enforce_write_permission,
    enforce_delete_permission,
    is_engineer_user
)
from app.services.audit_service import log_audit, object_to_dict
from app.routers.engineer_me import get_current_engineer_profile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deployment-diary", tags=["deployment-diary"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[DeploymentDiaryResponse])
def read_deployment_diaries(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    schedule_id: Optional[UUID] = Query(None),
    entry_date: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated deployment diary entries with company tenant isolation and access controls.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)

        target_engineer_id = engineer_id
        if is_engineer_user(current_user):
            eng = get_current_engineer_profile(db, current_user)
            target_engineer_id = eng.engineer_id

        res = deployment_diary_service.get_deployment_diaries(
            db=db,
            company_id=validated_cids,
            engineer_id=target_engineer_id,
            schedule_id=schedule_id,
            entry_date=entry_date,
            start_date=start_date,
            end_date=end_date,
            search=search,
            page=page,
            page_size=page_size
        )

        return PaginatedResponse[DeploymentDiaryResponse](
            items=[DeploymentDiaryResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving deployment diary entries: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve deployment diary records from database"
        )

@router.get("/{diary_id}", response_model=DeploymentDiaryResponse)
def read_single_deployment_diary(
    diary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve single deployment diary entry by ID.
    """
    try:
        diary = deployment_diary_service.get_deployment_diary_by_id(db, diary_id)
        enforce_company_isolation(db, current_user, diary.company_id)
        if is_engineer_user(current_user):
            eng = get_current_engineer_profile(db, current_user)
            if diary.engineer_id != eng.engineer_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You can only access your own deployment diary entries."
                )
        return DeploymentDiaryResponse.model_validate(diary)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving deployment diary entry %s: %s", str(diary_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve deployment diary record from database"
        )

@router.post("", response_model=DeploymentDiaryResponse, status_code=status.HTTP_201_CREATED)
def create_new_deployment_diary(
    diary_data: DeploymentDiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new deployment diary entry.
    """
    try:
        enforce_write_permission(current_user)

        if is_engineer_user(current_user):
            eng = get_current_engineer_profile(db, current_user)
            target_engineer_id = eng.engineer_id
            target_company_id = eng.company_id
        else:
            target_engineer_id = diary_data.engineer_id
            if not target_engineer_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="engineer_id is required when creating entry on behalf of an engineer"
                )
            eng = db.get(Engineer, target_engineer_id)
            if not eng:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engineer profile not found")
            enforce_company_isolation(db, current_user, eng.company_id)
            target_company_id = eng.company_id

        created = deployment_diary_service.create_deployment_diary(
            db=db,
            company_id=target_company_id,
            engineer_id=target_engineer_id,
            diary_data=diary_data
        )

        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=target_company_id,
            action="CREATE",
            entity_type="DeploymentDiary",
            entity_id=created.id,
            description=f"Deployment diary entry created for engineer {target_engineer_id}",
            old_values=None,
            new_values=object_to_dict(created)
        )
        return DeploymentDiaryResponse.model_validate(created)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating deployment diary entry: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create deployment diary record in database"
        )

@router.put("/{diary_id}", response_model=DeploymentDiaryResponse)
def update_existing_deployment_diary(
    diary_id: UUID,
    diary_data: DeploymentDiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing deployment diary entry.
    """
    try:
        enforce_write_permission(current_user)
        diary = deployment_diary_service.get_deployment_diary_by_id(db, diary_id)
        enforce_company_isolation(db, current_user, diary.company_id)

        if is_engineer_user(current_user):
            eng = get_current_engineer_profile(db, current_user)
            if diary.engineer_id != eng.engineer_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You can only modify your own deployment diary entries."
                )

        old_dict = object_to_dict(diary)
        updated = deployment_diary_service.update_deployment_diary(db, diary_id, diary_data)

        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=diary.company_id,
            action="UPDATE",
            entity_type="DeploymentDiary",
            entity_id=diary_id,
            description=f"Deployment diary entry updated ({diary_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated)
        )
        return DeploymentDiaryResponse.model_validate(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating deployment diary entry %s: %s", str(diary_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update deployment diary record in database"
        )

@router.delete("/{diary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_deployment_diary(
    diary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an existing deployment diary entry.
    """
    try:
        enforce_write_permission(current_user)
        diary = deployment_diary_service.get_deployment_diary_by_id(db, diary_id)
        enforce_company_isolation(db, current_user, diary.company_id)

        if is_engineer_user(current_user):
            eng = get_current_engineer_profile(db, current_user)
            if diary.engineer_id != eng.engineer_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You can only delete your own deployment diary entries."
                )
        else:
            enforce_delete_permission(current_user)

        old_dict = object_to_dict(diary)
        deployment_diary_service.delete_deployment_diary(db, diary_id)

        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=diary.company_id,
            action="DELETE",
            entity_type="DeploymentDiary",
            entity_id=diary_id,
            description=f"Deployment diary entry deleted ({diary_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting deployment diary entry %s: %s", str(diary_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete deployment diary record from database"
        )
