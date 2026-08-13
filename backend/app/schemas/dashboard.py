from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class KPIStats(BaseModel):
    total_engineers: int
    deployed_engineers: int
    utilization_rate: float
    upcoming_travel_count: int
    expiring_visas_count: int
    active_projects_count: int

class DeploymentTrendMonth(BaseModel):
    month: str
    Deployed: int
    Active: int
    OnLeave: int

class StatusDistributionItem(BaseModel):
    name: str
    value: int
    color: str

class CountryDistributionItem(BaseModel):
    name: str
    value: int

class RecentActivityItem(BaseModel):
    id: str
    name: str
    avatarUrl: Optional[str] = None
    assignedSite: Optional[str] = None
    primaryTool: Optional[str] = None
    country: Optional[str] = None
    timeAgo: str

class ActionChecklistItem(BaseModel):
    id: str
    type: str  # 'visa' | 'travel'
    title: str
    subtitle: str
    actionText: str
    targetRoute: str

class DashboardMetricsResponse(BaseModel):
    kpi: KPIStats
    deployment_trend: List[DeploymentTrendMonth]
    status_distribution: List[StatusDistributionItem]
    country_distribution: List[CountryDistributionItem]
    recent_activity: List[RecentActivityItem]
    action_checklist: List[ActionChecklistItem]

    model_config = ConfigDict(from_attributes=True)
