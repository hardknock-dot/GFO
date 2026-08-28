import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db, SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.engineer import Engineer
from app.models.skill import Skill
from app.services.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_search_data():
    db_session = SessionLocal()
    # Setup test company
    comp_id = uuid.uuid4()
    company = Company(
        company_id=comp_id,
        company_name="Search Testing Corp",
        short_name=f"STC_{uuid.uuid4().hex[:6]}"
    )
    db_session.add(company)

    # Setup test admin user
    user_id = uuid.uuid4()
    user = User(
        user_id=user_id,
        company_id=comp_id,
        email=f"admin-{uuid.uuid4().hex[:6]}@stc.com",
        full_name="Search Admin",
        password_hash="hashed_pw",
        role="Main Admin",
        is_active=True
    )
    db_session.add(user)

    # Generate unique suffix for test isolation
    uid = uuid.uuid4().hex[:6]
    orb1 = f"ORB101-{uid}"
    orb2 = f"ORB102-{uid}"
    orb3 = f"ORB103-{uid}"

    # Engineer 1: John Doe (ConsumerExp: 6, IndustryExp: 4, PrimaryTool: Kiyo)
    eng1_id = uuid.uuid4()
    eng1 = Engineer(
        engineer_id=eng1_id,
        company_id=comp_id,
        engineer_name="John Doe",
        orbit_id=orb1,
        goes_by="Johnny",
        primary_tool_type="Kiyo",
        lam_experience=6.0,
        industry_experience=4.0,
        status="Active"
    )
    db_session.add(eng1)
    db_session.add(Skill(
        skill_id=uuid.uuid4(),
        engineer_id=eng1_id,
        tool_type="Etch"
    ))
    db_session.add(Skill(
        skill_id=uuid.uuid4(),
        engineer_id=eng1_id,
        tool_type="Inspection"
    ))

    # Engineer 2: Jane Smith (ConsumerExp: 12, IndustryExp: 10, PrimaryTool: SENSAI - Akara)
    eng2_id = uuid.uuid4()
    eng2 = Engineer(
        engineer_id=eng2_id,
        company_id=comp_id,
        engineer_name="Jane Smith",
        orbit_id=orb2,
        goes_by="Janey",
        primary_tool_type="SENSAI - Akara",
        lam_experience=12.0,
        industry_experience=10.0,
        status="Active"
    )
    db_session.add(eng2)
    db_session.add(Skill(
        skill_id=uuid.uuid4(),
        engineer_id=eng2_id,
        tool_type="Lithography"
    ))

    # Engineer 3: Robert Johnson (ConsumerExp: 2, IndustryExp: 15, PrimaryTool: Vector)
    eng3_id = uuid.uuid4()
    eng3 = Engineer(
        engineer_id=eng3_id,
        company_id=comp_id,
        engineer_name="Robert Johnson",
        orbit_id=orb3,
        goes_by="Bob",
        primary_tool_type="Vector",
        lam_experience=2.0,
        industry_experience=15.0,
        status="Active"
    )
    db_session.add(eng3)
    db_session.add(Skill(
        skill_id=uuid.uuid4(),
        engineer_id=eng3_id,
        tool_type="Etch"
    ))

    db_session.commit()

    token = create_access_token({"sub": str(user_id), "email": user.email, "role": user.role, "company_id": str(comp_id)})
    headers = {"Authorization": f"Bearer {token}"}

    yield {
        "company_id": comp_id,
        "user": user,
        "headers": headers,
        "eng1": eng1,
        "eng2": eng2,
        "eng3": eng3,
        "orb1": orb1,
        "orb2": orb2,
        "orb3": orb3
    }

    db_session.close()

def test_search_options_endpoint(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    response = client.get(f"/api/engineers/options?company_id={comp_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "countries" in data
    assert "fabs" in data
    assert "tool_modules" in data
    assert "tool_names" in data
    assert "consumer_experience" in data
    assert "industry_experience" in data
    assert "Kiyo" in data["tool_modules"]
    assert "Etch" in data["tool_names"]

def test_search_by_name(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&q=Jane", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["engineer_name"] == "Jane Smith"

def test_search_by_orbit_id(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    orb1 = setup_search_data["orb1"]
    res = client.get(f"/api/engineers?company_id={comp_id}&q={orb1}", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["orbit_id"] == orb1

def test_search_by_company_id(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    comp_str = str(comp_id)
    res = client.get(f"/api/engineers?company_id={comp_id}&q={comp_str[:8]}", headers=headers).json()
    assert res["total"] >= 3

def test_search_by_goes_by(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&q=Johnny", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["goes_by"] == "Johnny"

def test_consumer_experience_filter(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&consumer_min=5&consumer_max=10", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["engineer_name"] == "John Doe"

def test_industry_experience_filter(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&industry_min=10&industry_max=20", headers=headers).json()
    assert res["total"] == 2  # Jane Smith (10) and Robert Johnson (15)

def test_tool_module_multi_select(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&tool_modules=Kiyo&tool_modules=Vector", headers=headers).json()
    assert res["total"] == 2  # John Doe and Robert Johnson (OR within tool_modules)

def test_tool_name_multi_select(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&tool_names=Lithography", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["engineer_name"] == "Jane Smith"

def test_search_and_experience_combination(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    # Search 'John' AND industry_exp 10..20 -> Robert Johnson (goes by Bob, name Johnson)
    res = client.get(f"/api/engineers?company_id={comp_id}&q=John&industry_min=10&industry_max=20", headers=headers).json()
    assert res["total"] == 1
    assert res["items"][0]["engineer_name"] == "Robert Johnson"

def test_all_filters_together_use_and(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(
        f"/api/engineers?company_id={comp_id}&q=John&consumer_min=5&consumer_max=10&industry_min=2&industry_max=8&tool_modules=Kiyo&tool_names=Etch",
        headers=headers
    ).json()
    assert res["total"] == 1
    assert res["items"][0]["engineer_name"] == "John Doe"

def test_no_duplicate_engineers_for_multiple_skills(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    # John Doe has both Etch and Inspection skills
    res = client.get(f"/api/engineers?company_id={comp_id}&tool_names=Etch&tool_names=Inspection", headers=headers).json()
    eng_names = [e["engineer_name"] for e in res["items"]]
    assert eng_names.count("John Doe") == 1

def test_pagination_page_size(setup_search_data):
    headers = setup_search_data["headers"]
    comp_id = setup_search_data["company_id"]
    res = client.get(f"/api/engineers?company_id={comp_id}&page=1&page_size=2", headers=headers).json()
    assert len(res["items"]) == 2
    assert res["page"] == 1
    assert res["page_size"] == 2
    assert res["total"] == 3
    assert res["total_pages"] == 2
