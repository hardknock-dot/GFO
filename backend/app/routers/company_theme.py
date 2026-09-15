import logging
from typing import Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.company_theme import CompanyThemeResponse, CompanyThemeUpdate
from app.services.auth_service import (
    get_current_user,
    is_main_admin,
    enforce_company_isolation,
    get_user_authorized_company_ids
)
from app.services import company_theme_service
from app.routers.settings import resolve_effective_company_id, check_settings_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company-theme", tags=["company-theme"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=CompanyThemeResponse)
def get_company_theme(
    company_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve saved Company Theme settings for the authenticated user's company context.
    """
    try:
        eff_cid = resolve_effective_company_id(db, current_user, company_id)
        
        # Enforce company tenant isolation for non-main admins
        if not is_main_admin(current_user):
            auth_cids = get_user_authorized_company_ids(db, current_user)
            if eff_cid not in auth_cids and current_user.company_id != eff_cid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You cannot access theme settings for another company."
                )

        theme = company_theme_service.get_or_create_company_theme(db, eff_cid)
        return company_theme_service.build_company_theme_response(theme)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving company theme: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve company theme from database"
        )

@router.put("", response_model=CompanyThemeResponse)
def update_company_theme(
    req: CompanyThemeUpdate,
    company_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update saved Company Theme settings. Main Admin / Company Admin only.
    """
    try:
        # Authorization check: Main Admin / Company Admin / Manager only
        check_settings_admin(current_user)

        eff_cid = resolve_effective_company_id(db, current_user, company_id)

        # Tenant isolation check
        if not is_main_admin(current_user):
            auth_cids = get_user_authorized_company_ids(db, current_user)
            if eff_cid not in auth_cids and current_user.company_id != eff_cid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You cannot modify theme settings for another company."
                )

        updated_theme = company_theme_service.update_company_theme(
            db=db,
            company_id=eff_cid,
            req=req,
            current_user=current_user
        )

        return company_theme_service.build_company_theme_response(updated_theme)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating company theme: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company theme in database"
        )
