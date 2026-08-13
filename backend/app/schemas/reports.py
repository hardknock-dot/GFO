from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict

class DistributionMetric(BaseModel):
    label: str
    count: int
    percentage: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class ReportsSummaryResponse(BaseModel):
    company_name: str
    total_engineers: int
    total_schedules: int
    upcoming_schedules: int
    active_schedules: int
    completed_schedules: int
    total_skills: int
    total_visas: int
    total_leaves: int
    total_travels: int
    total_performances: int
    avg_performance_score: Optional[float] = None
    total_missed_schedules: int
    total_operational_alerts: int
    warning_alerts_count: int

    model_config = ConfigDict(from_attributes=True)

class CategoryReportResponse(BaseModel):
    category: str
    company_name: str
    total_count: int
    distributions: Dict[str, List[DistributionMetric]]
    items: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)
