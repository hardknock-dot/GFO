from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class UserLoginRequest(BaseModel):
    email: str
    password: str

class CompanySummary(BaseModel):
    company_id: UUID
    company_name: str
    short_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserMeResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar: Optional[str] = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    avatar_url: Optional[str] = None
    goes_by: Optional[str] = None
    role: str
    company_name: Optional[str] = None
    currentCompanyId: Optional[UUID] = None
    engineer_id: Optional[UUID] = None
    engineerId: Optional[UUID] = None
    is_active: Optional[bool] = True
    last_login: Optional[datetime] = None
    accessibleCompanies: List[str] = []
    companies: List[CompanySummary] = []

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    token: str
    user: UserMeResponse

class UserResponse(BaseModel):
    user_id: UUID
    company_id: Optional[UUID] = None
    company_name: Optional[str] = None
    full_name: str
    goes_by: Optional[str] = None
    avatar_url: Optional[str] = None
    email: str
    role: str
    engineer_id: Optional[UUID] = None
    is_active: bool
    companies: List[CompanySummary] = []

    model_config = ConfigDict(from_attributes=True)

class UserCreateRequest(BaseModel):
    email: str
    full_name: str
    goes_by: Optional[str] = None
    avatar_url: Optional[str] = None
    company_id: Optional[UUID] = None
    company_ids: Optional[List[UUID]] = None
    role: str
    password: str
    engineer_id: Optional[UUID] = None

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    goes_by: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[UUID] = None
    company_ids: Optional[List[UUID]] = None
    engineer_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    goes_by: Optional[str] = None
    avatar_url: Optional[str] = None
