from typing import Optional
from pydantic import BaseModel, ConfigDict

class OperationalAlert(BaseModel):
    id: str
    type: str  # 'schedule' | 'leave' | 'visa' | 'travel' | 'performance' | 'skills' | 'missed_schedule'
    severity: str  # 'info' | 'warning' | 'critical'
    title: str
    message: str
    engineer_id: Optional[str] = None
    schedule_id: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
