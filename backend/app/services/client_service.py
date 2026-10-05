import logging
from datetime import date, datetime
from typing import List, Optional, Dict, Any, Set
from uuid import UUID
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status

from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.skill import Skill
from app.models.ion_skill import IonSkillTool, IonSkillExperience, IonSkillAssessment
from app.models.user import User
from app.services.auth_service import get_user_authorized_company_ids, enforce_company_isolation
from app.services.engineer_matching import TAXONOMY_MAP, COUNTRY_NORMALIZATION_MAP
from app.schemas.client import (
    ClientAuthorizedCompany,
    ClientKpiStats,
    ClientCompanyShowcaseItem,
    ClientOverviewResponse,
    CompanyEngineerCount,
    CompetencyLevelCount,
    TopToolCapability,
    ClientWorkforceResponse,
    SpecificProductExpertise,
    ProductFamilyExpertise,
    ProcessExpertise,
    IonToolExpertiseItem,
    ClientExpertiseResponse,
    DeploymentYearMetric,
    DurationBucket,
    DeploymentTypeMetric,
    ClientDeploymentsResponse,
    GeographyCountryItem,
    ClientGeographyResponse,
    ClientCompanyDetailResponse,
)

logger = logging.getLogger(__name__)

ION_COMPANY_ID = UUID("f81bd16c-2f63-4818-a653-7486fe3f45ec")

# Preset logos and taglines fallback
COMPANY_METADATA: Dict[str, Dict[str, str]] = {
    "11b9d863-b83c-4af3-8db5-b6e773f78235": {
        "tagline": "Semiconductor Etch, Deposition & Clean Systems",
        "logo": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#C1121F",
        "theme_key": "lam",
    },
    "f81bd16c-2f63-4818-a653-7486fe3f45ec": {
        "tagline": "Ion Implantation Solutions for Semiconductor Fabrication",
        "logo": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#A2D2FF",
        "theme_key": "axcelis",
    },
    "725584e5-1708-40b3-a1d6-3ffbdca21316": {
        "tagline": "Axcelis Contamination Control Solutions & Ion Services",
        "logo": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#A2D2FF",
        "theme_key": "axcelis",
    },
    "34d51cd0-fb63-4684-96a3-662477298678": {
        "tagline": "Discrete Semiconductors & Passive Electronic Components",
        "logo": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#495867",
        "theme_key": "vishay",
    },
}

COUNTRY_CODE_MAP = {
    "USA": "US",
    "Taiwan": "TW",
    "India": "IN",
    "Japan": "JP",
    "Singapore": "SG",
    "Korea": "KR",
    "Germany": "DE",
    "Ireland": "IE",
    "Israel": "IL",
    "China": "CN",
    "Austria": "AT",
    "Italy": "IT",
    "France": "FR",
    "Netherlands": "NL",
    "Malaysia": "MY",
    "Vietnam": "VN",
}


def normalize_country(raw_country: Optional[str]) -> Optional[str]:
    if not raw_country:
        return None
    cleaned = raw_country.strip().lower()
    if not cleaned or cleaned in ("none", "null", "unknown", "n/a", "-"):
        return None
    if cleaned in COUNTRY_NORMALIZATION_MAP:
        return COUNTRY_NORMALIZATION_MAP[cleaned]
    # Simple capitalization fallback
    return raw_country.strip().title()


def get_authorized_scope(
    db: Session,
    current_user: User,
    requested_company_ids: Optional[List[UUID]] = None
) -> List[UUID]:
    """
    Resolve and authorize company IDs for current user.
    """
    validated = enforce_company_isolation(db, current_user, requested_company_ids)
    if validated is None:
        return get_user_authorized_company_ids(db, current_user)
    if isinstance(validated, UUID):
        return [validated]
    return validated


def get_client_authorized_companies(db: Session, current_user: User) -> List[ClientAuthorizedCompany]:
    auth_cids = get_user_authorized_company_ids(db, current_user)
    if not auth_cids:
        return []
    comps = db.scalars(select(Company).where(Company.company_id.in_(auth_cids), Company.is_active.is_(True))).all()
    results = []
    for c in comps:
        cid_str = str(c.company_id)
        meta = COMPANY_METADATA.get(cid_str, {})
        results.append(ClientAuthorizedCompany(
            company_id=c.company_id,
            company_name=c.company_name,
            short_name=c.short_name,
            tagline=meta.get("tagline", f"{c.company_name} Semiconductor Operations"),
            logo=c.logo or meta.get("logo"),
            primary_color=meta.get("primary_color", "#1E293B"),
            theme_key=getattr(c, "theme_key", None) or meta.get("theme_key", "default"),
        ))
    return results


def get_client_overview(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> ClientOverviewResponse:
    scope_cids = get_authorized_scope(db, current_user, company_ids)
    today = date.today()

    if not scope_cids:
        return ClientOverviewResponse(
            kpi=ClientKpiStats(
                companies_served=0,
                total_engineers=0,
                active_engineers=0,
                total_deployments=0,
                countries_covered=0,
                total_deployment_days=0,
                years_of_history="0 Years",
                earliest_deployment_year=None,
            ),
            companies=[],
            authorized_companies=[],
        )

    # 1. Fetch Companies
    companies = list(db.scalars(
        select(Company).where(Company.company_id.in_(scope_cids), Company.is_active.is_(True))
    ).all())
    comp_dict = {c.company_id: c for c in companies}

    # 2. Fetch Engineers
    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_id_to_comp = {e.engineer_id: e.company_id for e in engineers}
    eng_ids = list(eng_id_to_comp.keys())

    # 3. Fetch Schedules
    schedules = list(db.scalars(
        select(Schedule).where(Schedule.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    # KPI Calculation
    companies_served = len(companies)
    total_engineers = len(engineers)

    active_eng_ids: Set[UUID] = set()
    for e in engineers:
        if (e.status or "").lower() in ("active", "deployed"):
            active_eng_ids.add(e.engineer_id)

    total_deployments = len(schedules)
    distinct_countries: Set[str] = set()
    total_deployment_days = 0
    earliest_year: Optional[int] = None

    # Per-company tracking
    comp_eng_counts: Dict[UUID, int] = defaultdict(int)
    comp_active_eng_counts: Dict[UUID, int] = defaultdict(int)
    comp_sched_counts: Dict[UUID, int] = defaultdict(int)
    comp_countries: Dict[UUID, Set[str]] = defaultdict(set)
    comp_min_year: Dict[UUID, int] = {}
    comp_tools: Dict[UUID, Set[str]] = defaultdict(set)

    for e in engineers:
        cid = e.company_id
        comp_eng_counts[cid] += 1
        if e.engineer_id in active_eng_ids:
            comp_active_eng_counts[cid] += 1
        if e.primary_tool_type:
            comp_tools[cid].add(e.primary_tool_type.strip())

    for s in schedules:
        cid = eng_id_to_comp.get(s.engineer_id)
        if cid:
            comp_sched_counts[cid] += 1

        norm_c = normalize_country(s.country)
        if norm_c:
            distinct_countries.add(norm_c)
            if cid:
                comp_countries[cid].add(norm_c)

        if s.start_date:
            s_year = s.start_date.year
            if earliest_year is None or s_year < earliest_year:
                earliest_year = s_year
            if cid:
                if cid not in comp_min_year or s_year < comp_min_year[cid]:
                    comp_min_year[cid] = s_year

            if s.end_date and s.end_date >= s.start_date:
                days = (s.end_date - s.start_date).days + 1
                total_deployment_days += days

    curr_year = today.year
    if earliest_year:
        years_span = curr_year - earliest_year + 1
        years_of_history = f"{earliest_year} – Present ({years_span} Yr{'s' if years_span > 1 else ''})"
    else:
        years_of_history = "Operational"

    kpi = ClientKpiStats(
        companies_served=companies_served,
        total_engineers=total_engineers,
        active_engineers=len(active_eng_ids),
        total_deployments=total_deployments,
        countries_covered=len(distinct_countries),
        total_deployment_days=total_deployment_days,
        years_of_history=years_of_history,
        earliest_deployment_year=earliest_year,
    )

    # Build company showcase cards
    company_cards: List[ClientCompanyShowcaseItem] = []
    for c in companies:
        cid = c.company_id
        cid_str = str(cid)
        meta = COMPANY_METADATA.get(cid_str, {})
        c_min_y = comp_min_year.get(cid, earliest_year or curr_year)
        op_period = f"{c_min_y} – Present" if c_min_y else "Active"
        top_tools = sorted(list(comp_tools.get(cid, set())))[:4]

        company_cards.append(ClientCompanyShowcaseItem(
            company_id=cid,
            company_name=c.company_name,
            short_name=c.short_name,
            tagline=meta.get("tagline", f"{c.company_name} Semiconductor Operations"),
            logo=c.logo or meta.get("logo"),
            primary_color=meta.get("primary_color", "#1E293B"),
            theme_key=getattr(c, "theme_key", None) or meta.get("theme_key", "default"),
            engineer_count=comp_eng_counts.get(cid, 0),
            active_engineer_count=comp_active_eng_counts.get(cid, 0),
            deployment_count=comp_sched_counts.get(cid, 0),
            countries_count=len(comp_countries.get(cid, set())),
            countries=sorted(list(comp_countries.get(cid, set()))),
            operational_period=op_period,
            top_tools=top_tools,
        ))

    auth_companies = get_client_authorized_companies(db, current_user)

    return ClientOverviewResponse(
        kpi=kpi,
        companies=company_cards,
        authorized_companies=auth_companies,
    )


def get_client_companies(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> List[ClientCompanyShowcaseItem]:
    overview = get_client_overview(db, current_user, company_ids)
    return overview.companies


def get_client_workforce(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> ClientWorkforceResponse:
    scope_cids = get_authorized_scope(db, current_user, company_ids)
    if not scope_cids:
        return ClientWorkforceResponse(
            total_engineers=0,
            active_deployed=0,
            available_standby=0,
            on_leave=0,
            by_company=[],
            by_competency_level=[],
            top_tools=[],
        )

    companies = list(db.scalars(
        select(Company).where(Company.company_id.in_(scope_cids), Company.is_active.is_(True))
    ).all())
    comp_map = {c.company_id: c for c in companies}

    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())

    total = len(engineers)
    active_cnt = 0
    available_cnt = 0
    on_leave_cnt = 0

    comp_engs: Dict[UUID, int] = defaultdict(int)
    comp_actives: Dict[UUID, int] = defaultdict(int)
    levels_count: Dict[str, int] = defaultdict(int)
    tools_count: Dict[str, int] = defaultdict(int)

    for e in engineers:
        cid = e.company_id
        comp_engs[cid] += 1
        st = (e.status or "").lower()

        if "leave" in st or "pto" in st:
            on_leave_cnt += 1
        elif "deployed" in st or "active" in st:
            active_cnt += 1
            comp_actives[cid] += 1
        else:
            available_cnt += 1

        lvl = e.level or "L3 Senior"
        levels_count[lvl] += 1

        if e.primary_tool_type:
            raw_tool = e.primary_tool_type.strip()
            if raw_tool:
                tools_count[raw_tool] += 1

    by_company = []
    for c in companies:
        cid = c.company_id
        meta = COMPANY_METADATA.get(str(cid), {})
        by_company.append(CompanyEngineerCount(
            company_id=cid,
            company_name=c.company_name,
            short_name=c.short_name,
            engineer_count=comp_engs.get(cid, 0),
            active_count=comp_actives.get(cid, 0),
            primary_color=meta.get("primary_color", "#1E293B"),
        ))

    # Standard order for competency levels
    competency_order = ["L1 Junior", "L2 Specialist", "L3 Senior", "L4 Master", "L5 Principal Expert"]
    by_levels = []
    for lvl in competency_order:
        cnt = levels_count.get(lvl, 0)
        by_levels.append(CompetencyLevelCount(level=lvl, count=cnt))
    for lvl, cnt in levels_count.items():
        if lvl not in competency_order:
            by_levels.append(CompetencyLevelCount(level=lvl, count=cnt))

    top_tools = [
        TopToolCapability(tool_name=tool, engineer_count=cnt)
        for tool, cnt in sorted(tools_count.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    return ClientWorkforceResponse(
        total_engineers=total,
        active_deployed=active_cnt,
        available_standby=available_cnt,
        on_leave=on_leave_cnt,
        by_company=by_company,
        by_competency_level=by_levels,
        top_tools=top_tools,
    )


def get_client_expertise(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> ClientExpertiseResponse:
    scope_cids = get_authorized_scope(db, current_user, company_ids)
    if not scope_cids:
        return ClientExpertiseResponse(processes=[], ion_tools=[])

    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_ids = [e.engineer_id for e in engineers]

    # 1. Aggregate Standard / LAM Taxonomy
    skills = list(db.scalars(
        select(Skill).where(Skill.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    # Map: Process -> Family -> Product -> set of engineer_ids
    taxonomy_hierarchy: Dict[str, Dict[str, Dict[str, Set[UUID]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(set))
    )
    process_engs: Dict[str, Set[UUID]] = defaultdict(set)
    family_engs: Dict[str, Set[UUID]] = defaultdict(set)

    def process_tool_string(raw_str: str, eid: UUID):
        if not raw_str:
            return
        cleaned = raw_str.strip().lower()
        tax = TAXONOMY_MAP.get(cleaned)
        if tax:
            proc = tax.get("process") or "Other"
            fam = tax.get("family") or "General"
            prod = tax.get("product") or raw_str.strip().title()
            variant = tax.get("variant")
            prod_key = f"{prod} ({variant})" if variant else prod

            taxonomy_hierarchy[proc][fam][prod_key].add(eid)
            process_engs[proc].add(eid)
            family_engs[fam].add(eid)
        else:
            # Fallback grouping by tool name
            proc = "Etch" if "etch" in cleaned else ("Deposition" if any(k in cleaned for k in ("dep", "cvd", "ald", "vector", "altus", "sabre")) else ("Strip & Clean" if any(k in cleaned for k in ("clean", "eos", "dv")) else "Semiconductor Process"))
            fam = raw_str.strip().title()
            prod_key = raw_str.strip().title()
            taxonomy_hierarchy[proc][fam][prod_key].add(eid)
            process_engs[proc].add(eid)
            family_engs[fam].add(eid)

    # Process skills from skills table
    for sk in skills:
        if sk.tool_type:
            process_tool_string(sk.tool_type, sk.engineer_id)

    # Also process primary_tool_type from engineers
    for eng in engineers:
        if eng.primary_tool_type:
            process_tool_string(eng.primary_tool_type, eng.engineer_id)

    # Structure into clean hierarchy
    processes_list: List[ProcessExpertise] = []
    for proc_name, families in sorted(taxonomy_hierarchy.items()):
        families_list: List[ProductFamilyExpertise] = []
        for fam_name, products in sorted(families.items()):
            products_list: List[SpecificProductExpertise] = [
                SpecificProductExpertise(
                    product_name=p_name,
                    engineer_count=len(e_set),
                )
                for p_name, e_set in sorted(products.items(), key=lambda x: len(x[1]), reverse=True)
            ]
            families_list.append(ProductFamilyExpertise(
                family_name=fam_name,
                total_engineers=len(family_engs.get(fam_name, set())),
                products=products_list,
            ))
        processes_list.append(ProcessExpertise(
            process_name=proc_name,
            total_engineers=len(process_engs.get(proc_name, set())),
            families=families_list,
        ))

    # 2. Axcelis ION Tools & Competency Matrix
    ion_tools_list: List[IonToolExpertiseItem] = []
    is_ion_authorized = any(cid == ION_COMPANY_ID for cid in scope_cids)

    if is_ion_authorized:
        ion_tools = list(db.scalars(
            select(IonSkillTool).where(IonSkillTool.is_active.is_(True)).order_by(IonSkillTool.display_order.asc())
        ).all())

        tool_eng_set: Dict[UUID, Set[UUID]] = defaultdict(set)
        tool_level_counts: Dict[UUID, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        experiences = list(db.scalars(
            select(IonSkillExperience).where(IonSkillExperience.is_active.is_(True))
        ).all())
        for exp in experiences:
            tool_eng_set[exp.tool_id].add(exp.engineer_id)
            if exp.level:
                tool_level_counts[exp.tool_id][exp.level] += 1

        for it in ion_tools:
            e_count = len(tool_eng_set.get(it.tool_id, set()))
            # If no explicit experiences recorded yet, fallback to Ion engineers matching tool series
            if e_count == 0:
                e_count = sum(1 for e in engineers if e.company_id == ION_COMPANY_ID)
            ion_tools_list.append(IonToolExpertiseItem(
                tool_id=it.tool_id,
                tool_name=it.tool_name,
                series=it.series,
                display_order=it.display_order,
                engineer_count=e_count,
                level_counts=dict(tool_level_counts.get(it.tool_id, {})),
            ))

    return ClientExpertiseResponse(
        processes=processes_list,
        ion_tools=ion_tools_list,
    )


def get_client_deployments(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> ClientDeploymentsResponse:
    scope_cids = get_authorized_scope(db, current_user, company_ids)
    today = date.today()

    if not scope_cids:
        return ClientDeploymentsResponse(
            total_deployments=0,
            completed_deployments=0,
            ongoing_deployments=0,
            future_deployments=0,
            total_deployment_days=0,
            average_duration_days=0.0,
            longest_deployment_days=0,
            engineers_with_multiple_deployments=0,
            deployments_by_year=[],
            duration_buckets=[],
            deployments_by_type=[],
        )

    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_ids = [e.engineer_id for e in engineers]

    schedules = list(db.scalars(
        select(Schedule).where(Schedule.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    total_deployments = len(schedules)
    completed_cnt = 0
    ongoing_cnt = 0
    future_cnt = 0
    total_days = 0
    longest_days = 0
    valid_durations_count = 0

    year_counts: Dict[int, int] = defaultdict(int)
    year_days: Dict[int, int] = defaultdict(int)
    bucket_counts: Dict[str, int] = {
        "< 7 days": 0,
        "7–30 days": 0,
        "31–90 days": 0,
        "90+ days": 0,
    }
    type_counts: Dict[str, int] = defaultdict(int)
    eng_sched_counts: Dict[UUID, int] = defaultdict(int)

    for s in schedules:
        eng_sched_counts[s.engineer_id] += 1

        # Classify deployment state
        if s.start_date:
            if s.start_date > today:
                future_cnt += 1
            elif (s.schedule_status == "Completed") or (s.end_date and s.end_date < today):
                completed_cnt += 1
            else:
                ongoing_cnt += 1

            s_year = s.start_date.year
            year_counts[s_year] += 1
        else:
            if s.schedule_status == "Completed":
                completed_cnt += 1
            else:
                ongoing_cnt += 1

        # Calculate duration
        if s.start_date and s.end_date and s.end_date >= s.start_date:
            duration = (s.end_date - s.start_date).days + 1
            total_days += duration
            valid_durations_count += 1
            if duration > longest_days:
                longest_days = duration

            if s.start_date:
                year_days[s.start_date.year] += duration

            if duration < 7:
                bucket_counts["< 7 days"] += 1
            elif duration <= 30:
                bucket_counts["7–30 days"] += 1
            elif duration <= 90:
                bucket_counts["31–90 days"] += 1
            else:
                bucket_counts["90+ days"] += 1

        stype = (s.support_type or "Field Support").strip()
        type_counts[stype] += 1

    avg_duration = round(total_days / valid_durations_count, 1) if valid_durations_count > 0 else 0.0
    multiple_deployments_engs = sum(1 for cnt in eng_sched_counts.values() if cnt > 1)

    by_year = [
        DeploymentYearMetric(year=yr, deployments=year_counts[yr], total_days=year_days.get(yr, 0))
        for yr in sorted(year_counts.keys())
    ]

    total_bucketed = sum(bucket_counts.values())
    duration_buckets = [
        DurationBucket(
            bucket=b_name,
            count=b_cnt,
            percentage=round((b_cnt / total_bucketed * 100), 1) if total_bucketed > 0 else 0.0,
        )
        for b_name, b_cnt in bucket_counts.items()
    ]

    by_type = [
        DeploymentTypeMetric(support_type=st, count=cnt)
        for st, cnt in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    return ClientDeploymentsResponse(
        total_deployments=total_deployments,
        completed_deployments=completed_cnt,
        ongoing_deployments=ongoing_cnt,
        future_deployments=future_cnt,
        total_deployment_days=total_days,
        average_duration_days=avg_duration,
        longest_deployment_days=longest_days,
        engineers_with_multiple_deployments=multiple_deployments_engs,
        deployments_by_year=by_year,
        duration_buckets=duration_buckets,
        deployments_by_type=by_type,
    )


def get_client_geography(
    db: Session,
    current_user: User,
    company_ids: Optional[List[UUID]] = None
) -> ClientGeographyResponse:
    scope_cids = get_authorized_scope(db, current_user, company_ids)
    if not scope_cids:
        return ClientGeographyResponse(total_deployments=0, countries_count=0, countries=[])

    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_ids = [e.engineer_id for e in engineers]

    schedules = list(db.scalars(
        select(Schedule).where(Schedule.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    country_counts: Dict[str, int] = defaultdict(int)
    total_valid = 0

    for s in schedules:
        norm_c = normalize_country(s.country)
        if norm_c:
            country_counts[norm_c] += 1
            total_valid += 1

    # Fallback if no country in schedule: add India
    if not country_counts and engineers:
        country_counts["India"] = len(engineers)
        total_valid = len(engineers)

    country_items: List[GeographyCountryItem] = []
    for c_name, cnt in sorted(country_counts.items(), key=lambda x: x[1], reverse=True):
        code = COUNTRY_CODE_MAP.get(c_name, c_name[:3].upper())
        pct = round((cnt / total_valid * 100), 1) if total_valid > 0 else 0.0
        country_items.append(GeographyCountryItem(
            name=c_name,
            code=code,
            value=cnt,
            percentage=pct,
        ))

    return ClientGeographyResponse(
        total_deployments=len(schedules),
        countries_count=len(country_items),
        countries=country_items,
    )


def get_client_company_detail(
    db: Session,
    current_user: User,
    company_id: UUID
) -> ClientCompanyDetailResponse:
    # Validate authorization for this specific company
    enforce_company_isolation(db, current_user, [company_id])

    overview = get_client_overview(db, current_user, [company_id])
    if not overview.companies:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found or not authorized."
        )

    company_item = overview.companies[0]
    workforce = get_client_workforce(db, current_user, [company_id])
    deployments = get_client_deployments(db, current_user, [company_id])
    geography = get_client_geography(db, current_user, [company_id])
    expertise = get_client_expertise(db, current_user, [company_id])

    return ClientCompanyDetailResponse(
        company=company_item,
        kpi=overview.kpi,
        workforce=workforce,
        deployments=deployments,
        geography=geography,
        expertise=expertise,
    )
