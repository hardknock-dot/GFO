from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import List, Optional, Dict, Any

class ClientAuthorizedCompany(BaseModel):
    company_id: UUID
    company_name: str
    short_name: Optional[str] = None
    tagline: Optional[str] = None
    logo: Optional[str] = None
    primary_color: Optional[str] = None
    theme_key: Optional[str] = "default"

    model_config = ConfigDict(from_attributes=True)

class ClientKpiStats(BaseModel):
    companies_served: int
    total_engineers: int
    active_engineers: int
    total_deployments: int
    countries_covered: int
    total_deployment_days: int
    years_of_history: str
    earliest_deployment_year: Optional[int] = None

class ClientCompanyShowcaseItem(BaseModel):
    company_id: UUID
    company_name: str
    short_name: Optional[str] = None
    tagline: Optional[str] = None
    logo: Optional[str] = None
    primary_color: Optional[str] = None
    theme_key: Optional[str] = "default"
    engineer_count: int
    active_engineer_count: int
    deployment_count: int
    countries_count: int
    countries: List[str] = []
    operational_period: str
    top_tools: List[str] = []

class ClientOverviewResponse(BaseModel):
    kpi: ClientKpiStats
    companies: List[ClientCompanyShowcaseItem]
    authorized_companies: List[ClientAuthorizedCompany]

class CompanyEngineerCount(BaseModel):
    company_id: UUID
    company_name: str
    short_name: Optional[str] = None
    engineer_count: int
    active_count: int
    primary_color: Optional[str] = None

class CompetencyLevelCount(BaseModel):
    level: str
    count: int

class TopToolCapability(BaseModel):
    tool_name: str
    process: Optional[str] = None
    engineer_count: int

class ClientWorkforceResponse(BaseModel):
    total_engineers: int
    active_deployed: int
    available_standby: int
    on_leave: int
    by_company: List[CompanyEngineerCount]
    by_competency_level: List[CompetencyLevelCount]
    top_tools: List[TopToolCapability]

class SpecificProductExpertise(BaseModel):
    product_name: str
    variant: Optional[str] = None
    engineer_count: int

class ProductFamilyExpertise(BaseModel):
    family_name: str
    total_engineers: int
    products: List[SpecificProductExpertise] = []

class ProcessExpertise(BaseModel):
    process_name: str
    total_engineers: int
    families: List[ProductFamilyExpertise] = []

class IonToolExpertiseItem(BaseModel):
    tool_id: Optional[UUID] = None
    tool_name: str
    series: Optional[str] = None
    display_order: int = 0
    engineer_count: int = 0
    level_counts: Dict[str, int] = {}

class ClientExpertiseResponse(BaseModel):
    processes: List[ProcessExpertise]
    ion_tools: List[IonToolExpertiseItem] = []

class DeploymentYearMetric(BaseModel):
    year: int
    deployments: int
    total_days: int

class DurationBucket(BaseModel):
    bucket: str
    count: int
    percentage: float

class DeploymentTypeMetric(BaseModel):
    support_type: str
    count: int

class ClientDeploymentsResponse(BaseModel):
    total_deployments: int
    completed_deployments: int
    ongoing_deployments: int
    future_deployments: int
    total_deployment_days: int
    average_duration_days: float
    longest_deployment_days: int
    engineers_with_multiple_deployments: int
    deployments_by_year: List[DeploymentYearMetric]
    duration_buckets: List[DurationBucket]
    deployments_by_type: List[DeploymentTypeMetric]

class GeographyCountryItem(BaseModel):
    name: str
    code: str
    value: int
    percentage: float

class ClientGeographyResponse(BaseModel):
    total_deployments: int
    countries_count: int
    countries: List[GeographyCountryItem]

class ClientCompanyDetailResponse(BaseModel):
    company: ClientCompanyShowcaseItem
    kpi: ClientKpiStats
    workforce: ClientWorkforceResponse
    deployments: ClientDeploymentsResponse
    geography: ClientGeographyResponse
    expertise: ClientExpertiseResponse
