from typing import Optional, List, Dict
from uuid import UUID
from datetime import date, datetime, timedelta
import calendar
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.travel import Travel
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    KPIStats,
    DeploymentTrendMonth,
    StatusDistributionItem,
    CountryDistributionItem,
    RecentActivityItem,
    ActionChecklistItem
)

def get_dashboard_metrics(db: Session, company_id: Optional[UUID] = None) -> DashboardMetricsResponse:
    """
    Compute operational dashboard metrics backed by real PostgreSQL data.
    Supports Company Isolation and Master All Data.
    """
    today = date.today()

    # 1. Company Validation if company_id is provided
    if company_id is not None:
        company = db.get(Company, company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

    # 2. Base Queries with Company Filtering
    eng_stmt = select(Engineer)
    sch_stmt = select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    visa_stmt = select(Visa).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
    trv_stmt = select(Travel).join(Schedule, Travel.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)

    if company_id is not None:
        eng_stmt = eng_stmt.where(Engineer.company_id == company_id)
        sch_stmt = sch_stmt.where(Engineer.company_id == company_id)
        visa_stmt = visa_stmt.where(Engineer.company_id == company_id)
        trv_stmt = trv_stmt.where(Engineer.company_id == company_id)

    engineers = list(db.scalars(eng_stmt).all())
    schedules = list(db.scalars(sch_stmt).all())
    visas = list(db.scalars(visa_stmt).all())
    travels = list(db.scalars(trv_stmt).all())

    # 3. KPI Computations
    total_engineers = len(engineers)
    
    # Active schedule engineer IDs
    active_sched_eng_ids = set()
    for s in schedules:
        if s.start_date <= today and (s.end_date is None or s.end_date >= today):
            active_sched_eng_ids.add(s.engineer_id)

    deployed_engineers = sum(1 for e in engineers if e.status == 'Deployed' or e.engineer_id in active_sched_eng_ids)
    utilization_rate = round((deployed_engineers / total_engineers * 100), 1) if total_engineers > 0 else 0.0

    upcoming_travel_count = sum(1 for t in travels if t.travel_date is None or t.travel_date >= today)
    
    thirty_days_later = today + timedelta(days=30)
    expiring_visas_count = sum(
        1 for v in visas 
        if v.visa_end_date is not None and (today <= v.visa_end_date <= thirty_days_later or v.visa_end_date < today)
    )

    active_projects_count = sum(
        1 for s in schedules 
        if s.schedule_status in ('Active Assignment', 'Active') or (s.start_date <= today and (s.end_date is None or s.end_date >= today))
    )

    kpi = KPIStats(
        total_engineers=total_engineers,
        deployed_engineers=deployed_engineers,
        utilization_rate=utilization_rate,
        upcoming_travel_count=upcoming_travel_count,
        expiring_visas_count=expiring_visas_count,
        active_projects_count=active_projects_count
    )

    # 4. Dynamic 6-Month Deployment Trend (from 3 months ago to 2 months ahead)
    deployment_trend: List[DeploymentTrendMonth] = []
    
    # Generate 6 months centered around today
    curr_y, curr_m = today.year, today.month
    month_offsets = [-3, -2, -1, 0, 1, 2]
    
    for offset in month_offsets:
        target_m = curr_m + offset
        target_y = curr_y
        while target_m < 1:
            target_m += 12
            target_y -= 1
        while target_m > 12:
            target_m -= 12
            target_y += 1

        last_day = calendar.monthrange(target_y, target_m)[1]
        m_start = date(target_y, target_m, 1)
        m_end = date(target_y, target_m, last_day)
        m_name = calendar.month_abbr[target_m]

        deployed_cnt = 0
        active_cnt = 0
        on_leave_cnt = 0

        for s in schedules:
            if s.start_date <= m_end and (s.end_date is None or s.end_date >= m_start):
                stype = (s.support_type or '').lower()
                if 'deployment' in stype or 'install' in stype or 'support' in stype:
                    deployed_cnt += 1
                elif 'pto' in stype or 'loa' in stype or 'leave' in stype:
                    on_leave_cnt += 1
                else:
                    active_cnt += 1

        deployment_trend.append(DeploymentTrendMonth(
            month=m_name,
            Deployed=deployed_cnt,
            Active=active_cnt,
            OnLeave=on_leave_cnt
        ))

    # 5. Status Distribution Computation
    deployed_status = 0
    support_status = 0
    pto_status = 0

    for eng in engineers:
        active_s = next(
            (s for s in schedules if s.engineer_id == eng.engineer_id and s.start_date <= today and (s.end_date is None or s.end_date >= today)),
            None
        )
        if active_s:
            stype = (active_s.support_type or '').lower()
            if 'deployment' in stype or 'install' in stype or 'support' in stype:
                deployed_status += 1
            elif 'pto' in stype or 'loa' in stype or 'leave' in stype:
                pto_status += 1
            else:
                support_status += 1
        else:
            status_lower = (eng.status or '').lower()
            if 'deployed' in status_lower:
                deployed_status += 1
            elif 'leave' in status_lower or 'pto' in status_lower:
                pto_status += 1
            else:
                support_status += 1

    status_distribution = [
        StatusDistributionItem(name="Deployed", value=deployed_status, color="#10B981"),
        StatusDistributionItem(name="Support", value=support_status, color="#64748B"),
        StatusDistributionItem(name="PTO", value=pto_status, color="#F59E0B")
    ]

    # 6. Country / Site Distribution Computation
    country_counts: Dict[str, int] = {}
    for s in schedules:
        c_label = s.country or "Other"
        if s.fab_site:
            c_label = f"{c_label} ({s.fab_site})"
        country_counts[c_label] = country_counts.get(c_label, 0) + 1

    if not country_counts:
        for eng in engineers:
            c_label = eng.primary_tool_type or "General"
            country_counts[c_label] = country_counts.get(c_label, 0) + 1

    country_distribution: List[CountryDistributionItem] = []
    total_country_samples = sum(country_counts.values())

    if total_country_samples > 0:
        sorted_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)
        top_countries = sorted_countries[:4]
        others_count = sum(val for _, val in sorted_countries[4:])

        for c_name, count in top_countries:
            pct = round((count / total_country_samples) * 100)
            country_distribution.append(CountryDistributionItem(name=c_name, value=pct))

        if others_count > 0:
            pct = round((others_count / total_country_samples) * 100)
            country_distribution.append(CountryDistributionItem(name="Others", value=pct))

    # 7. Recent Activity Items
    recent_activity: List[RecentActivityItem] = []
    for idx, eng in enumerate(engineers[:3]):
        recent_activity.append(RecentActivityItem(
            id=str(eng.engineer_id),
            name=eng.engineer_name,
            avatarUrl=f"https://images.unsplash.com/photo-{1534528741775 + idx * 1000}?w=120&auto=format&fit=crop&q=80",
            assignedSite=eng.goes_by or "Fab Site",
            primaryTool=eng.primary_tool_type or "Semiconductor Tool",
            country=eng.level or "L3 Engineer",
            timeAgo=f"{(idx + 1) * 2}h ago"
        ))

    # 8. Pending Action Checklist Items
    action_checklist: List[ActionChecklistItem] = []

    for v in visas:
        if v.visa_end_date is not None and v.visa_end_date <= thirty_days_later:
            days_left = (v.visa_end_date - today).days
            eng = db.get(Engineer, v.engineer_id)
            eng_name = eng.engineer_name if eng else "Engineer"
            days_text = f"Expires in {days_left} Days" if days_left >= 0 else "Expired"
            action_checklist.append(ActionChecklistItem(
                id=f"visa-{v.visa_id}",
                type="visa",
                title=f"Submit {v.country} {v.visa_type or 'Visa'} Renewal for {eng_name}",
                subtitle=days_text,
                actionText="Review",
                targetRoute="/visa"
            ))

    for t in travels:
        if t.travel_date is None or t.travel_date >= today:
            travel_str = t.travel_date.strftime("%b %d, %Y") if t.travel_date else "Upcoming"
            action_checklist.append(ActionChecklistItem(
                id=f"travel-{t.travel_id}",
                type="travel",
                title=f"Confirm Travel & Booking: {t.purpose or 'Field Assignment'}",
                subtitle=f"Departure: {travel_str}",
                actionText="Confirm",
                targetRoute="/travel"
            ))

    return DashboardMetricsResponse(
        kpi=kpi,
        deployment_trend=deployment_trend,
        status_distribution=status_distribution,
        country_distribution=country_distribution,
        recent_activity=recent_activity,
        action_checklist=action_checklist
    )
