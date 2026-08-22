from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date
import io
import csv
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, and_
from fastapi import HTTPException, status

from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.leave import Leave
from app.models.missed_schedule import MissedSchedule
from app.models.skill import Skill
from app.schemas.reports import ReportsSummaryResponse, CategoryReportResponse, DistributionMetric
from app.services.operational_service import get_company_operational_alerts

def apply_comp_filter(stmt, col, company_id):
    if company_id:
        if isinstance(company_id, (list, set, tuple)):
            return stmt.where(col.in_(company_id))
        return stmt.where(col == company_id)
    return stmt

def get_reports_summary(
    db: Session,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> ReportsSummaryResponse:
    company_name = "All Companies"
    if company_id is not None and not isinstance(company_id, (list, set, tuple)):
        comp = db.get(Company, company_id)
        if comp:
            company_name = comp.company_name

    # Engineers Query
    eng_stmt = apply_comp_filter(select(func.count(Engineer.engineer_id)), Engineer.company_id, company_id)
    total_engineers = db.scalar(eng_stmt) or 0

    # Schedules Query
    sch_stmt = apply_comp_filter(select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    if start_date:
        sch_stmt = sch_stmt.where(Schedule.start_date >= start_date)
    if end_date:
        sch_stmt = sch_stmt.where(Schedule.start_date <= end_date)
    schedules = list(db.scalars(sch_stmt).all())

    total_schedules = len(schedules)
    upcoming_schedules = sum(1 for s in schedules if s.schedule_status == 'Upcoming')
    active_schedules = sum(1 for s in schedules if s.schedule_status in ('Confirmed', 'Active'))
    completed_schedules = sum(1 for s in schedules if s.schedule_status == 'Completed')

    # Skills Query
    sk_stmt = apply_comp_filter(select(func.count(Skill.skill_id)).join(Engineer, Skill.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    total_skills = db.scalar(sk_stmt) or 0

    # Visas Query
    visa_stmt = apply_comp_filter(select(func.count(Visa.visa_id)).join(Engineer, Visa.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    total_visas = db.scalar(visa_stmt) or 0

    # Leaves Query
    leave_stmt = apply_comp_filter(select(Leave).join(Engineer, Leave.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    if start_date:
        leave_stmt = leave_stmt.where(Leave.requested_date >= start_date)
    if end_date:
        leave_stmt = leave_stmt.where(Leave.requested_date <= end_date)
    leaves = list(db.scalars(leave_stmt).all())
    total_leaves = len(leaves)

    # Travel Query
    trv_stmt = apply_comp_filter(select(Travel).join(Schedule, Travel.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    if start_date:
        trv_stmt = trv_stmt.where(Travel.travel_date >= start_date)
    if end_date:
        trv_stmt = trv_stmt.where(Travel.travel_date <= end_date)
    travels = list(db.scalars(trv_stmt).all())
    total_travels = len(travels)

    # Performance Query
    perf_stmt = apply_comp_filter(select(Performance).join(Schedule, Performance.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    if start_date:
        perf_stmt = perf_stmt.where(Performance.actual_start_date >= start_date)
    if end_date:
        perf_stmt = perf_stmt.where(Performance.actual_start_date <= end_date)
    performances = list(db.scalars(perf_stmt).all())
    total_performances = len(performances)

    scores = [p.score for p in performances if p.score is not None]
    avg_score = round(sum(scores) / len(scores), 2) if scores else None

    # Missed Schedule Query
    ms_stmt = apply_comp_filter(select(MissedSchedule).join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id), Engineer.company_id, company_id)
    if start_date:
        ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date >= start_date)
    if end_date:
        ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date <= end_date)
    missed_schedules = list(db.scalars(ms_stmt).all())
    total_missed_schedules = len(missed_schedules)

    # Operational Alerts Integration
    alerts = get_company_operational_alerts(db, company_id=company_id)
    total_alerts = len(alerts)
    warning_alerts = sum(1 for a in alerts if a.severity == 'warning')

    return ReportsSummaryResponse(
        company_name=company_name,
        total_engineers=total_engineers,
        total_schedules=total_schedules,
        upcoming_schedules=upcoming_schedules,
        active_schedules=active_schedules,
        completed_schedules=completed_schedules,
        total_skills=total_skills,
        total_visas=total_visas,
        total_leaves=total_leaves,
        total_travels=total_travels,
        total_performances=total_performances,
        avg_performance_score=avg_score,
        total_missed_schedules=total_missed_schedules,
        total_operational_alerts=total_alerts,
        warning_alerts_count=warning_alerts,
    )

def get_category_report(
    db: Session,
    category: str,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> CategoryReportResponse:
    company_name = "All Companies"
    if company_id is not None:
        comp = db.get(Company, company_id)
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        company_name = comp.company_name

    category_lower = category.lower()
    distributions: Dict[str, List[DistributionMetric]] = {}
    items: List[Dict[str, Any]] = []
    summary_metrics: Dict[str, Any] = {}
    total_count = 0

    # Fetch Companies for company_name lookup
    companies = list(db.scalars(select(Company)).all())
    comp_map = {c.company_id: c.company_name for c in companies}

    if category_lower in ('workforce', 'engineers'):
        eng_stmt = select(Engineer)
        if company_id:
            eng_stmt = eng_stmt.where(Engineer.company_id == company_id)
        engineers = list(db.scalars(eng_stmt).all())
        total_count = len(engineers)

        # Average Industry Experience & Average Customer Experience
        avg_ind_stmt = select(func.avg(Engineer.industry_experience))
        avg_cust_stmt = select(func.avg(Engineer.lam_experience))
        if company_id:
            avg_ind_stmt = avg_ind_stmt.where(Engineer.company_id == company_id)
            avg_cust_stmt = avg_cust_stmt.where(Engineer.company_id == company_id)
        avg_ind = db.scalar(avg_ind_stmt)
        avg_cust = db.scalar(avg_cust_stmt)

        # Distribution by status & level & tool
        status_counts: Dict[str, int] = {}
        level_counts: Dict[str, int] = {}
        tool_counts: Dict[str, int] = {}

        for e in engineers:
            st = e.status or 'Available'
            status_counts[st] = status_counts.get(st, 0) + 1
            lvl = e.level or 'L1'
            level_counts[lvl] = level_counts.get(lvl, 0) + 1
            tool = e.primary_tool or 'Etch'
            tool_counts[tool] = tool_counts.get(tool, 0) + 1

            items.append({
                "id": str(e.engineer_id),
                "engineer_id": str(e.engineer_id),
                "name": e.engineer_name,
                "orbit_id": e.orbit_id,
                "status": e.status,
                "level": e.level,
                "primary_tool": e.primary_tool,
                "industry_experience": float(e.industry_experience) if e.industry_experience is not None else None,
                "customer_experience": float(e.lam_experience) if e.lam_experience is not None else None,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]
        distributions["by_level"] = [DistributionMetric(label=k, count=v) for k, v in level_counts.items()]
        distributions["by_tool"] = [DistributionMetric(label=k, count=v) for k, v in tool_counts.items()]

        summary_metrics = {
            "total_engineers": total_count,
            "avg_industry_experience": round(float(avg_ind), 2) if avg_ind is not None else None,
            "avg_customer_experience": round(float(avg_cust), 2) if avg_cust is not None else None,
        }

    elif category_lower in ('schedules', 'schedule'):
        sch_stmt = select(Schedule, Engineer).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        if company_id:
            sch_stmt = sch_stmt.where(Engineer.company_id == company_id)
        if start_date:
            sch_stmt = sch_stmt.where(Schedule.start_date >= start_date)
        if end_date:
            sch_stmt = sch_stmt.where(Schedule.start_date <= end_date)
        results = db.execute(sch_stmt).all()
        total_count = len(results)

        country_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}
        fab_counts: Dict[str, int] = {}
        upcoming = 0
        active = 0
        completed = 0

        for s, e in results:
            c = s.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            st = s.schedule_status or 'Upcoming'
            status_counts[st] = status_counts.get(st, 0) + 1
            f = s.fab_site or 'Unknown'
            fab_counts[f] = fab_counts.get(f, 0) + 1

            if st == 'Upcoming':
                upcoming += 1
            elif st in ('Confirmed', 'Active', 'Active Assignment'):
                active += 1
            elif st == 'Completed':
                completed += 1

            items.append({
                "id": str(s.schedule_id),
                "schedule_id": str(s.schedule_id),
                "engineer_id": str(s.engineer_id),
                "engineer_name": e.engineer_name,
                "project_code": f"PRJ-{str(s.schedule_id)[:8].upper()}",
                "support_type": s.support_type,
                "country": s.country,
                "fab_site": s.fab_site,
                "fab_city": s.fab_city,
                "start_date": str(s.start_date) if s.start_date else None,
                "end_date": str(s.end_date) if s.end_date else None,
                "status": s.schedule_status,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]
        distributions["by_fab"] = [DistributionMetric(label=k, count=v) for k, v in fab_counts.items()]

        summary_metrics = {
            "total_schedules": total_count,
            "upcoming_schedules": upcoming,
            "active_schedules": active,
            "completed_schedules": completed
        }

    elif category_lower in ('skills', 'skill'):
        sk_stmt = select(Skill, Engineer).join(Engineer, Skill.engineer_id == Engineer.engineer_id)
        if company_id:
            sk_stmt = sk_stmt.where(Engineer.company_id == company_id)
        results = db.execute(sk_stmt).all()
        total_count = len(results)

        tool_counts: Dict[str, int] = {}
        role_counts: Dict[str, int] = {}
        country_counts: Dict[str, int] = {}
        fab_counts: Dict[str, int] = {}
        wafer_counts: Dict[str, int] = {}
        ready_engineers_set = set()
        distinct_tools_set = set()

        for sk, e in results:
            t = sk.tool_type or 'Unknown'
            tool_counts[t] = tool_counts.get(t, 0) + 1
            r = sk.role or 'Unknown'
            role_counts[r] = role_counts.get(r, 0) + 1
            c = sk.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            f = sk.fab or 'Unknown'
            fab_counts[f] = fab_counts.get(f, 0) + 1
            w = sk.wafer_size or 'Unknown'
            wafer_counts[w] = wafer_counts.get(w, 0) + 1

            if sk.ready_for_primary_role is True:
                ready_engineers_set.add(sk.engineer_id)
            if sk.tool_type:
                distinct_tools_set.add(sk.tool_type)

            items.append({
                "id": str(sk.skill_id),
                "engineer_id": str(sk.engineer_id),
                "engineer_name": e.engineer_name,
                "country": sk.country,
                "fab": sk.fab,
                "tool_type": sk.tool_type,
                "wafer_size": sk.wafer_size,
                "role": sk.role,
                "ready_for_primary_role": sk.ready_for_primary_role,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_tool_type"] = [DistributionMetric(label=k, count=v) for k, v in tool_counts.items()]
        distributions["by_role"] = [DistributionMetric(label=k, count=v) for k, v in role_counts.items()]
        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_fab"] = [DistributionMetric(label=k, count=v) for k, v in fab_counts.items()]
        distributions["by_wafer_size"] = [DistributionMetric(label=k, count=v) for k, v in wafer_counts.items()]

        summary_metrics = {
            "total_skills_records": total_count,
            "engineers_ready_for_primary_role": len(ready_engineers_set),
            "total_tools_represented": len(distinct_tools_set)
        }

    elif category_lower in ('visa', 'visas'):
        visa_stmt = select(Visa, Engineer).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
        if company_id:
            visa_stmt = visa_stmt.where(Engineer.company_id == company_id)
        results = db.execute(visa_stmt).all()
        total_count = len(results)

        country_counts: Dict[str, int] = {}
        type_counts: Dict[str, int] = {}
        engineers_with_visa_set = set()
        active_ranges = 0
        expired = 0
        missing_dates = 0
        today = date.today()

        for v, e in results:
            c = v.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            tp = v.visa_type or 'Work Visa'
            type_counts[tp] = type_counts.get(tp, 0) + 1
            engineers_with_visa_set.add(v.engineer_id)

            if v.visa_start_date is None or v.visa_end_date is None:
                missing_dates += 1
            else:
                if v.visa_start_date <= today <= v.visa_end_date:
                    active_ranges += 1
                if v.visa_end_date < today:
                    expired += 1

            items.append({
                "id": str(v.visa_id),
                "engineer_id": str(v.engineer_id),
                "engineer_name": e.engineer_name,
                "country": v.country,
                "visa_type": v.visa_type,
                "issue_date": str(v.visa_start_date) if v.visa_start_date else None,
                "expiry_date": str(v.visa_end_date) if v.visa_end_date else None,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_type"] = [DistributionMetric(label=k, count=v) for k, v in type_counts.items()]

        summary_metrics = {
            "engineers_with_visa_records": len(engineers_with_visa_set),
            "visa_records_active": active_ranges,
            "visa_records_expired": expired,
            "visa_records_missing_dates": missing_dates
        }

    elif category_lower in ('leave', 'leaves'):
        leave_stmt = select(Leave, Engineer).join(Engineer, Leave.engineer_id == Engineer.engineer_id)
        if company_id:
            leave_stmt = leave_stmt.where(Engineer.company_id == company_id)
        if start_date:
            leave_stmt = leave_stmt.where(Leave.requested_date >= start_date)
        if end_date:
            leave_stmt = leave_stmt.where(Leave.requested_date <= end_date)
        results = db.execute(leave_stmt).all()
        total_count = len(results)

        type_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}
        today = date.today()
        upcoming = 0

        for l, e in results:
            tp = l.leave_type or 'Annual Leave'
            type_counts[tp] = type_counts.get(tp, 0) + 1
            st = l.approval_status or 'Pending'
            status_counts[st] = status_counts.get(st, 0) + 1
            
            if l.requested_date and l.requested_date >= today:
                upcoming += 1

            items.append({
                "id": str(l.leave_id),
                "engineer_id": str(l.engineer_id),
                "engineer_name": e.engineer_name,
                "leave_type": l.leave_type,
                "requested_date": str(l.requested_date) if l.requested_date else None,
                "approval_status": l.approval_status,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_type"] = [DistributionMetric(label=k, count=v) for k, v in type_counts.items()]
        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]

        summary_metrics = {
            "total_leave_records": total_count,
            "upcoming_leave_requests": upcoming
        }

    elif category_lower in ('travel', 'travels'):
        trv_stmt = select(Travel, Schedule, Engineer).join(
            Schedule, Travel.schedule_id == Schedule.schedule_id
        ).join(
            Engineer, Schedule.engineer_id == Engineer.engineer_id
        )
        if company_id:
            trv_stmt = trv_stmt.where(Engineer.company_id == company_id)
        if start_date:
            trv_stmt = trv_stmt.where(Travel.travel_date >= start_date)
        if end_date:
            trv_stmt = trv_stmt.where(Travel.travel_date <= end_date)
        results = db.execute(trv_stmt).all()
        total_count = len(results)

        country_counts: Dict[str, int] = {}
        fab_counts: Dict[str, int] = {}
        purpose_counts: Dict[str, int] = {}
        today = date.today()
        upcoming = 0
        booking_info_completed = 0

        for t, s, e in results:
            c = s.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            f = s.fab_site or 'Unknown'
            fab_counts[f] = fab_counts.get(f, 0) + 1
            p = t.purpose or 'Customer Support'
            purpose_counts[p] = purpose_counts.get(p, 0) + 1

            if t.travel_date and t.travel_date >= today:
                upcoming += 1
            if t.booking_date is not None:
                booking_info_completed += 1

            items.append({
                "id": str(t.travel_id),
                "travel_id": str(t.travel_id),
                "schedule_id": str(t.schedule_id),
                "engineer_id": str(s.engineer_id),
                "engineer_name": e.engineer_name,
                "purpose": t.purpose,
                "booking_date": str(t.booking_date) if t.booking_date else None,
                "travel_date": str(t.travel_date) if t.travel_date else None,
                "destination_country": s.country,
                "fab_site": s.fab_site,
                "comments": t.comments,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_fab"] = [DistributionMetric(label=k, count=v) for k, v in fab_counts.items()]
        distributions["by_purpose"] = [DistributionMetric(label=k, count=v) for k, v in purpose_counts.items()]

        summary_metrics = {
            "total_travels": total_count,
            "upcoming_travels": upcoming,
            "booking_info_completed": booking_info_completed
        }

    elif category_lower in ('performance', 'performances'):
        perf_stmt = select(Performance, Schedule, Engineer).join(
            Schedule, Performance.schedule_id == Schedule.schedule_id
        ).join(
            Engineer, Schedule.engineer_id == Engineer.engineer_id
        )
        if company_id:
            perf_stmt = perf_stmt.where(Engineer.company_id == company_id)
        if start_date:
            perf_stmt = perf_stmt.where(Performance.actual_start_date >= start_date)
        if end_date:
            perf_stmt = perf_stmt.where(Performance.actual_start_date <= end_date)
        results = db.execute(perf_stmt).all()
        total_count = len(results)

        escalation_counts = {"Escalated": 0, "Normal": 0}
        score_distribution: Dict[str, int] = {}
        scores = []
        escalated_count = 0
        feedback_count = 0

        for p, s, e in results:
            if p.escalation:
                escalation_counts["Escalated"] += 1
                escalated_count += 1
            else:
                escalation_counts["Normal"] += 1

            if p.score is not None:
                val = float(p.score)
                scores.append(val)
                score_str = str(val)
                score_distribution[score_str] = score_distribution.get(score_str, 0) + 1

            if p.feedback and p.feedback.strip():
                feedback_count += 1

            items.append({
                "id": str(p.performance_id),
                "performance_id": str(p.performance_id),
                "schedule_id": str(p.schedule_id),
                "engineer_id": str(s.engineer_id),
                "engineer_name": e.engineer_name,
                "support_type": s.support_type,
                "score": float(p.score) if p.score is not None else None,
                "escalation": p.escalation,
                "escalation_reason": p.escalation_reason,
                "feedback": p.feedback,
                "actual_start_date": str(p.actual_start_date) if p.actual_start_date else None,
                "actual_end_date": str(p.actual_end_date) if p.actual_end_date else None,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_escalation"] = [DistributionMetric(label=k, count=v) for k, v in escalation_counts.items()]
        distributions["by_score"] = [DistributionMetric(label=k, count=v) for k, v in score_distribution.items()]

        avg_score = round(sum(scores) / len(scores), 2) if scores else None
        escalation_rate = round((escalated_count / total_count) * 100, 2) if total_count > 0 else 0.0

        summary_metrics = {
            "total_performances": total_count,
            "avg_performance_score": avg_score,
            "escalated_performances": escalated_count,
            "escalation_rate": escalation_rate,
            "feedback_availability": feedback_count
        }

    elif category_lower in ('missed-schedules', 'missed_schedules', 'missed'):
        ms_stmt = select(MissedSchedule, Schedule, Engineer).join(
            Schedule, MissedSchedule.schedule_id == Schedule.schedule_id
        ).join(
            Engineer, Schedule.engineer_id == Engineer.engineer_id
        )
        if company_id:
            ms_stmt = ms_stmt.where(Engineer.company_id == company_id)
        if start_date:
            ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date >= start_date)
        if end_date:
            ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date <= end_date)
        results = db.execute(ms_stmt).all()
        total_count = len(results)

        reason_counts: Dict[str, int] = {}
        country_counts: Dict[str, int] = {}
        engineer_counts: Dict[str, int] = {}

        for m, s, e in results:
            r = m.reason or 'General Delay'
            reason_counts[r] = reason_counts.get(r, 0) + 1
            c = s.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            eng = e.engineer_name or 'Unknown'
            engineer_counts[eng] = engineer_counts.get(eng, 0) + 1

            items.append({
                "id": str(m.missed_schedule_id),
                "missed_schedule_id": str(m.missed_schedule_id),
                "schedule_id": str(m.schedule_id),
                "engineer_id": str(s.engineer_id),
                "engineer_name": e.engineer_name,
                "support_type": s.support_type,
                "country": s.country,
                "reason": m.reason,
                "requested_start_date": str(m.requested_start_date) if m.requested_start_date else None,
                "actual_start_date": str(m.actual_start_date) if m.actual_start_date else None,
                "evidence": m.evidence,
                "company_name": comp_map.get(e.company_id, "Unknown Company")
            })

        distributions["by_reason"] = [DistributionMetric(label=k, count=v) for k, v in reason_counts.items()]
        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_engineer"] = [DistributionMetric(label=k, count=v) for k, v in engineer_counts.items()]

        summary_metrics = {
            "total_missed_schedules": total_count
        }

    elif category_lower in ('operational', 'operational-exceptions', 'alerts', 'exceptions'):
        alerts = get_company_operational_alerts(db, company_id=company_id)
        total_count = len(alerts)

        severity_counts: Dict[str, int] = {}
        type_counts: Dict[str, int] = {}
        engineer_counts: Dict[str, int] = {}
        schedule_counts: Dict[str, int] = {}

        warnings = 0
        criticals = 0
        infos = 0

        eng_names = {e.engineer_id: e.engineer_name for e in db.scalars(select(Engineer).where(Engineer.company_id == company_id) if company_id else select(Engineer)).all()}
        sch_names = {s.schedule_id: f"{s.support_type} ({s.country})" for s in db.scalars(select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id).where(Engineer.company_id == company_id) if company_id else select(Schedule)).all()}

        for a in alerts:
            sev = a.severity or 'info'
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            if sev == 'warning':
                warnings += 1
            elif sev == 'critical':
                criticals += 1
            elif sev == 'info':
                infos += 1

            tp = a.type or 'general'
            type_counts[tp] = type_counts.get(tp, 0) + 1

            eng_id = UUID(a.engineer_id) if a.engineer_id else None
            eng_name = eng_names.get(eng_id) if eng_id else 'General/Global'
            if eng_name:
                engineer_counts[eng_name] = engineer_counts.get(eng_name, 0) + 1

            sch_id = UUID(a.schedule_id) if a.schedule_id else None
            sch_name = sch_names.get(sch_id) if sch_id else 'None'
            if sch_name and sch_name != 'None':
                schedule_counts[sch_name] = schedule_counts.get(sch_name, 0) + 1

            items.append({
                "id": a.id,
                "engineer_id": a.engineer_id,
                "schedule_id": a.schedule_id,
                "type": a.type,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "engineer_name": eng_name,
                "schedule_info": sch_name if sch_name != 'None' else None,
                "company_name": a.company_name
            })

        distributions["by_severity"] = [DistributionMetric(label=k, count=v) for k, v in severity_counts.items()]
        distributions["by_type"] = [DistributionMetric(label=k.title(), count=v) for k, v in type_counts.items()]
        distributions["by_engineer"] = [DistributionMetric(label=k, count=v) for k, v in engineer_counts.items()]
        distributions["by_schedule"] = [DistributionMetric(label=k, count=v) for k, v in schedule_counts.items()]

        summary_metrics = {
            "total_alerts": total_count,
            "warnings_count": warnings,
            "critical_count": criticals,
            "info_count": infos
        }

    else:
        # Default empty fallback
        pass

    return CategoryReportResponse(
        category=category,
        company_name=company_name,
        total_count=total_count,
        distributions=distributions,
        items=items,
        summary_metrics=summary_metrics
    )

def export_report_csv(
    db: Session,
    category: str,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> str:
    rep = get_category_report(db, category, company_id, start_date, end_date)
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([f"ORMP Report: {category.title()}", f"Company: {rep.company_name}", f"Generated: {date.today()}"])
    writer.writerow([])

    if rep.items:
        headers = list(rep.items[0].keys())
        writer.writerow(headers)
        for item in rep.items:
            writer.writerow([item.get(h, '') for h in headers])
    else:
        writer.writerow(["No records found for the selected company or date range."])

    return output.getvalue()

def get_feedback_report(
    db: Session,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    stmt = select(Performance, Engineer.engineer_name, Company.company_name)\
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)\
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)\
        .join(Company, Engineer.company_id == Company.company_id)
    
    if company_id:
        stmt = stmt.where(Engineer.company_id == company_id)
    if start_date:
        stmt = stmt.where(Performance.actual_start_date >= start_date)
    if end_date:
        stmt = stmt.where(Performance.actual_start_date <= end_date)

    rows = db.execute(stmt).all()
    items = []
    scores = []
    positive_count = 0
    negative_count = 0

    for row in rows:
        perf, eng_name, comp_name = row[0], row[1], row[2]
        if perf.feedback or perf.score is not None:
            if perf.score is not None:
                scores.append(float(perf.score))
                if perf.score >= 4.0 or not perf.escalation:
                    positive_count += 1
                else:
                    negative_count += 1
            elif not perf.escalation:
                positive_count += 1

            items.append({
                "performance_id": str(perf.performance_id),
                "engineer_name": eng_name,
                "company_name": comp_name,
                "score": float(perf.score) if perf.score is not None else None,
                "feedback": perf.feedback or "No text feedback provided",
                "escalation": perf.escalation or False,
                "date": perf.actual_start_date.isoformat() if perf.actual_start_date else None
            })

    avg_score = round(sum(scores) / len(scores), 2) if scores else None

    return {
        "total_feedback": len(items),
        "positive_feedback_count": positive_count,
        "negative_feedback_count": negative_count,
        "average_score": avg_score,
        "items": items
    }

def get_escalations_report(
    db: Session,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    stmt = select(Performance, Engineer.engineer_name, Company.company_name, Schedule.country)\
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)\
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)\
        .join(Company, Engineer.company_id == Company.company_id)\
        .where(Performance.escalation.is_(True))

    if company_id:
        stmt = stmt.where(Engineer.company_id == company_id)
    if start_date:
        stmt = stmt.where(Performance.actual_start_date >= start_date)
    if end_date:
        stmt = stmt.where(Performance.actual_start_date <= end_date)

    rows = db.execute(stmt).all()
    items = []
    by_engineer = {}
    by_country = {}

    for row in rows:
        perf, eng_name, comp_name, country = row[0], row[1], row[2], row[3] or "Unknown Country"
        by_engineer[eng_name] = by_engineer.get(eng_name, 0) + 1
        by_country[country] = by_country.get(country, 0) + 1

        items.append({
            "performance_id": str(perf.performance_id),
            "engineer_name": eng_name,
            "company_name": comp_name,
            "country": country,
            "escalation_reason": perf.escalation_reason or "Reason not specified",
            "feedback": perf.feedback,
            "date": perf.actual_start_date.isoformat() if perf.actual_start_date else None
        })

    return {
        "total_escalations": len(items),
        "by_engineer": [{"label": k, "count": v} for k, v in by_engineer.items()],
        "by_country": [{"label": k, "count": v} for k, v in by_country.items()],
        "items": items
    }

def get_deployments_by_country_report(
    db: Session,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    stmt = select(Schedule, Engineer.engineer_name, Engineer.engineer_id, Company.company_name)\
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)\
        .join(Company, Engineer.company_id == Company.company_id)

    if company_id:
        stmt = stmt.where(Engineer.company_id == company_id)
    if start_date:
        stmt = stmt.where(Schedule.start_date >= start_date)
    if end_date:
        stmt = stmt.where(Schedule.start_date <= end_date)

    rows = db.execute(stmt).all()

    by_country = {}
    for row in rows:
        sch, eng_name, eng_id, comp_name = row[0], row[1], row[2], row[3]
        c_name = sch.country or "Unassigned Country"
        
        if c_name not in by_country:
            by_country[c_name] = {
                "country": c_name,
                "deployment_count": 0,
                "engineers": set(),
                "total_days": 0,
                "current_count": 0,
                "upcoming_count": 0,
                "completed_count": 0,
                "items": []
            }
        
        entry = by_country[c_name]
        entry["deployment_count"] += 1
        entry["engineers"].add(eng_id)
        
        st = sch.schedule_status or ""
        if st in ('Active', 'Confirmed'):
            entry["current_count"] += 1
        elif st == 'Upcoming':
            entry["upcoming_count"] += 1
        elif st == 'Completed':
            entry["completed_count"] += 1

        if sch.start_date and sch.end_date:
            days = (sch.end_date - sch.start_date).days
            if days > 0:
                entry["total_days"] += days

        entry["items"].append({
            "schedule_id": str(sch.schedule_id),
            "engineer_name": eng_name,
            "company_name": comp_name,
            "fab_city": sch.fab_city or "N/A",
            "fab_site": sch.fab_site or "N/A",
            "support_type": sch.support_type or "N/A",
            "status": sch.schedule_status or "Unknown",
            "start_date": sch.start_date.isoformat() if sch.start_date else None,
            "end_date": sch.end_date.isoformat() if sch.end_date else None
        })

    country_list = []
    for c_name, data in by_country.items():
        country_list.append({
            "country": data["country"],
            "deployment_count": data["deployment_count"],
            "unique_engineers_count": len(data["engineers"]),
            "total_deployment_days": data["total_days"],
            "current_deployments": data["current_count"],
            "upcoming_deployments": data["upcoming_count"],
            "completed_deployments": data["completed_count"],
            "items": data["items"]
        })

    return {
        "total_countries": len(country_list),
        "total_deployments": len(rows),
        "countries": country_list
    }

