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

PRESET_COMPANY_THEMES = {
    UUID("11b9d863-b83c-4af3-8db5-b6e773f78235"): {
        "color_1": "#C1121F",
        "primary_hover": "#741B21",
        "color_2": "#8DA7BE",
        "color_3": "#C1121F",
        "accent_soft": "#FDEDEE",
        "color_4": "#F4F5F7",
        "dark_neutral": "#2B3D41",
        "color_5": "#2B3D41",
        "border_color": "#F0D6D8",
    },
    UUID("f81bd16c-2f63-4818-a653-7486fe3f45ec"): {
        "color_1": "#A2D2FF",
        "primary_hover": "#88C0FA",
        "color_2": "#CDB4DB",
        "color_3": "#FFAFCC",
        "accent_soft": "#FFC8DD",
        "color_4": "#F4F7FC",
        "dark_neutral": "#BDE0FE",
        "color_5": "#1E293B",
        "border_color": "#E2E8F0",
    },
    UUID("34d51cd0-fb63-4684-96a3-662477298678"): {
        "color_1": "#495867",
        "primary_hover": "#741B21",
        "color_2": "#899D78",
        "color_3": "#495867",
        "accent_soft": "#E3D7FF",
        "color_4": "#F4F5F7",
        "dark_neutral": "#2B3D41",
        "color_5": "#2B3D41",
        "border_color": "#D8CEEE",
    },
}

def build_company_theme_response(theme: CompanyThemeSettings) -> CompanyThemeResponse:
    """
    Serialize CompanyThemeSettings into CompanyThemeResponse with dual token aliases and safe default fallbacks.
    """
    preset = PRESET_COMPANY_THEMES.get(theme.company_id, {})
    return CompanyThemeResponse(
        company_theme_id=theme.company_theme_id,
        company_id=theme.company_id,
        color_1=theme.color_1 or preset.get("color_1", "#606C38"),
        color_2=theme.color_2 or preset.get("color_2", "#606C38"),
        color_3=theme.color_3 or preset.get("color_3", "#DDA15E"),
        color_4=theme.color_4 or preset.get("color_4", "#F4F5F7"),
        color_5=theme.color_5 or preset.get("color_5", "#283618"),
        primary_color=theme.color_1 or preset.get("color_1", "#606C38"),
        primary_hover=theme.primary_hover or preset.get("primary_hover", "#283618"),
        secondary_color=theme.color_2 or preset.get("color_2", "#606C38"),
        accent_color=theme.color_3 or preset.get("color_3", "#DDA15E"),
        accent_soft=theme.accent_soft or preset.get("accent_soft", "#FEFAE0"),
        background_color=theme.color_4 or preset.get("color_4", "#F4F5F7"),
        surface_color=theme.color_4 or preset.get("color_4", "#FEFAE0"),
        dark_neutral=theme.dark_neutral or preset.get("dark_neutral", "#283618"),
        text_color=theme.color_5 or preset.get("color_5", "#283618"),
        border_color=theme.border_color or preset.get("border_color", "#E6E2C8"),
        created_at=theme.created_at,
        updated_at=theme.updated_at,
    )

def get_or_create_company_theme(db: Session, company_id: UUID) -> CompanyThemeSettings:
    """
    Retrieve or create default CompanyThemeSettings for a target company_id.
    Auto-seeds preset company themes if no database row exists or fills in NULL columns.
    """
    theme = db.scalar(
        select(CompanyThemeSettings).where(CompanyThemeSettings.company_id == company_id)
    )
    preset = PRESET_COMPANY_THEMES.get(company_id, {})

    if not theme:
        theme = CompanyThemeSettings(
            company_theme_id=uuid.uuid4(),
            company_id=company_id,
            color_1=preset.get("color_1"),
            color_2=preset.get("color_2"),
            color_3=preset.get("color_3"),
            color_4=preset.get("color_4"),
            color_5=preset.get("color_5"),
            primary_hover=preset.get("primary_hover"),
            accent_soft=preset.get("accent_soft"),
            dark_neutral=preset.get("dark_neutral"),
            border_color=preset.get("border_color"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(theme)
        db.commit()
        db.refresh(theme)
    else:
        # Populate missing NULL columns for existing rows if preset values exist
        needs_commit = False
        if not theme.color_1 and preset.get("color_1"):
            theme.color_1 = preset.get("color_1")
            needs_commit = True
        if not theme.color_2 and preset.get("color_2"):
            theme.color_2 = preset.get("color_2")
            needs_commit = True
        if not theme.color_3 and preset.get("color_3"):
            theme.color_3 = preset.get("color_3")
            needs_commit = True
        if not theme.color_4 and preset.get("color_4"):
            theme.color_4 = preset.get("color_4")
            needs_commit = True
        if not theme.color_5 and preset.get("color_5"):
            theme.color_5 = preset.get("color_5")
            needs_commit = True
        if not theme.primary_hover and preset.get("primary_hover"):
            theme.primary_hover = preset.get("primary_hover")
            needs_commit = True
        if not theme.accent_soft and preset.get("accent_soft"):
            theme.accent_soft = preset.get("accent_soft")
            needs_commit = True
        if not theme.dark_neutral and preset.get("dark_neutral"):
            theme.dark_neutral = preset.get("dark_neutral")
            needs_commit = True
        if not theme.border_color and preset.get("border_color"):
            theme.border_color = preset.get("border_color")
            needs_commit = True

        if needs_commit:
            theme.updated_at = datetime.utcnow()
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

    # Always update provided values
    if req.primary_color is not None:
        theme.color_1 = req.primary_color
    elif req.color_1 is not None:
        theme.color_1 = req.color_1

    if req.primary_hover is not None:
        theme.primary_hover = req.primary_hover

    if req.secondary_color is not None:
        theme.color_2 = req.secondary_color
    elif req.color_2 is not None:
        theme.color_2 = req.color_2

    if req.accent_color is not None:
        theme.color_3 = req.accent_color
    elif req.color_3 is not None:
        theme.color_3 = req.color_3

    if req.accent_soft is not None:
        theme.accent_soft = req.accent_soft

    if req.background_color is not None:
        theme.color_4 = req.background_color
    elif req.surface_color is not None:
        theme.color_4 = req.surface_color
    elif req.color_4 is not None:
        theme.color_4 = req.color_4

    if req.dark_neutral is not None:
        theme.dark_neutral = req.dark_neutral

    if req.text_color is not None:
        theme.color_5 = req.text_color
    elif req.color_5 is not None:
        theme.color_5 = req.color_5

    if req.border_color is not None:
        theme.border_color = req.border_color

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
