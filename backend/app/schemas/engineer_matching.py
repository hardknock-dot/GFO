from datetime import date
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

class EngineerMatchRequest(BaseModel):
    country: str = Field(..., description="Target deployment country")
    start_date: date = Field(..., description="Deployment start date")
    end_date: date = Field(..., description="Deployment end date")
    process: Optional[str] = Field(None, description="Top-level semiconductor process (Etch, Deposition, Strip & Clean, Ion Implantation)")
    product_family: Optional[str] = Field(None, description="Product family (Kiyo, Flex, Sense.i, Vector, ALTUS, EOS, Purion, etc.)")
    specific_product: Optional[str] = Field(None, description="Specific product / model (Kiyo GX, Kiyo FX, Sense.i Akara, Vector Excel, etc.)")
    customer: Optional[str] = Field(None, description="Target customer or fab site (e.g. TSMC, Micron, Kioxia, Intel)")
    site: Optional[str] = Field(None, description="Fab site name")
    fab: Optional[str] = Field(None, description="Fab detail")
    industry: Optional[str] = Field(None, description="Industry experience requirement")
    role: Optional[str] = Field(None, description="Role requirement")
    company_id: Optional[UUID] = Field(None, description="Optional tenant filter (must be authorized for session user)")

class EngineerMatchItem(BaseModel):
    engineer_id: UUID
    engineer_name: str
    goes_by: Optional[str] = None
    orbit_id: str
    company_id: UUID
    company_name: str
    level: Optional[str] = None
    match_level: str  # EXACT_VARIANT_MATCH, EXACT_PRODUCT_MATCH, FAMILY_MATCH, PROCESS_MATCH, AMBIGUOUS_MATCH, NO_MATCH
    score: int        # 0-100
    reasons: List[str]
    warnings: List[str]
    visa_status: str  # VALID, EXPIRED, DATES_UNKNOWN, NO_RECORD
    primary_tool: Optional[str] = None
    tool_experience_summary: List[str] = []
    location_experience_summary: List[str] = []

class EngineerMatchResponse(BaseModel):
    total_candidates_evaluated: int
    eligible_candidates_count: int
    matches: List[EngineerMatchItem]
    requirement_summary: dict
