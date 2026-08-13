from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select
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
from app.schemas.operational import OperationalAlert

def get_company_operational_alerts(db: Session, company_id: Optional[UUID] = None) -> List[OperationalAlert]:
    """
    Derive deterministic operational alerts and exceptions for a company (or Master All Data).
    """
    today = date.today()

    if company_id is not None:
        company = db.get(Company, company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

    # Fetch Companies for company_name lookup
    companies = list(db.scalars(select(Company)).all())
    comp_map = {c.company_id: c.company_name for c in companies}

    # Base Queries
    eng_stmt = select(Engineer)
    sch_stmt = select(Schedule).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    visa_stmt = select(Visa).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
    trv_stmt = select(Travel).join(Schedule, Travel.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    perf_stmt = select(Performance).join(Schedule, Performance.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    leave_stmt = select(Leave).join(Engineer, Leave.engineer_id == Engineer.engineer_id)
    missed_stmt = select(MissedSchedule).join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id).join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    skill_stmt = select(Skill).join(Engineer, Skill.engineer_id == Engineer.engineer_id)

    if company_id is not None:
        eng_stmt = eng_stmt.where(Engineer.company_id == company_id)
        sch_stmt = sch_stmt.where(Engineer.company_id == company_id)
        visa_stmt = visa_stmt.where(Engineer.company_id == company_id)
        trv_stmt = trv_stmt.where(Engineer.company_id == company_id)
        perf_stmt = perf_stmt.where(Engineer.company_id == company_id)
        leave_stmt = leave_stmt.where(Engineer.company_id == company_id)
        missed_stmt = missed_stmt.where(Engineer.company_id == company_id)
        skill_stmt = skill_stmt.where(Engineer.company_id == company_id)

    engineers = list(db.scalars(eng_stmt).all())
    schedules = list(db.scalars(sch_stmt).all())
    visas = list(db.scalars(visa_stmt).all())
    travels = list(db.scalars(trv_stmt).all())
    performances = list(db.scalars(perf_stmt).all())
    leaves = list(db.scalars(leave_stmt).all())
    missed_schedules = list(db.scalars(missed_stmt).all())
    skills = list(db.scalars(skill_stmt).all())

    alerts: List[OperationalAlert] = []

    # Map lookups
    eng_map = {e.engineer_id: e for e in engineers}
    sch_travel_map = {t.schedule_id: t for t in travels}
    sch_perf_map = {p.schedule_id: p for p in performances}
    sch_missed_map = {m.schedule_id: m for m in missed_schedules}

    def get_comp_info(eng: Optional[Engineer]):
        if not eng or not eng.company_id:
            return None, None
        return str(eng.company_id), comp_map.get(eng.company_id)

    # 1. Schedule vs Leave Overlap
    for s in schedules:
        eng_leaves = [l for l in leaves if l.engineer_id == s.engineer_id]
        for l in eng_leaves:
            if l.requested_date and s.start_date:
                s_end = s.end_date or s.start_date
                if s.start_date <= l.requested_date <= s_end:
                    eng = eng_map.get(s.engineer_id)
                    eng_name = eng.engineer_name if eng else "Engineer"
                    c_id, c_name = get_comp_info(eng)
                    alerts.append(OperationalAlert(
                        id=f"alert-leave-{s.schedule_id}-{l.leave_id}",
                        type="leave",
                        severity="warning",
                        title="Schedule / Leave overlap",
                        message=f"Schedule for {eng_name} ({s.start_date} to {s.end_date or 'ongoing'}) overlaps with requested leave on {l.requested_date}.",
                        engineer_id=str(s.engineer_id),
                        schedule_id=str(s.schedule_id),
                        company_id=c_id,
                        company_name=c_name
                    ))

    # 2. Schedule vs Schedule Overlap per Engineer
    eng_schedules_map: dict[UUID, List[Schedule]] = {}
    for s in schedules:
        eng_schedules_map.setdefault(s.engineer_id, []).append(s)

    for eng_id, sch_list in eng_schedules_map.items():
        if len(sch_list) > 1:
            for i in range(len(sch_list)):
                for j in range(i + 1, len(sch_list)):
                    s1, s2 = sch_list[i], sch_list[j]
                    s1_end = s1.end_date or date(2099, 12, 31)
                    s2_end = s2.end_date or date(2099, 12, 31)
                    if s1.start_date <= s2_end and s2.start_date <= s1_end:
                        eng = eng_map.get(eng_id)
                        eng_name = eng.engineer_name if eng else "Engineer"
                        c_id, c_name = get_comp_info(eng)
                        alerts.append(OperationalAlert(
                            id=f"alert-overlap-{s1.schedule_id}-{s2.schedule_id}",
                            type="schedule",
                            severity="warning",
                            title="Potential Overlapping Schedules",
                            message=f"Schedule '{s1.support_type}' overlaps with schedule '{s2.support_type}' for {eng_name}.",
                            engineer_id=str(eng_id),
                            schedule_id=str(s1.schedule_id),
                            company_id=c_id,
                            company_name=c_name
                        ))

    # 3. Visa Validation per Schedule
    for s in schedules:
        eng_visas = [v for v in visas if v.engineer_id == s.engineer_id and v.country.lower() == s.country.lower()]
        eng = eng_map.get(s.engineer_id)
        eng_name = eng.engineer_name if eng else "Engineer"
        c_id, c_name = get_comp_info(eng)

        if not eng_visas:
            alerts.append(OperationalAlert(
                id=f"alert-visa-missing-{s.schedule_id}",
                type="visa",
                severity="warning",
                title="Visa information requires review",
                message=f"No visa record found for {eng_name} in assignment country '{s.country}'.",
                engineer_id=str(s.engineer_id),
                schedule_id=str(s.schedule_id),
                company_id=c_id,
                company_name=c_name
            ))
        else:
            for v in eng_visas:
                if v.visa_end_date:
                    if v.visa_end_date < today:
                        alerts.append(OperationalAlert(
                            id=f"alert-visa-expired-{v.visa_id}",
                            type="visa",
                            severity="warning",
                            title="Visa validity requires review",
                            message=f"Visa for {eng_name} in {v.country} expired on {v.visa_end_date}.",
                            engineer_id=str(s.engineer_id),
                            schedule_id=str(s.schedule_id),
                            company_id=c_id,
                            company_name=c_name
                        ))
                    elif s.end_date and v.visa_end_date < s.end_date:
                        alerts.append(OperationalAlert(
                            id=f"alert-visa-short-{v.visa_id}",
                            type="visa",
                            severity="warning",
                            title="Visa dates may not cover schedule",
                            message=f"Visa for {eng_name} expires on {v.visa_end_date}, before schedule completion date {s.end_date}.",
                            engineer_id=str(s.engineer_id),
                            schedule_id=str(s.schedule_id),
                            company_id=c_id,
                            company_name=c_name
                        ))

    # 4. Travel Booking Validation
    for s in schedules:
        if s.schedule_id not in sch_travel_map:
            eng = eng_map.get(s.engineer_id)
            eng_name = eng.engineer_name if eng else "Engineer"
            c_id, c_name = get_comp_info(eng)
            alerts.append(OperationalAlert(
                id=f"alert-travel-missing-{s.schedule_id}",
                type="travel",
                severity="info",
                title="Travel information not added",
                message=f"No travel arrangement recorded for {eng_name}'s schedule in {s.country} ({s.fab_site or 'Fab Site'}).",
                engineer_id=str(s.engineer_id),
                schedule_id=str(s.schedule_id),
                company_id=c_id,
                company_name=c_name
            ))

    # 5. Performance Validation
    for s in schedules:
        eng = eng_map.get(s.engineer_id)
        eng_name = eng.engineer_name if eng else "Engineer"
        c_id, c_name = get_comp_info(eng)
        if s.schedule_id not in sch_perf_map:
            alerts.append(OperationalAlert(
                id=f"alert-perf-missing-{s.schedule_id}",
                type="performance",
                severity="info",
                title="Performance not recorded",
                message=f"Performance record has not been recorded for {eng_name}'s schedule '{s.support_type}'.",
                engineer_id=str(s.engineer_id),
                schedule_id=str(s.schedule_id),
                company_id=c_id,
                company_name=c_name
            ))
        else:
            p = sch_perf_map[s.schedule_id]
            if p.escalation is True and not (p.escalation_reason or '').strip():
                alerts.append(OperationalAlert(
                    id=f"alert-perf-escalation-{p.performance_id}",
                    type="performance",
                    severity="warning",
                    title="Escalation reason missing",
                    message=f"Performance record for {eng_name} has escalation enabled, but escalation reason is missing.",
                    engineer_id=str(s.engineer_id),
                    schedule_id=str(s.schedule_id),
                    company_id=c_id,
                    company_name=c_name
                ))

    # 6. Missed Schedule Validation
    for s in schedules:
        if s.schedule_id in sch_missed_map:
            m = sch_missed_map[s.schedule_id]
            eng = eng_map.get(s.engineer_id)
            eng_name = eng.engineer_name if eng else "Engineer"
            c_id, c_name = get_comp_info(eng)
            alerts.append(OperationalAlert(
                id=f"alert-missed-{m.missed_schedule_id}",
                type="missed_schedule",
                severity="warning",
                title="Missed schedule exception",
                message=f"Missed schedule exception recorded for {eng_name}: {m.reason or 'Schedule delay reported'}.",
                engineer_id=str(s.engineer_id),
                schedule_id=str(s.schedule_id),
                company_id=c_id,
                company_name=c_name
            ))

    # 7. Skills Information Check
    eng_skills_map: dict[UUID, List[Skill]] = {}
    for sk in skills:
        eng_skills_map.setdefault(sk.engineer_id, []).append(sk)

    for eng in engineers:
        if eng.engineer_id not in eng_skills_map:
            c_id, c_name = get_comp_info(eng)
            alerts.append(OperationalAlert(
                id=f"alert-skills-missing-{eng.engineer_id}",
                type="skills",
                severity="info",
                title="Skill information unavailable",
                message=f"No skill matrix or tool certifications recorded for engineer {eng.engineer_name}.",
                engineer_id=str(eng.engineer_id),
                company_id=c_id,
                company_name=c_name
            ))

    return alerts

def get_engineer_operational_alerts(db: Session, engineer_id: UUID) -> List[OperationalAlert]:
    """
    Derive deterministic operational alerts for a single engineer.
    """
    eng = db.get(Engineer, engineer_id)
    if eng is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    all_company_alerts = get_company_operational_alerts(db, company_id=eng.company_id)
    return [a for a in all_company_alerts if a.engineer_id == str(engineer_id)]

def get_schedule_operational_alerts(db: Session, schedule_id: UUID) -> List[OperationalAlert]:
    """
    Derive deterministic operational alerts for a single schedule.
    """
    sch = db.get(Schedule, schedule_id)
    if sch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    eng = db.get(Engineer, sch.engineer_id)
    company_id = eng.company_id if eng else None
    all_company_alerts = get_company_operational_alerts(db, company_id=company_id)
    return [a for a in all_company_alerts if a.schedule_id == str(schedule_id)]
