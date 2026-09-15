from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
import re

HEX_COLOR_REGEX = re.compile(r"^#[0-9A-Fa-f]{6}$")

def validate_hex_color(val: Optional[str]) -> Optional[str]:
    if val is None or val == "":
        return None
    val_str = str(val).strip()
    if not HEX_COLOR_REGEX.match(val_str):
        raise ValueError(f"Invalid hex color format: '{val_str}'. Expected 6-digit hex format (e.g. #C1121F).")
    return val_str

class CompanyThemeResponse(BaseModel):
    company_theme_id: UUID
    company_id: UUID
    color_1: Optional[str] = None
    color_2: Optional[str] = None
    color_3: Optional[str] = None
    color_4: Optional[str] = None
    color_5: Optional[str] = None
    primary_color: Optional[str] = None
    primary_hover: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    accent_soft: Optional[str] = None
    background_color: Optional[str] = None
    surface_color: Optional[str] = None
    dark_neutral: Optional[str] = None
    text_color: Optional[str] = None
    border_color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CompanyThemeUpdate(BaseModel):
    primary_color: Optional[str] = Field(None, description="6-digit hex primary color (e.g. #C1121F)")
    primary_hover: Optional[str] = Field(None, description="6-digit hex primary hover color (e.g. #741B21)")
    secondary_color: Optional[str] = Field(None, description="6-digit hex secondary color (e.g. #8DA7BE)")
    accent_color: Optional[str] = Field(None, description="6-digit hex accent color (e.g. #741B21)")
    accent_soft: Optional[str] = Field(None, description="6-digit hex accent soft color (e.g. #FDEDEE)")
    background_color: Optional[str] = Field(None, description="6-digit hex background color (e.g. #FDEDEE)")
    surface_color: Optional[str] = Field(None, description="6-digit hex surface color (e.g. #2B3D41)")
    dark_neutral: Optional[str] = Field(None, description="6-digit hex dark neutral color (e.g. #2B3D41)")
    text_color: Optional[str] = Field(None, description="6-digit hex text color (e.g. #FFFFFF)")
    border_color: Optional[str] = Field(None, description="6-digit hex border color (e.g. #F0D6D8)")
    color_1: Optional[str] = None
    color_2: Optional[str] = None
    color_3: Optional[str] = None
    color_4: Optional[str] = None
    color_5: Optional[str] = None

    @field_validator(
        "primary_color", "primary_hover", "secondary_color", "accent_color", "accent_soft",
        "background_color", "surface_color", "dark_neutral", "text_color", "border_color",
        "color_1", "color_2", "color_3", "color_4", "color_5",
        mode="before"
    )
    @classmethod
    def check_hex(cls, v):
        return validate_hex_color(v)
