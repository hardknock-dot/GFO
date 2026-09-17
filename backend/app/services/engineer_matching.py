import logging
from datetime import date
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.models.engineer import Engineer
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.company import Company
from app.schemas.engineer_matching import (
    EngineerMatchRequest,
    EngineerMatchItem,
    EngineerMatchResponse
)
from app.services.auth_service import get_user_authorized_company_ids

logger = logging.getLogger(__name__)

# ============================================================================
# TAXONOMY RESOLUTION LAYER
# Hierarchy: PROCESS -> PRODUCT FAMILY -> SPECIFIC PRODUCT / MODEL -> VARIANT
# ============================================================================

TAXONOMY_MAP: Dict[str, Dict[str, Optional[str]]] = {
    # ETCH PROCESS
    # Kiyo Family
    "kiyo gx": {"process": "Etch", "family": "Kiyo", "product": "Kiyo GX", "variant": None},
    "kiyo fx": {"process": "Etch", "family": "Kiyo", "product": "Kiyo FX", "variant": None},
    "kiyo gp": {"process": "Etch", "family": "Kiyo", "product": "Kiyo GP", "variant": None},
    "kiyo fxt": {"process": "Etch", "family": "Kiyo", "product": "Kiyo FX", "variant": "Kiyo FXT"},
    "kiyo series": {"process": "Etch", "family": "Kiyo", "product": None, "variant": None},
    "kiyo": {"process": "Etch", "family": "Kiyo", "product": None, "variant": None},
    "kiyo (line support)": {"process": "Etch", "family": "Kiyo", "product": None, "variant": None},
    "2300 kio g series gx e6 conductor etch poly": {"process": "Etch", "family": "Kiyo", "product": "Kiyo GX", "variant": "2300 KIO G SERIES GX E6"},
    "2300 kio g series gp e6 conductor etch poly": {"process": "Etch", "family": "Kiyo", "product": "Kiyo GP", "variant": "2300 KIO G SERIES GP E6"},

    # Flex Family
    "flex": {"process": "Etch", "family": "Flex", "product": None, "variant": None},
    "flex hx plus": {"process": "Etch", "family": "Flex", "product": "Flex HX", "variant": "FLEX HX PLUS"},
    "flex tool - dry etch": {"process": "Etch", "family": "Flex", "product": None, "variant": None},

    # Sense.i Family
    "sense i akara": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": None},
    "sensei akara": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": None},
    "akara (sense.i)": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": None},
    "sensai - akara": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": None},
    "akara": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": None},
    "akara (tier 0)": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Akara", "variant": "Tier 0"},
    "sensei vantex cx+": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Vantex CX+", "variant": None},
    "sense i - vantex cx+": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Vantex CX+", "variant": None},
    "vantex - cx": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Vantex CX+", "variant": None},
    "vantex (sense i)": {"process": "Etch", "family": "Sense.i", "product": "Sense.i Vantex CX+", "variant": None},

    # Sabre Family
    "sabre 3d": {"process": "Deposition", "family": "Sabre", "product": "Sabre 3D", "variant": None},
    "sabre 3d scmittar": {"process": "Deposition", "family": "Sabre", "product": "Sabre 3D", "variant": "Scmittar"},

    # DEPOSITION PROCESS
    # Vector Family
    "vector excel": {"process": "Deposition", "family": "Vector", "product": "Vector Excel", "variant": None},
    "vector excel (lam)": {"process": "Deposition", "family": "Vector", "product": "Vector Excel", "variant": None},
    "vector strata gxe": {"process": "Deposition", "family": "Vector", "product": "Vector Strata GXE", "variant": None},
    "lam vector extreme": {"process": "Deposition", "family": "Vector", "product": "Vector Extreme", "variant": None},
    "vector extreme strata": {"process": "Deposition", "family": "Vector", "product": "Vector Extreme", "variant": "Strata"},
    "vector extreme i core": {"process": "Deposition", "family": "Vector", "product": "Vector Extreme", "variant": "I core"},
    "vector dt ex": {"process": "Deposition", "family": "Vector", "product": "Vector DT EX", "variant": None},
    "vector versa g, cks": {"process": "Deposition", "family": "Vector", "product": "Vector Versa G", "variant": "CKS"},

    # Altus Family
    "altus": {"process": "Deposition", "family": "Altus", "product": None, "variant": None},
    "altus lfw": {"process": "Deposition", "family": "Altus", "product": "Altus LFW", "variant": None},
    "c3 altus max": {"process": "Deposition", "family": "Altus", "product": "Altus MAX", "variant": None},
    "c3 altus halo hx": {"process": "Deposition", "family": "Altus", "product": "Altus Halo HX", "variant": None},

    # STRIP & CLEAN PROCESS
    # EOS Family
    "eos": {"process": "Strip & Clean", "family": "EOS", "product": None, "variant": None},
    "clean eos ds-l": {"process": "Strip & Clean", "family": "EOS", "product": "Clean EOS DS-L", "variant": None},
    "clean eos-gs-l": {"process": "Strip & Clean", "family": "EOS", "product": "Clean EOS-GS-L", "variant": None},
    "eos-ds": {"process": "Strip & Clean", "family": "EOS", "product": "EOS-DS", "variant": None},
    "clean tool-eos": {"process": "Strip & Clean", "family": "EOS", "product": None, "variant": None},

    # DV-Prime Family
    "dv": {"process": "Strip & Clean", "family": "DV-Prime", "product": None, "variant": None},
    "dv-38": {"process": "Strip & Clean", "family": "DV-Prime", "product": "DV-38", "variant": None},
    "dvd tool": {"process": "Strip & Clean", "family": "DV-Prime", "product": None, "variant": None},
    "clean tool dvp": {"process": "Strip & Clean", "family": "DV-Prime", "product": None, "variant": None},
    "clean dv prime": {"process": "Strip & Clean", "family": "DV-Prime", "product": None, "variant": None},

    # Generic Processes
    "etch": {"process": "Etch", "family": None, "product": None, "variant": None},
    "dry etch": {"process": "Etch", "family": None, "product": None, "variant": None},
    "dep": {"process": "Deposition", "family": None, "product": None, "variant": None},
    "deposition": {"process": "Deposition", "family": None, "product": None, "variant": None},
    "clean": {"process": "Strip & Clean", "family": None, "product": None, "variant": None},
    "strip & clean": {"process": "Strip & Clean", "family": None, "product": None, "variant": None},

    # Ion Implantation
    "ion implant - purion": {"process": "Ion Implantation", "family": "Purion", "product": None, "variant": None},
    "purion": {"process": "Ion Implantation", "family": "Purion", "product": None, "variant": None},
}

AMBIGUOUS_RAW_STRINGS = {
    "flex / kiyo",
    "kiyo gx, kiyo fx",
    "kiyo gx/fx",
    "flex hx plus & flex gb",
    "striker halo fxm, lak",
    "ahm hx, wdc",
    "vector extreme strata/ahm",
    "sense.i e10, akara / vantex conductor etch poly di electric etch oxide"
}

COUNTRY_NORMALIZATION_MAP = {
    "taiwan": "Taiwan",
    "tawan": "Taiwan",
    "tainan": "Taiwan",
    "japan": "Japan",
    "japn": "Japan",
    "japan kioxia": "Japan",
    "japan, kitakami": "Japan",
    "japan kitakami": "Japan",
    "japan, hokkaido": "Japan",
    "usa": "USA",
    "us": "USA",
    "oregon": "USA",
    "hillsboro oregon, usa": "USA",
    "usa, arizona": "USA",
    "usa, hillsboro": "USA",
    "usa - nm": "USA",
    "singapore": "Singapore",
    "sg": "Singapore",
    "india": "India",
    "ind": "India",
    "germany": "Germany",
    "italy": "Italy",
    "austria": "Austria",
    "austria(villach)": "Austria",
    "villach": "Austria",
    "ireland": "Ireland",
    "korea": "Korea",
    "south korea": "Korea",
    "china": "China",
    "chn": "China",
    "china shanghai": "China",
    "veitnam": "Vietnam",
    "vietnam": "Vietnam"
}

def normalize_country(raw_country: Optional[str]) -> Optional[str]:
    if not raw_country:
        return None
    cleaned = raw_country.strip().lower()
    return COUNTRY_NORMALIZATION_MAP.get(cleaned, raw_country.strip())

def resolve_taxonomy(raw_value: Optional[str]) -> Dict[str, Any]:
    if not raw_value or not raw_value.strip():
        return {
            "process": None,
            "family": None,
            "product": None,
            "variant": None,
            "raw_value": raw_value,
            "resolution_status": "UNRESOLVED"
        }
    
    cleaned = raw_value.strip().lower()

    if cleaned in AMBIGUOUS_RAW_STRINGS or "/" in cleaned or "&" in cleaned or ("," in cleaned and not cleaned.startswith("2300")):
        # Ambiguous multi-tool entry
        # Extract process or family if clearly mentioned
        process = "Etch" if "kiyo" in cleaned or "flex" in cleaned or "etch" in cleaned else ("Deposition" if "vector" in cleaned or "altus" in cleaned or "striker" in cleaned else None)
        family = "Kiyo" if "kiyo" in cleaned else ("Flex" if "flex" in cleaned else ("Vector" if "vector" in cleaned else None))
        return {
            "process": process,
            "family": family,
            "product": None,
            "variant": None,
            "raw_value": raw_value,
            "resolution_status": "AMBIGUOUS"
        }

    if cleaned in TAXONOMY_MAP:
        mapped = TAXONOMY_MAP[cleaned]
        return {
            "process": mapped["process"],
            "family": mapped["family"],
            "product": mapped["product"],
            "variant": mapped["variant"],
            "raw_value": raw_value,
            "resolution_status": "RESOLVED"
        }

    # Partial substring fallback for unknown variants
    if "kiyo" in cleaned:
        product = "Kiyo GX" if "gx" in cleaned else ("Kiyo FX" if "fx" in cleaned else ("Kiyo GP" if "gp" in cleaned else None))
        return {
            "process": "Etch",
            "family": "Kiyo",
            "product": product,
            "variant": raw_value,
            "raw_value": raw_value,
            "resolution_status": "PARTIAL_RESOLVED"
        }
    elif "vector" in cleaned:
        return {
            "process": "Deposition",
            "family": "Vector",
            "product": None,
            "variant": raw_value,
            "raw_value": raw_value,
            "resolution_status": "PARTIAL_RESOLVED"
        }
    elif "altus" in cleaned:
        return {
            "process": "Deposition",
            "family": "Altus",
            "product": None,
            "variant": raw_value,
            "raw_value": raw_value,
            "resolution_status": "PARTIAL_RESOLVED"
        }

    return {
        "process": None,
        "family": None,
        "product": None,
        "variant": None,
        "raw_value": raw_value,
        "resolution_status": "UNRESOLVED"
    }


# ============================================================================
# DETERMINISTIC MATCHING SERVICE ENGINE
# ============================================================================

def evaluate_engineer_match(
    engineer: Engineer,
    skills: List[Skill],
    schedules: List[Schedule],
    visas: List[Visa],
    companies_dict: Dict[UUID, str],
    req: EngineerMatchRequest
) -> EngineerMatchItem:
    
    reasons: List[str] = []
    warnings: List[str] = []
    
    # Resolve requirement taxonomy
    req_specific_product = req.specific_product.strip() if req.specific_product else None
    req_family = req.product_family.strip() if req.product_family else None
    req_process = req.process.strip() if req.process else None

    # Determine highest requirement level
    req_level = "SPECIFIC_PRODUCT" if req_specific_product else ("FAMILY" if req_family else ("PROCESS" if req_process else "NONE"))
    
    # 1. Evaluate Tool Competency across skills & primary_tool
    candidate_resolved_tools = []
    if engineer.primary_tool_type:
        candidate_resolved_tools.append(resolve_taxonomy(engineer.primary_tool_type))
    
    for sk in skills:
        if sk.tool_type:
            candidate_resolved_tools.append(resolve_taxonomy(sk.tool_type))

    best_tool_match_level = "NO_MATCH"
    best_tool_score = 0
    matched_tool_name = None

    for res in candidate_resolved_tools:
        st = res["resolution_status"]
        c_proc = res["process"]
        c_fam = res["family"]
        c_prod = res["product"]
        c_var = res["variant"]
        raw = res["raw_value"]

        if st == "AMBIGUOUS":
            # Check if ambiguous tool overlaps family or process
            is_family_overlap = req_family and c_fam and (c_fam.lower() == req_family.lower())
            is_proc_overlap = req_process and c_proc and (c_proc.lower() == req_process.lower())
            if is_family_overlap or is_proc_overlap or (req_specific_product and c_fam and c_fam.lower() in raw.lower()):
                if best_tool_score < 15:
                    best_tool_score = 15
                    best_tool_match_level = "AMBIGUOUS_MATCH"
                    matched_tool_name = raw
            continue

        if req_level == "SPECIFIC_PRODUCT":
            target_prod_lower = req_specific_product.lower()
            if c_prod and c_prod.lower() == target_prod_lower:
                if c_var:
                    best_tool_score = 40
                    best_tool_match_level = "EXACT_VARIANT_MATCH"
                    matched_tool_name = f"{c_prod} ({c_var})"
                    break
                else:
                    best_tool_score = 40
                    best_tool_match_level = "EXACT_PRODUCT_MATCH"
                    matched_tool_name = c_prod
                    break
            elif c_fam and req_family and c_fam.lower() == req_family.lower():
                if best_tool_score < 20:
                    best_tool_score = 20
                    best_tool_match_level = "FAMILY_MATCH"
                    matched_tool_name = c_prod or c_fam
            elif c_proc and req_process and c_proc.lower() == req_process.lower():
                if best_tool_score < 10:
                    best_tool_score = 10
                    best_tool_match_level = "PROCESS_MATCH"
                    matched_tool_name = c_proc

        elif req_level == "FAMILY":
            target_fam_lower = req_family.lower()
            if c_fam and c_fam.lower() == target_fam_lower:
                best_tool_score = 40
                best_tool_match_level = "FAMILY_MATCH"
                matched_tool_name = c_prod or c_fam
                break
            elif c_proc and req_process and c_proc.lower() == req_process.lower():
                if best_tool_score < 10:
                    best_tool_score = 10
                    best_tool_match_level = "PROCESS_MATCH"
                    matched_tool_name = c_proc

        elif req_level == "PROCESS":
            target_proc_lower = req_process.lower()
            if c_proc and c_proc.lower() == target_proc_lower:
                best_tool_score = 40
                best_tool_match_level = "PROCESS_MATCH"
                matched_tool_name = c_proc or c_fam or c_prod
                break
        else:
            # No tool specified in request
            best_tool_score = 40
            best_tool_match_level = "PROCESS_MATCH"
            matched_tool_name = "General Competency"
            break

    # Tool match reasons / warnings
    if best_tool_match_level in ["EXACT_PRODUCT_MATCH", "EXACT_VARIANT_MATCH"]:
        reasons.append(f"✓ Exact tool match: Experienced in {matched_tool_name or req_specific_product}")
    elif best_tool_match_level == "FAMILY_MATCH":
        if req_level == "SPECIFIC_PRODUCT":
            reasons.append(f"✓ Product Family match: Experienced in {matched_tool_name or req_family} (Same family as {req_specific_product})")
            warnings.append(f"⚠ Experience is in {matched_tool_name or 'same family'}, not specifically {req_specific_product}")
        else:
            reasons.append(f"✓ Product Family match: Experienced in {matched_tool_name or req_family}")
    elif best_tool_match_level == "PROCESS_MATCH":
        reasons.append(f"✓ Process match: Experienced in process ({matched_tool_name or req_process})")
        if req_specific_product:
            warnings.append(f"⚠ Generic process experience; no verified record for {req_specific_product}")
        elif req_family:
            warnings.append(f"⚠ Generic process experience; no verified record for {req_family} family")
    elif best_tool_match_level == "AMBIGUOUS_MATCH":
        reasons.append(f"✓ Possible matching tool entry: {matched_tool_name}")
        warnings.append(f"⚠ Candidate has a combined/ambiguous record ({matched_tool_name}); exact product experience requires validation.")
    elif req_level != "NONE":
        warnings.append(f"⚠ No record found for requested tool ({req_specific_product or req_family or req_process})")

    # 2. Availability (Hard Filter passed => 30 Points)
    availability_score = 30
    reasons.append(f"✓ Available for requested deployment dates ({req.start_date.isoformat()} to {req.end_date.isoformat()})")

    # 3. Visa Status Evaluation
    req_country_norm = normalize_country(req.country)
    matching_visas = [v for v in visas if normalize_country(v.country) == req_country_norm]
    
    visa_status = "NO_RECORD"
    visa_score = 0

    if not matching_visas:
        visa_status = "NO_RECORD"
        warnings.append(f"⚠ No visa record found for destination country ({req.country})")
    else:
        # Evaluate dates for available visa rows
        has_valid_visa = False
        has_dates_unknown = False
        has_expired_visa = False

        for v in matching_visas:
            if v.visa_start_date is None or v.visa_end_date is None:
                has_dates_unknown = True
            elif v.visa_end_date < req.start_date:
                has_expired_visa = True
            elif v.visa_start_date <= req.start_date and v.visa_end_date >= req.end_date:
                has_valid_visa = True
                break

        if has_valid_visa:
            visa_status = "VALID"
            visa_score = 15
            reasons.append(f"✓ Valid visa on file for {req.country}")
        elif has_dates_unknown:
            visa_status = "DATES_UNKNOWN"
            visa_score = 0
            warnings.append(f"⚠ Visa record exists for {req.country}, but validity dates are unavailable in database")
        elif has_expired_visa:
            visa_status = "EXPIRED"
            visa_score = 0
            warnings.append(f"⚠ Visa record for {req.country} appears expired for requested dates")
        else:
            visa_status = "DATES_UNKNOWN"
            visa_score = 0
            warnings.append(f"⚠ Visa dates do not fully cover requested deployment window")

    # 4. Location / Country Experience
    location_score = 0
    past_countries = set()
    for sch in schedules:
        if sch.country:
            past_countries.add(normalize_country(sch.country))
    for sk in skills:
        if sk.country:
            past_countries.add(normalize_country(sk.country))

    if req_country_norm and req_country_norm in past_countries:
        location_score = 10
        reasons.append(f"✓ Verified prior deployment/location experience in {req.country}")

    # 5. Customer Experience
    customer_score = 0
    if req.customer and req.customer.strip():
        req_cust_lower = req.customer.strip().lower()
        cand_cust_exp = (engineer.customer_experience or "") + " " + (engineer.lam_experience or "")
        
        has_cust_match = req_cust_lower in cand_cust_exp.lower()
        if not has_cust_match:
            for sch in schedules:
                if sch.fab_site and req_cust_lower in sch.fab_site.lower():
                    has_cust_match = True
                    break
        
        if has_cust_match:
            customer_score = 5
            reasons.append(f"✓ Verified previous customer/site experience with {req.customer}")

    # Calculate Total Score (0 - 100)
    total_score = best_tool_score + availability_score + visa_score + location_score + customer_score

    # Construct Tool Experience Summary strings for display
    tool_summaries = []
    if engineer.primary_tool_type:
        tool_summaries.append(f"Primary: {engineer.primary_tool_type}")
    for sk in skills:
        if sk.tool_type and sk.tool_type not in tool_summaries:
            tool_summaries.append(sk.tool_type)

    location_summaries = list(filter(None, past_countries))

    company_name = companies_dict.get(engineer.company_id, "Unknown Company")

    return EngineerMatchItem(
        engineer_id=engineer.engineer_id,
        engineer_name=engineer.engineer_name,
        goes_by=engineer.goes_by,
        orbit_id=engineer.orbit_id,
        company_id=engineer.company_id,
        company_name=company_name,
        level=engineer.level,
        match_level=best_tool_match_level,
        score=total_score,
        reasons=reasons,
        warnings=warnings,
        visa_status=visa_status,
        primary_tool=engineer.primary_tool_type,
        tool_experience_summary=tool_summaries,
        location_experience_summary=location_summaries
    )


def match_engineers(
    db: Session,
    authorized_company_ids: List[UUID],
    req: EngineerMatchRequest
) -> EngineerMatchResponse:
    """
    Executes multi-tenant deterministic engineer matching.
    Enforces strict company isolation, active status, schedule availability, tool hierarchy, and visa verification.
    """
    # Filter target companies authorized for current user
    if req.company_id:
        if req.company_id not in authorized_company_ids:
            # Security violation: requested company not authorized
            target_company_ids = []
        else:
            target_company_ids = [req.company_id]
    else:
        target_company_ids = authorized_company_ids

    if not target_company_ids:
        return EngineerMatchResponse(
            total_candidates_evaluated=0,
            eligible_candidates_count=0,
            matches=[],
            requirement_summary=req.model_dump()
        )

    # Pre-fetch companies dictionary for names
    comps = db.scalars(select(Company).where(Company.company_id.in_(target_company_ids))).all()
    companies_dict = {c.company_id: c.company_name for c in comps}

    # Query all candidate engineers belonging to authorized companies
    engineers_stmt = select(Engineer).where(
        and_(
            Engineer.company_id.in_(target_company_ids),
            or_(
                Engineer.status.ilike("active"),
                Engineer.status.is_(None)
            )
        )
    )
    all_engineers = list(db.scalars(engineers_stmt).all())
    total_candidates_evaluated = len(all_engineers)

    eligible_matches: List[EngineerMatchItem] = []

    for eng in all_engineers:
        # Check Hard Filter 3: Schedule Overlap
        # Query active schedules overlapping the requested start_date -> end_date window
        overlap_stmt = select(Schedule).where(
            and_(
                Schedule.engineer_id == eng.engineer_id,
                Schedule.start_date <= req.end_date,
                or_(
                    Schedule.end_date >= req.start_date,
                    Schedule.end_date.is_(None)
                )
            )
        )
        overlapping_schedule = db.scalars(overlap_stmt).first()
        if overlapping_schedule is not None:
            # Candidate unavailable due to schedule overlap -> Hard Filter Exclude
            continue

        # Candidate is eligible! Fetch skills, all schedules, visas
        eng_skills = list(db.scalars(select(Skill).where(Skill.engineer_id == eng.engineer_id)).all())
        eng_schedules = list(db.scalars(select(Schedule).where(Schedule.engineer_id == eng.engineer_id)).all())
        eng_visas = list(db.scalars(select(Visa).where(Visa.engineer_id == eng.engineer_id)).all())

        match_item = evaluate_engineer_match(
            engineer=eng,
            skills=eng_skills,
            schedules=eng_schedules,
            visas=eng_visas,
            companies_dict=companies_dict,
            req=req
        )
        eligible_matches.append(match_item)

    # Sort matches by score descending, then match level priority
    match_level_priority = {
        "EXACT_VARIANT_MATCH": 1,
        "EXACT_PRODUCT_MATCH": 2,
        "FAMILY_MATCH": 3,
        "PROCESS_MATCH": 4,
        "AMBIGUOUS_MATCH": 5,
        "NO_MATCH": 6
    }
    
    eligible_matches.sort(
        key=lambda m: (
            -m.score,
            match_level_priority.get(m.match_level, 99),
            m.engineer_name
        )
    )

    return EngineerMatchResponse(
        total_candidates_evaluated=total_candidates_evaluated,
        eligible_candidates_count=len(eligible_matches),
        matches=eligible_matches,
        requirement_summary=req.model_dump()
    )
