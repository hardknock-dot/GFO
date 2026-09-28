from datetime import date, datetime
from typing import Optional, List, Self
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator

class IonSkillToolResponse(BaseModel):
    tool_id: UUID
    tool_name: str
    display_order: int = 0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IonSkillAssessmentCreateItem(BaseModel):
    tool_id: UUID
    skill_level: int = Field(..., ge=1, le=4, description="Skill level must be between 1 and 4")
    assessment_comment: Optional[str] = None


class IonSkillAssessmentUpdateItem(BaseModel):
    assessment_id: Optional[UUID] = None
    tool_id: UUID
    skill_level: int = Field(..., ge=1, le=4, description="Skill level must be between 1 and 4")
    assessment_comment: Optional[str] = None


class IonSkillAssessmentResponse(BaseModel):
    assessment_id: UUID
    experience_id: UUID
    engineer_id: UUID
    company_id: UUID
    tool_id: UUID
    tool_name: Optional[str] = None
    display_order: Optional[int] = 0
    skill_level: int
    assessment_comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IonSkillExperienceCreate(BaseModel):
    engineer_id: UUID
    where_location: str = Field(..., min_length=1, description="Location of work / experience")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    assessments: List[IonSkillAssessmentCreateItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_experience(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date cannot be earlier than start_date")
        
        # Check duplicate tools
        tool_ids = [a.tool_id for a in self.assessments]
        if len(tool_ids) != len(set(tool_ids)):
            raise ValueError("Duplicate tool assessments within the same experience are not allowed")
        return self


class IonSkillExperienceUpdate(BaseModel):
    where_location: Optional[str] = Field(None, min_length=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    assessments: Optional[List[IonSkillAssessmentUpdateItem]] = None

    @model_validator(mode="after")
    def validate_experience(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date cannot be earlier than start_date")
        
        if self.assessments is not None:
            tool_ids = [a.tool_id for a in self.assessments]
            if len(tool_ids) != len(set(tool_ids)):
                raise ValueError("Duplicate tool assessments within the same experience are not allowed")
        return self


class IonSkillExperienceResponse(BaseModel):
    experience_id: UUID
    engineer_id: UUID
    engineer_name: Optional[str] = None
    orbit_id: Optional[str] = None
    avatar_url: Optional[str] = None
    company_id: UUID
    where_location: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    assessments: List[IonSkillAssessmentResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IonEngineerCurrentSkillItem(BaseModel):
    tool_id: UUID
    tool_name: str
    display_order: int = 0
    skill_level: int
    assessment_comment: Optional[str] = None
    experience_id: UUID
    where_location: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    assessed_at: Optional[datetime] = None


class IonEngineerSkillSummaryResponse(BaseModel):
    engineer_id: UUID
    engineer_name: str
    orbit_id: str
    avatar_url: Optional[str] = None
    current_skills: List[IonEngineerCurrentSkillItem] = Field(default_factory=list)


class IonSkillHistoryItem(BaseModel):
    assessment_id: UUID
    experience_id: UUID
    engineer_id: UUID
    tool_id: UUID
    tool_name: str
    skill_level: int
    assessment_comment: Optional[str] = None
    where_location: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
