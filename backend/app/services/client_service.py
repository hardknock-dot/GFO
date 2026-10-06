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
from app.services.engineer_matching import TAXONOMY_MAP
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
        "primary_color": "#3B82C4",
        "theme_key": "axcelis",
    },
    "725584e5-1708-40b3-a1d6-3ffbdca21316": {
        "tagline": "Axcelis Contamination Control Solutions & Ion Services",
        "logo": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#3B82C4",
        "theme_key": "axcelis",
    },
    "34d51cd0-fb63-4684-96a3-662477298678": {
        "tagline": "Discrete Semiconductors & Passive Electronic Components",
        "logo": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80",
        "primary_color": "#495867",
        "theme_key": "vishay",
    },
}

# Exhaustive country normalization dictionary for client presentation
COUNTRY_NORMALIZATION_CLIENT = {
    # United States
    "usa": "United States",
    "us": "United States",
    "u.s.a.": "United States",
    "u.s.": "United States",
    "united states": "United States",
    "united states of america": "United States",
    "arizona": "United States",
    "usa, arizona": "United States",
    "usa arizona": "United States",
    "oregon": "United States",
    "hillsboro oregon, usa": "United States",
    "hillsboro oregon": "United States",
    "usa, hillsboro": "United States",
    "usa hillsboro": "United States",
    "usa - nm": "United States",
    "new mexico": "United States",
    "texas": "United States",
    "california": "United States",
    "idaho": "United States",
    "boise": "United States",
    "austin": "United States",
    "chandler": "United States",

    # Taiwan
    "taiwan": "Taiwan",
    "tawan": "Taiwan",
    "tainan": "Taiwan",
    "hsinchu": "Taiwan",
    "taichung": "Taiwan",

    # South Korea
    "korea": "South Korea",
    "south korea": "South Korea",
    "skorea": "South Korea",
    "republic of korea": "South Korea",
    "pyeongtaek": "South Korea",
    "hwaseong": "South Korea",
    "icheon": "South Korea",

    # Japan
    "japan": "Japan",
    "japn": "Japan",
    "japan kioxia": "Japan",
    "japan, kitakami": "Japan",
    "japan kitakami": "Japan",
    "japan, hokkaido": "Japan",
    "yokkaichi": "Japan",
    "hiroshima": "Japan",
    "kumamoto": "Japan",

    # Singapore
    "singapore": "Singapore",
    "sg": "Singapore",

    # Vietnam
    "vietnam": "Vietnam",
    "veitnam": "Vietnam",
    "viet nam": "Vietnam",

    # Europe
    "germany": "Germany",
    "dresden": "Germany",
    "austria": "Austria",
    "villach": "Austria",
    "ireland": "Ireland",
    "leixlip": "Ireland",
    "italy": "Italy",
    "france": "France",
    "netherlands": "Netherlands",

    # Asia / Others
    "india": "India",
    "ind": "India",
    "israel": "Israel",
    "china": "China",
    "malaysia": "Malaysia",
}

COUNTRY_CODE_MAP = {
    "United States": "US",
    "Taiwan": "TW",
    "India": "IN",
    "Japan": "JP",
    "Singapore": "SG",
    "South Korea": "KR",
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
    if cleaned in COUNTRY_NORMALIZATION_CLIENT:
        return COUNTRY_NORMALIZATION_CLIENT[cleaned]
    # Simple capitalization fallback
    return raw_country.strip().title()


def is_valid_duration_record(start_d: Optional[date], end_d: Optional[date], max_days: int = 730) -> bool:
    """
    Validates deployment dates:
    - start_date must not be null and within plausible operational epoch (2015 to current + 2)
    - end_date must be >= start_date and year not far into future
    - duration must be between 1 and 730 days (2 years max for field project)
    """
    if not start_d or not end_d:
        return False
    if start_d.year < 2015 or start_d.year > 2030:
        return False
    if end_d.year < 2015 or end_d.year > 2030:
        return False
    if end_d < start_d:
        return False
    days = (end_d - start_d).days + 1
    return 1 <= days <= max_days


def normalize_competency_tier(raw_level: Optional[str]) -> str:
    if not raw_level:
        return "Core Field Engineer"
    cleaned = str(raw_level).strip()
    if cleaned in ("1", "L1", "Level 1", "Junior"):
        return "Level 1 - Field Specialist"
    if cleaned in ("2", "L2", "Level 2", "Specialist"):
        return "Level 2 - Senior Specialist"
    if cleaned in ("3", "L3", "Level 3", "Senior"):
        return "Level 3 - Lead Engineer"
    if cleaned in ("4", "L4", "Level 4", "Master"):
        return "Level 4 - Master Technical Lead"
    if cleaned in ("5", "L5", "Level 5", "Principal"):
        return "Level 5 - Principal Specialist"
    return f"Level {cleaned} Engineer" if cleaned.isdigit() else cleaned


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
            primary_color=meta.get("primary_color", "#172B4D"),
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
                years_of_history="Not available",
                earliest_deployment_year=None,
            ),
            companies=[],
            authorized_companies=[],
        )

    # 1. Fetch Companies
    companies = list(db.scalars(
        select(Company).where(Company.company_id.in_(scope_cids), Company.is_active.is_(True))
    ).all())

    # 2. Fetch Engineers
    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_id_to_comp = {e.engineer_id: e.company_id for e in engineers}
    eng_ids = list(eng_id_to_comp.keys())

    # 3. Fetch Skills to extract real tool families per company
    skills = list(db.scalars(
        select(Skill).where(Skill.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    eng_id_to_tools: Dict[UUID, Set[str]] = defaultdict(set)
    for sk in skills:
        if sk.tool_type:
            raw_t = sk.tool_type.strip()
            tax = TAXONOMY_MAP.get(raw_t.lower())
            if tax and tax.get("family"):
                eng_id_to_tools[sk.engineer_id].add(tax["family"])
            elif raw_t.lower() not in ("dep", "etch", "clean", "dry etch", "line support"):
                eng_id_to_tools[sk.engineer_id].add(raw_t.title())

    # 4. Fetch Schedules
    schedules = list(db.scalars(
        select(Schedule).where(Schedule.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    # KPI Calculation
    companies_served = len(companies)
    total_engineers = len(engineers)

    active_eng_ids: Set[UUID] = set()
    for e in engineers:
        st = (e.status or "").lower()
        if "active" in st or "deployed" in st:
            active_eng_ids.add(e.engineer_id)

    total_deployments = len(schedules)
    distinct_countries: Set[str] = set()
    total_deployment_days = 0
    earliest_start_date: Optional[date] = None

    # Per-company tracking
    comp_eng_counts: Dict[UUID, int] = defaultdict(int)
    comp_active_eng_counts: Dict[UUID, int] = defaultdict(int)
    comp_sched_counts: Dict[UUID, int] = defaultdict(int)
    comp_countries: Dict[UUID, Set[str]] = defaultdict(set)
    comp_min_start: Dict[UUID, date] = {}
    comp_tools: Dict[UUID, Set[str]] = defaultdict(set)

    for e in engineers:
        cid = e.company_id
        comp_eng_counts[cid] += 1
        if e.engineer_id in active_eng_ids:
            comp_active_eng_counts[cid] += 1

        for tool_fam in eng_id_to_tools.get(e.engineer_id, set()):
            comp_tools[cid].add(tool_fam)

        # Fallback to Ion tool if Axcelis
        if cid == ION_COMPANY_ID:
            comp_tools[cid].add("Purion Ion Implant")

    for s in schedules:
        cid = eng_id_to_comp.get(s.engineer_id)
        if cid:
            comp_sched_counts[cid] += 1

        norm_c = normalize_country(s.country)
        if norm_c:
            distinct_countries.add(norm_c)
            if cid:
                comp_countries[cid].add(norm_c)

        if s.start_date and s.start_date.year >= 2015 and s.start_date.year <= 2030:
            if earliest_start_date is None or s.start_date < earliest_start_date:
                earliest_start_date = s.start_date
            if cid:
                if cid not in comp_min_start or s.start_date < comp_min_start[cid]:
                    comp_min_start[cid] = s.start_date

        if is_valid_duration_record(s.start_date, s.end_date):
            days = (s.end_date - s.start_date).days + 1
            total_deployment_days += days

    if earliest_start_date:
        earliest_label = earliest_start_date.strftime("%b %Y")
        years_span = max(round((today - earliest_start_date).days / 365.25, 1), 0.5)
        years_of_history = f"{earliest_label} – Present ({years_span} Yrs)"
        earliest_year = earliest_start_date.year
    else:
        years_of_history = "Operational"
        earliest_year = None

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
        c_min_d = comp_min_start.get(cid)
        c_eng_cnt = comp_eng_counts.get(cid, 0)
        c_dep_cnt = comp_sched_counts.get(cid, 0)

        if c_min_d:
            op_period = f"{c_min_d.strftime('%b %Y')} – Present"
        elif c_eng_cnt > 0:
            op_period = "Active Partner Program"
        else:
            op_period = "New Partner Program"

        top_tools = sorted(list(comp_tools.get(cid, set())))[:4]

        company_cards.append(ClientCompanyShowcaseItem(
            company_id=cid,
            company_name=c.company_name,
            short_name=c.short_name,
            tagline=meta.get("tagline", f"{c.company_name} Semiconductor Operations"),
            logo=c.logo or meta.get("logo"),
            primary_color=meta.get("primary_color", "#172B4D"),
            theme_key=getattr(c, "theme_key", None) or meta.get("theme_key", "default"),
            engineer_count=c_eng_cnt,
            active_engineer_count=comp_active_eng_counts.get(cid, 0),
            deployment_count=c_dep_cnt,
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

    engineers = list(db.scalars(
        select(Engineer).where(Engineer.company_id.in_(scope_cids))
    ).all())
    eng_ids = [e.engineer_id for e in engineers]

    # Fetch skills for specific tool capability counts
    skills = list(db.scalars(
        select(Skill).where(Skill.engineer_id.in_(eng_ids))
    ).all()) if eng_ids else []

    tool_eng_map: Dict[str, Set[UUID]] = defaultdict(set)
    for sk in skills:
        if sk.tool_type:
            raw_t = sk.tool_type.strip()
            tax = TAXONOMY_MAP.get(raw_t.lower())
            if tax and tax.get("family"):
                tool_eng_map[tax["family"]].add(sk.engineer_id)
            elif raw_t.lower() not in ("dep", "etch", "clean", "dry etch", "line support"):
                tool_eng_map[raw_t.title()].add(sk.engineer_id)

    # For ION engineers, track Purion Ion Implant capability
    for eng in engineers:
        if eng.company_id == ION_COMPANY_ID:
            tool_eng_map["Purion Ion Implant"].add(eng.engineer_id)

    total = len(engineers)
    active_cnt = 0
    available_cnt = 0
    on_leave_cnt = 0

    comp_engs: Dict[UUID, int] = defaultdict(int)
    comp_actives: Dict[UUID, int] = defaultdict(int)
    levels_count: Dict[str, int] = defaultdict(int)

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

        norm_lvl = normalize_competency_tier(e.level)
        levels_count[norm_lvl] += 1

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
            primary_color=meta.get("primary_color", "#172B4D"),
        ))

    # Standard order for normalized competency tiers
    by_levels = [
        CompetencyLevelCount(level=lvl_name, count=cnt)
        for lvl_name, cnt in sorted(levels_count.items(), key=lambda x: x[0])
    ]

    top_tools = [
        TopToolCapability(tool_name=tool, engineer_count=len(e_set))
        for tool, e_set in sorted(tool_eng_map.items(), key=lambda x: len(x[1]), reverse=True)[:8]
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

    # Also process primary_tool_type from engineers if specific
    for eng in engineers:
        if eng.primary_tool_type and eng.primary_tool_type.lower() not in ("dep", "etch", "clean", "dry etch"):
            process_tool_string(eng.primary_tool_type, eng.engineer_id)

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

        ion_engineers_count = sum(1 for e in engineers if e.company_id == ION_COMPANY_ID)

        for it in ion_tools:
            e_count = len(tool_eng_set.get(it.tool_id, set()))
            if e_count == 0:
                e_count = ion_engineers_count
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
    total_valid_days = 0
    longest_valid_days = 0
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

        # Reconciled Mutually-Exclusive State Classification:
        # 1. Future: start_date in future
        # 2. Completed: status is 'Completed' or end_date in past
        # 3. Ongoing/Active: currently on fab site
        if s.start_date and s.start_date > today:
            future_cnt += 1
        elif (s.schedule_status == "Completed") or (s.end_date and s.end_date < today):
            completed_cnt += 1
        else:
            ongoing_cnt += 1

        # Annual volume tracking
        if s.start_date and 2015 <= s.start_date.year <= 2030:
            year_counts[s.start_date.year] += 1

        # Strict duration sanitization (excluding corrupted centuries/dates > 2 years)
        if is_valid_duration_record(s.start_date, s.end_date):
            duration = (s.end_date - s.start_date).days + 1
            total_valid_days += duration
            valid_durations_count += 1
            if duration > longest_valid_days:
                longest_valid_days = duration

            if s.start_date and 2015 <= s.start_date.year <= 2030:
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

    avg_duration = round(total_valid_days / valid_durations_count, 1) if valid_durations_count > 0 else 0.0
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
        total_deployment_days=total_valid_days,
        average_duration_days=avg_duration,
        longest_deployment_days=longest_valid_days,
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

    if not country_counts and engineers:
        country_counts["India"] = len(engineers)
        total_valid = len(engineers)

    country_items: List[GeographyCountryItem] = []
    for c_name, cnt in sorted(country_counts.items(), key=lambda x: x[1], reverse=True):
        code = COUNTRY_CODE_MAP.get(c_name, c_name[:2].upper())
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
