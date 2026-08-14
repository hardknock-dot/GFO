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

def get_reports_summary(
    db: Session,
    company_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> ReportsSummaryResponse:
    company_name = "All Companies"
    if company_id is not None:
        comp = db.get(Company, company_id)
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        company_name = comp.company_name

    # Engineers Query
    eng_stmt = select(func.count(Engineer.engineer_id))
    if company_id:
        eng_stmt = eng_stmt.where(Engineer.company_id == company_id)
    total_engineers = db.scalar(eng_stmt) or 0

    # Schedules Query
    sch_stmt = select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    if company_id:
        sch_stmt = sch_stmt.where(Engineer.company_id == company_id)
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
    sk_stmt = select(func.count(Skill.skill_id)).join(Engineer, Skill.engineer_id == Engineer.engineer_id)
    if company_id:
        sk_stmt = sk_stmt.where(Engineer.company_id == company_id)
    total_skills = db.scalar(sk_stmt) or 0

    # Visas Query
    visa_stmt = select(func.count(Visa.visa_id)).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
    if company_id:
        visa_stmt = visa_stmt.where(Engineer.company_id == company_id)
    total_visas = db.scalar(visa_stmt) or 0

    # Leaves Query
    leave_stmt = select(Leave).join(Engineer, Leave.engineer_id == Engineer.engineer_id)
    if company_id:
        leave_stmt = leave_stmt.where(Engineer.company_id == company_id)
    if start_date:
        leave_stmt = leave_stmt.where(Leave.requested_date >= start_date)
    if end_date:
        leave_stmt = leave_stmt.where(Leave.requested_date <= end_date)
    leaves = list(db.scalars(leave_stmt).all())
    total_leaves = len(leaves)

    # Travel Query
    trv_stmt = select(Travel).join(Schedule, Travel.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    if company_id:
        trv_stmt = trv_stmt.where(Engineer.company_id == company_id)
    if start_date:
        trv_stmt = trv_stmt.where(Travel.travel_date >= start_date)
    if end_date:
        trv_stmt = trv_stmt.where(Travel.travel_date <= end_date)
    travels = list(db.scalars(trv_stmt).all())
    total_travels = len(travels)

    # Performance Query
    perf_stmt = select(Performance).join(Schedule, Performance.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    if company_id:
        perf_stmt = perf_stmt.where(Engineer.company_id == company_id)
    if start_date:
        perf_stmt = perf_stmt.where(Performance.actual_start_date >= start_date)
    if end_date:
        perf_stmt = perf_stmt.where(Performance.actual_start_date <= end_date)
    performances = list(db.scalars(perf_stmt).all())
    total_performances = len(performances)

    scores = [p.score for p in performances if p.score is not None]
    avg_score = round(sum(scores) / len(scores), 2) if scores else None

    # Missed Schedule Query
    ms_stmt = select(MissedSchedule).join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    if company_id:
        ms_stmt = ms_stmt.where(Engineer.company_id == company_id)
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
    total_count = 0

    if category_lower in ('workforce', 'engineers'):
        eng_stmt = select(Engineer)
        if company_id:
            eng_stmt = eng_stmt.where(Engineer.company_id == company_id)
        engineers = list(db.scalars(eng_stmt).all())
        total_count = len(engineers)

        # Distribution by status & level
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
                "name": e.engineer_name,
                "orbit_id": e.orbit_id,
                "status": e.status,
                "level": e.level,
                "primary_tool": e.primary_tool,
                "industry_experience": e.industry_experience,
                "customer_experience": e.customer_experience
            })

        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]
        distributions["by_level"] = [DistributionMetric(label=k, count=v) for k, v in level_counts.items()]
        distributions["by_tool"] = [DistributionMetric(label=k, count=v) for k, v in tool_counts.items()]

    elif category_lower in ('schedules', 'schedule'):
        sch_stmt = select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        if company_id:
            sch_stmt = sch_stmt.where(Engineer.company_id == company_id)
        if start_date:
            sch_stmt = sch_stmt.where(Schedule.start_date >= start_date)
        if end_date:
            sch_stmt = sch_stmt.where(Schedule.start_date <= end_date)
        schedules = list(db.scalars(sch_stmt).all())
        total_count = len(schedules)

        country_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}

        for s in schedules:
            c = s.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            st = s.schedule_status or 'Upcoming'
            status_counts[st] = status_counts.get(st, 0) + 1

            items.append({
                "id": str(s.schedule_id),
                "project_code": f"PRJ-{str(s.schedule_id)[:8].upper()}",
                "support_type": s.support_type,
                "country": s.country,
                "fab_site": s.fab_site,
                "start_date": str(s.start_date) if s.start_date else None,
                "end_date": str(s.end_date) if s.end_date else None,
                "status": s.schedule_status
            })

        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]

    elif category_lower in ('skills', 'skill'):
        sk_stmt = select(Skill).join(Engineer, Skill.engineer_id == Engineer.engineer_id)
        if company_id:
            sk_stmt = sk_stmt.where(Engineer.company_id == company_id)
        skills = list(db.scalars(sk_stmt).all())
        total_count = len(skills)

        tool_counts: Dict[str, int] = {}
        wafer_counts: Dict[str, int] = {}

        for sk in skills:
            t = sk.tool_type or 'Etch'
            tool_counts[t] = tool_counts.get(t, 0) + 1
            w = sk.wafer_size or '300mm'
            wafer_counts[w] = wafer_counts.get(w, 0) + 1

            items.append({
                "id": str(sk.skill_id),
                "country": sk.country,
                "fab": sk.fab,
                "tool_type": sk.tool_type,
                "wafer_size": sk.wafer_size,
                "role": sk.role,
                "ready_for_primary_role": sk.ready_for_primary_role
            })

        distributions["by_tool_type"] = [DistributionMetric(label=k, count=v) for k, v in tool_counts.items()]
        distributions["by_wafer_size"] = [DistributionMetric(label=k, count=v) for k, v in wafer_counts.items()]

    elif category_lower in ('visa', 'visas'):
        visa_stmt = select(Visa).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
        if company_id:
            visa_stmt = visa_stmt.where(Engineer.company_id == company_id)
        visas = list(db.scalars(visa_stmt).all())
        total_count = len(visas)

        country_counts: Dict[str, int] = {}
        type_counts: Dict[str, int] = {}

        for v in visas:
            c = v.country or 'Unknown'
            country_counts[c] = country_counts.get(c, 0) + 1
            tp = v.visa_type or 'Work Visa'
            type_counts[tp] = type_counts.get(tp, 0) + 1

            items.append({
                "id": str(v.visa_id),
                "country": v.country,
                "visa_type": v.visa_type,
                "issue_date": str(v.visa_start_date) if v.visa_start_date else None,
                "expiry_date": str(v.visa_end_date) if v.visa_end_date else None,
            })

        distributions["by_country"] = [DistributionMetric(label=k, count=v) for k, v in country_counts.items()]
        distributions["by_type"] = [DistributionMetric(label=k, count=v) for k, v in type_counts.items()]

    elif category_lower in ('leave', 'leaves'):
        leave_stmt = select(Leave).join(Engineer, Leave.engineer_id == Engineer.engineer_id)
        if company_id:
            leave_stmt = leave_stmt.where(Engineer.company_id == company_id)
        if start_date:
            leave_stmt = leave_stmt.where(Leave.requested_date >= start_date)
        if end_date:
            leave_stmt = leave_stmt.where(Leave.requested_date <= end_date)
        leaves = list(db.scalars(leave_stmt).all())
        total_count = len(leaves)

        type_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}

        for l in leaves:
            tp = l.leave_type or 'Annual Leave'
            type_counts[tp] = type_counts.get(tp, 0) + 1
            st = l.approval_status or 'Pending'
            status_counts[st] = status_counts.get(st, 0) + 1

            items.append({
                "id": str(l.leave_id),
                "leave_type": l.leave_type,
                "requested_date": str(l.requested_date) if l.requested_date else None,
                "approval_status": l.approval_status
            })

        distributions["by_type"] = [DistributionMetric(label=k, count=v) for k, v in type_counts.items()]
        distributions["by_status"] = [DistributionMetric(label=k, count=v) for k, v in status_counts.items()]

    elif category_lower in ('performance', 'performances'):
        perf_stmt = select(Performance).join(Schedule, Performance.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        if company_id:
            perf_stmt = perf_stmt.where(Engineer.company_id == company_id)
        if start_date:
            perf_stmt = perf_stmt.where(Performance.actual_start_date >= start_date)
        if end_date:
            perf_stmt = perf_stmt.where(Performance.actual_start_date <= end_date)
        performances = list(db.scalars(perf_stmt).all())
        total_count = len(performances)

        escalation_counts = {"Escalated": 0, "Normal": 0}
        for p in performances:
            if p.escalation:
                escalation_counts["Escalated"] += 1
            else:
                escalation_counts["Normal"] += 1

            items.append({
                "id": str(p.performance_id),
                "score": p.score,
                "escalation": p.escalation,
                "escalation_reason": p.escalation_reason,
                "actual_start_date": str(p.actual_start_date) if p.actual_start_date else None,
                "actual_end_date": str(p.actual_end_date) if p.actual_end_date else None,
            })

        distributions["by_escalation"] = [DistributionMetric(label=k, count=v) for k, v in escalation_counts.items()]

    elif category_lower in ('missed-schedules', 'missed_schedules', 'missed'):
        ms_stmt = select(MissedSchedule).join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        if company_id:
            ms_stmt = ms_stmt.where(Engineer.company_id == company_id)
        if start_date:
            ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date >= start_date)
        if end_date:
            ms_stmt = ms_stmt.where(MissedSchedule.requested_start_date <= end_date)
        missed_schedules = list(db.scalars(ms_stmt).all())
        total_count = len(missed_schedules)

        reason_counts: Dict[str, int] = {}
        for m in missed_schedules:
            r = m.reason or 'General Delay'
            reason_counts[r] = reason_counts.get(r, 0) + 1

            items.append({
                "id": str(m.missed_schedule_id),
                "reason": m.reason,
                "requested_start_date": str(m.requested_start_date) if m.requested_start_date else None,
                "actual_start_date": str(m.actual_start_date) if m.actual_start_date else None,
                "evidence": m.evidence
            })

        distributions["by_reason"] = [DistributionMetric(label=k, count=v) for k, v in reason_counts.items()]

    elif category_lower in ('travel', 'travels'):
        trv_stmt = select(Travel).join(Schedule, Travel.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        if company_id:
            trv_stmt = trv_stmt.where(Engineer.company_id == company_id)
        if start_date:
            trv_stmt = trv_stmt.where(Travel.travel_date >= start_date)
        if end_date:
            trv_stmt = trv_stmt.where(Travel.travel_date <= end_date)
        travels = list(db.scalars(trv_stmt).all())
        total_count = len(travels)

        purpose_counts: Dict[str, int] = {}
        for t in travels:
            p = t.purpose or 'Customer Support'
            purpose_counts[p] = purpose_counts.get(p, 0) + 1

            items.append({
                "id": str(t.travel_id),
                "purpose": t.purpose,
                "booking_date": str(t.booking_date) if t.booking_date else None,
                "travel_date": str(t.travel_date) if t.travel_date else None,
                "comments": t.comments
            })

        distributions["by_purpose"] = [DistributionMetric(label=k, count=v) for k, v in purpose_counts.items()]

    elif category_lower in ('operational', 'operational-exceptions', 'alerts', 'exceptions'):
        alerts = get_company_operational_alerts(db, company_id=company_id)
        total_count = len(alerts)

        severity_counts: Dict[str, int] = {}
        type_counts: Dict[str, int] = {}
        for a in alerts:
            sev = a.severity or 'info'
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            tp = a.type or 'general'
            type_counts[tp] = type_counts.get(tp, 0) + 1

            items.append({
                "id": a.id,
                "type": a.type,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "company_name": a.company_name
            })

        distributions["by_severity"] = [DistributionMetric(label=k, count=v) for k, v in severity_counts.items()]
        distributions["by_type"] = [DistributionMetric(label=k, count=v) for k, v in type_counts.items()]

    else:
        # Default empty fallback
        pass

    return CategoryReportResponse(
        category=category,
        company_name=company_name,
        total_count=total_count,
        distributions=distributions,
        items=items
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
