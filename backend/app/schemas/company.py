from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class CompanyResponse(BaseModel):
    company_id: UUID
    company_name: str
    short_name: str
    logo: str | None = None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

