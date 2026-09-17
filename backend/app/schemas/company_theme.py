from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

ALLOWED_THEME_KEYS = {"lam", "axcelis", "vishay", "default", "cobalt", "emerald", "copper", "amethyst"}

class CompanyThemeResponse(BaseModel):
    company_theme_id: UUID
    company_id: UUID
    theme_key: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CompanyThemeUpdate(BaseModel):
    theme_key: str = Field(..., description="Allowed theme key: 'lam', 'axcelis', 'vishay', 'default', 'cobalt', 'emerald', 'copper', 'amethyst'")

    @field_validator("theme_key")
    def validate_theme_key(cls, val: str) -> str:
        if not val:
            return "default"
        val_str = str(val).strip().lower()
        if val_str not in ALLOWED_THEME_KEYS:
            raise ValueError(f"Invalid theme_key '{val}'. Allowed values are: {', '.join(sorted(ALLOWED_THEME_KEYS))}.")
        return val_str

