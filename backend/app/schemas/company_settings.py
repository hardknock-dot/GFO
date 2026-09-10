from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class CompanySettingsResponse(BaseModel):
    setting_id: UUID
    company_id: UUID
    visa_expiration_days: int
    visa_alerts_enabled: bool
    deployment_alerts_enabled: bool
    travel_alerts_enabled: bool
    leave_alerts_enabled: bool
    missed_schedule_alerts_enabled: bool
    operational_remark_alerts_enabled: bool
    performance_alerts_enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CompanySettingsUpdateRequest(BaseModel):
    company_id: Optional[Any] = None
    visa_expiration_days: Optional[int] = Field(None, ge=1, le=365, description="Visa warning days must be between 1 and 365")
    visa_alerts_enabled: Optional[bool] = None
    deployment_alerts_enabled: Optional[bool] = None
    travel_alerts_enabled: Optional[bool] = None
    leave_alerts_enabled: Optional[bool] = None
    missed_schedule_alerts_enabled: Optional[bool] = None
    operational_remark_alerts_enabled: Optional[bool] = None
    performance_alerts_enabled: Optional[bool] = None
