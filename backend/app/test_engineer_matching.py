"""
Unit tests for Deterministic Engineer Allocation & Matching Engine.
Tests taxonomy resolution, match level hierarchy, hard filters, visa date verification, and multi-tenant isolation.
"""
import pytest
from datetime import date
from uuid import uuid4
from unittest.mock import MagicMock

from app.models.engineer import Engineer
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.company import Company
from app.schemas.engineer_matching import EngineerMatchRequest
from app.services.engineer_matching import (
    resolve_taxonomy,
    evaluate_engineer_match,
    match_engineers,
    normalize_country
)

def test_taxonomy_resolution_safe_canonicalization():
    res1 = resolve_taxonomy("KIYO GX")
    assert res1["process"] == "Etch"
    assert res1["family"] == "Kiyo"
    assert res1["product"] == "Kiyo GX"
    assert res1["resolution_status"] == "RESOLVED"

    res2 = resolve_taxonomy("Kiyo FX")
    assert res2["product"] == "Kiyo FX"
    assert res2["resolution_status"] == "RESOLVED"

    res3 = resolve_taxonomy("VECTOR EXCEL (LAM)")
    assert res3["process"] == "Deposition"
    assert res3["family"] == "Vector"
    assert res3["product"] == "Vector Excel"
    assert res3["resolution_status"] == "RESOLVED"

def test_taxonomy_resolution_ambiguous_combo():
    res1 = resolve_taxonomy("Kiyo GX/FX")
    assert res1["resolution_status"] == "AMBIGUOUS"

    res2 = resolve_taxonomy("Flex / Kiyo")
    assert res2["resolution_status"] == "AMBIGUOUS"

def test_matching_scenarios_a_to_e():
    company_id = uuid4()
    companies_dict = {company_id: "Test Company"}
    
    # Requirement: Specific Product Kiyo GX
    req = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        process="Etch",
        product_family="Kiyo",
        specific_product="Kiyo GX"
    )

    # Scenario A: Exact Product (Kiyo GX)
    eng_a = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng A", orbit_id="ORB-A", status="Active", primary_tool_type="Kiyo GX")
    res_a = evaluate_engineer_match(eng_a, [], [], [], companies_dict, req)
    assert res_a.match_level == "EXACT_PRODUCT_MATCH"
    assert res_a.score >= 70

    # Scenario B: Same Family (Kiyo FX)
    eng_b = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng B", orbit_id="ORB-B", status="Active", primary_tool_type="Kiyo FX")
    res_b = evaluate_engineer_match(eng_b, [], [], [], companies_dict, req)
    assert res_b.match_level == "FAMILY_MATCH"
    assert any("not specifically Kiyo GX" in w for w in res_b.warnings)

    # Scenario C: Same Process (Etch)
    eng_c = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng C", orbit_id="ORB-C", status="Active", primary_tool_type="Etch")
    res_c = evaluate_engineer_match(eng_c, [], [], [], companies_dict, req)
    assert res_c.match_level == "PROCESS_MATCH"

    # Scenario D: Different Process (ALTUS / Deposition)
    eng_d = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng D", orbit_id="ORB-D", status="Active", primary_tool_type="ALTUS")
    res_d = evaluate_engineer_match(eng_d, [], [], [], companies_dict, req)
    assert res_d.match_level == "NO_MATCH"

    # Scenario E: Ambiguous Combo (Kiyo GX/FX)
    eng_e = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng E", orbit_id="ORB-E", status="Active", primary_tool_type="Kiyo GX/FX")
    res_e = evaluate_engineer_match(eng_e, [], [], [], companies_dict, req)
    assert res_e.match_level == "AMBIGUOUS_MATCH"
    assert any("combined/ambiguous record" in w for w in res_e.warnings)

def test_visa_date_scenarios_i_to_k():
    company_id = uuid4()
    companies_dict = {company_id: "Test Company"}
    
    req = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        process="Etch",
        specific_product="Kiyo GX"
    )

    # Scenario I: Visa Dates Unknown (NULL start/end)
    visa_null = Visa(visa_id=uuid4(), engineer_id=uuid4(), country="Taiwan", visa_start_date=None, visa_end_date=None)
    eng_i = Engineer(engineer_id=visa_null.engineer_id, company_id=company_id, engineer_name="Eng I", orbit_id="ORB-I", status="Active", primary_tool_type="Kiyo GX")
    res_i = evaluate_engineer_match(eng_i, [], [], [visa_null], companies_dict, req)
    assert res_i.visa_status == "DATES_UNKNOWN"
    assert any("validity dates are unavailable" in w for w in res_i.warnings)

    # Scenario J: Expired Visa
    visa_exp = Visa(visa_id=uuid4(), engineer_id=uuid4(), country="Taiwan", visa_start_date=date(2025, 1, 1), visa_end_date=date(2025, 12, 31))
    eng_j = Engineer(engineer_id=visa_exp.engineer_id, company_id=company_id, engineer_name="Eng J", orbit_id="ORB-J", status="Active", primary_tool_type="Kiyo GX")
    res_j = evaluate_engineer_match(eng_j, [], [], [visa_exp], companies_dict, req)
    assert res_j.visa_status == "EXPIRED"

    # Scenario K: Valid Visa
    visa_val = Visa(visa_id=uuid4(), engineer_id=uuid4(), country="Taiwan", visa_start_date=date(2026, 1, 1), visa_end_date=date(2027, 12, 31))
    eng_k = Engineer(engineer_id=visa_val.engineer_id, company_id=company_id, engineer_name="Eng K", orbit_id="ORB-K", status="Active", primary_tool_type="Kiyo GX")
    res_k = evaluate_engineer_match(eng_k, [], [], [visa_val], companies_dict, req)
    assert res_k.visa_status == "VALID"
    assert any("Valid visa on file" in r for r in res_k.reasons)

def test_process_and_family_level_reqs_l_m():
    company_id = uuid4()
    companies_dict = {company_id: "Test Company"}

    # Requirement L: Process Etch
    req_l = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        process="Etch"
    )
    eng_l = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng L", orbit_id="ORB-L", status="Active", primary_tool_type="Kiyo GX")
    res_l = evaluate_engineer_match(eng_l, [], [], [], companies_dict, req_l)
    assert res_l.match_level == "PROCESS_MATCH"

    # Requirement M: Family Kiyo
    req_m = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        product_family="Kiyo"
    )
    eng_m = Engineer(engineer_id=uuid4(), company_id=company_id, engineer_name="Eng M", orbit_id="ORB-M", status="Active", primary_tool_type="Kiyo GX")
    res_m = evaluate_engineer_match(eng_m, [], [], [], companies_dict, req_m)
    assert res_m.match_level == "FAMILY_MATCH"

def test_tenant_security_and_hard_filters():
    company_a = uuid4()
    company_b = uuid4()
    companies_dict = {company_a: "Company A", company_b: "Company B"}

    req = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        specific_product="Kiyo GX"
    )

    # 1. Candidate from authorized Company A
    eng_a = Engineer(engineer_id=uuid4(), company_id=company_a, engineer_name="Eng A", orbit_id="ORB-A", status="Active", primary_tool_type="Kiyo GX")
    res_a = evaluate_engineer_match(eng_a, [], [], [], companies_dict, req)
    assert res_a.company_id == company_a

    # 2. No Visa Record test
    assert res_a.visa_status == "NO_RECORD"
    assert any("No visa record found" in w for w in res_a.warnings)

    # 3. Inactive Engineer test
    eng_inactive = Engineer(engineer_id=uuid4(), company_id=company_a, engineer_name="Eng Inactive", orbit_id="ORB-IN", status="Resigned / Terminated")
    # match_engineers query filters status == 'active' or status is null

def test_match_engineers_service_tenant_isolation_and_overlap():
    db = MagicMock()
    company_a = uuid4()
    company_b = uuid4()

    # Create mock engineer objects
    eng_a = Engineer(engineer_id=uuid4(), company_id=company_a, engineer_name="Eng Company A", orbit_id="ORB-A", status="Active", primary_tool_type="Kiyo GX")
    
    # Mock db scalars query for engineers
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [eng_a]
    
    # Mock db scalars query for schedule overlap (return None -> no overlap)
    overlap_mock = MagicMock()
    overlap_mock.first.return_value = None
    
    # Company mock
    comp_a = Company(company_id=company_a, company_name="Company A")
    comp_scalars = MagicMock()
    comp_scalars.all.return_value = [comp_a]

    empty_scalars = MagicMock()
    empty_scalars.all.return_value = []

    def scalars_side_effect(stmt):
        stmt_str = str(stmt)
        if "companies" in stmt_str:
            return comp_scalars
        elif "schedules" in stmt_str:
            if "WHERE" in stmt_str and "schedules.start_date <=" in stmt_str:
                return overlap_mock
            return empty_scalars
        elif "skills" in stmt_str or "visa_details" in stmt_str:
            return empty_scalars
        elif "engineers" in stmt_str:
            return scalars_mock
        return empty_scalars

    db.scalars.side_effect = scalars_side_effect

    req = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        specific_product="Kiyo GX"
    )

    # Authorized only for Company A
    res = match_engineers(db=db, authorized_company_ids=[company_a], req=req)
    assert res.eligible_candidates_count == 1
    assert res.matches[0].company_id == company_a

    # User attempts to request Company B which is NOT authorized -> Returns 0 candidates
    req_cross_tenant = EngineerMatchRequest(
        country="Taiwan",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 12, 31),
        company_id=company_b
    )
    res_cross = match_engineers(db=db, authorized_company_ids=[company_a], req=req_cross_tenant)
    assert res_cross.eligible_candidates_count == 0
    assert len(res_cross.matches) == 0

if __name__ == "__main__":
    pytest.main(["-v", __file__])
