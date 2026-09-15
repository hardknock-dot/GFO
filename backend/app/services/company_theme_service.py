import uuid
import logging
from datetime import datetime
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.company_theme import CompanyThemeSettings
from app.models.company import Company
from app.models.user import User
from app.schemas.company_theme import CompanyThemeUpdate, CompanyThemeResponse
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

def build_company_theme_response(theme: CompanyThemeSettings) -> CompanyThemeResponse:
    """
    Serialize CompanyThemeSettings into CompanyThemeResponse with dual token aliases.
    """
    return CompanyThemeResponse(
        company_theme_id=theme.company_theme_id,
        company_id=theme.company_id,
        color_1=theme.color_1,
        color_2=theme.color_2,
        color_3=theme.color_3,
        color_4=theme.color_4,
        color_5=theme.color_5,
        primary_color=theme.color_1,
        secondary_color=theme.color_2,
        accent_color=theme.color_3,
        background_color=theme.color_4,
        surface_color=theme.color_4,
        text_color=theme.color_5,
        created_at=theme.created_at,
        updated_at=theme.updated_at,
    )

def get_or_create_company_theme(db: Session, company_id: UUID) -> CompanyThemeSettings:
    """
    Retrieve or create default CompanyThemeSettings for a target company_id.
    """
    theme = db.scalar(
        select(CompanyThemeSettings).where(CompanyThemeSettings.company_id == company_id)
    )
    if not theme:
        # Create row if none exists
        theme = CompanyThemeSettings(
            company_theme_id=uuid.uuid4(),
            company_id=company_id,
            color_1=None,
            color_2=None,
            color_3=None,
            color_4=None,
            color_5=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(theme)
        db.commit()
        db.refresh(theme)
    return theme

def update_company_theme(
    db: Session,
    company_id: UUID,
    req: CompanyThemeUpdate,
    current_user: User
) -> CompanyThemeSettings:
    """
    Update theme settings for target company context and record audit trail.
    """
    comp = db.get(Company, company_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company context not found."
        )

    theme = get_or_create_company_theme(db, company_id)
    old_values = object_to_dict(theme)

    # Check incoming fields from req
    fields_set = req.model_fields_set

    # Map primary_color / color_1
    if "primary_color" in fields_set and req.primary_color is not None:
        theme.color_1 = req.primary_color
    elif "color_1" in fields_set and req.color_1 is not None:
        theme.color_1 = req.color_1

    # Map secondary_color / color_2
    if "secondary_color" in fields_set and req.secondary_color is not None:
        theme.color_2 = req.secondary_color
    elif "color_2" in fields_set and req.color_2 is not None:
        theme.color_2 = req.color_2

    # Map accent_color / color_3
    if "accent_color" in fields_set and req.accent_color is not None:
        theme.color_3 = req.accent_color
    elif "color_3" in fields_set and req.color_3 is not None:
        theme.color_3 = req.color_3

    # Map background_color / surface_color / color_4
    if "background_color" in fields_set and req.background_color is not None:
        theme.color_4 = req.background_color
    elif "surface_color" in fields_set and req.surface_color is not None:
        theme.color_4 = req.surface_color
    elif "color_4" in fields_set and req.color_4 is not None:
        theme.color_4 = req.color_4

    # Map text_color / color_5
    if "text_color" in fields_set and req.text_color is not None:
        theme.color_5 = req.text_color
    elif "color_5" in fields_set and req.color_5 is not None:
        theme.color_5 = req.color_5

    theme.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(theme)

    # Record Audit Log
    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=company_id,
        action="UPDATE_COMPANY_THEME",
        entity_type="CompanyThemeSettings",
        entity_id=theme.company_theme_id,
        description=f"Company theme settings updated for {comp.company_name}",
        old_values=old_values,
        new_values=object_to_dict(theme)
    )

    return theme
