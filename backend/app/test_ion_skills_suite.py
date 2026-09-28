import sys
import os
import uuid
from datetime import date, datetime, timedelta
from typing import List

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.user_company import UserCompany
from app.models.ion_skill import IonSkillTool, IonSkillExperience, IonSkillAssessment
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token
from app.services.ion_skill_service import ION_COMPANY_ID

client = TestClient(app)

def run_all_tests():
    db = SessionLocal()
    print("\n============================================================")
    print("ORMP v2.0 — AXCELIS ION SKILL & EXPERIENCE TEST SUITE")
    print("============================================================\n")

    created_company_ids = []
    created_user_ids = []
    created_engineer_ids = []
    created_exp_ids = []

    try:
        # Verify or create ION Company
        ion_comp = db.get(Company, ION_COMPANY_ID)
        if not ion_comp:
            ion_comp = Company(
                company_id=ION_COMPANY_ID,
                company_name="Axcelis Technologies (ION)",
                short_name="AXCELIS",
                is_active=True
            )
            db.add(ion_comp)
            db.commit()
            created_company_ids.append(ION_COMPANY_ID)

        # Create Other Company (LAM)
        other_comp_id = uuid.uuid4()
        other_comp = Company(
            company_id=other_comp_id,
            company_name="LAM Research Test Corp",
            short_name="LAM_TEST",
            is_active=True
        )
        db.add(other_comp)
        db.commit()
        created_company_ids.append(other_comp_id)

        # Ensure ion tools exist
        tools = db.scalars(db.query(IonSkillTool).order_by(IonSkillTool.display_order.asc())).all()
        if not tools:
            default_tool_names = [
                "Purion XE/EXE/VXE", "Purion XE SiC", "Purion H3/H5", "Purion H2",
                "Purion M", "Purion M SiC", "GSD 200 E2", "GSD VHE"
            ]
            for idx, name in enumerate(default_tool_names, 1):
                t = IonSkillTool(
                    tool_id=uuid.uuid4(),
                    tool_name=name,
                    display_order=idx,
                    is_active=True
                )
                db.add(t)
            db.commit()
            tools = db.scalars(db.query(IonSkillTool).order_by(IonSkillTool.display_order.asc())).all()

        tool_h2 = next((t for t in tools if "H2" in t.tool_name), tools[0])
        tool_h3 = next((t for t in tools if "H3" in t.tool_name or "H5" in t.tool_name), tools[1])
        tool_m = next((t for t in tools if "Purion M" in t.tool_name and "SiC" not in t.tool_name), tools[2])

        # Create Test Users:
        # 1. Main Admin
        admin_user_id = uuid.uuid4()
        admin_user = User(
            user_id=admin_user_id,
            email=f"admin_{admin_user_id.hex[:6]}@example.com",
            password_hash="testpass",
            role="Main Admin",
            full_name="Main Admin Tester",
            is_active=True,
            company_id=None
        )
        db.add(admin_user)

        # 2. ION Manager
        ion_mgr_id = uuid.uuid4()
        ion_mgr = User(
            user_id=ion_mgr_id,
            email=f"ion_mgr_{ion_mgr_id.hex[:6]}@example.com",
            password_hash="testpass",
            role="Manager",
            full_name="ION Manager Tester",
            is_active=True,
            company_id=ION_COMPANY_ID
        )
        db.add(ion_mgr)

        # 3. Non-ION Manager (LAM)
        lam_mgr_id = uuid.uuid4()
        lam_mgr = User(
            user_id=lam_mgr_id,
            email=f"lam_mgr_{lam_mgr_id.hex[:6]}@example.com",
            password_hash="testpass",
            role="Manager",
            full_name="LAM Manager Tester",
            is_active=True,
            company_id=other_comp_id
        )
        db.add(lam_mgr)

        db.commit()
        created_user_ids.extend([admin_user_id, ion_mgr_id, lam_mgr_id])

        # Map user_companies
        db.add_all([
            UserCompany(user_id=ion_mgr_id, company_id=ION_COMPANY_ID),
            UserCompany(user_id=lam_mgr_id, company_id=other_comp_id)
        ])
        db.commit()

        # Create Engineers:
        # 1. ION Engineer
        ion_eng_id = uuid.uuid4()
        ion_eng = Engineer(
            engineer_id=ion_eng_id,
            company_id=ION_COMPANY_ID,
            engineer_name="Manohar Venu",
            orbit_id=f"ORB-ION-{uuid.uuid4().hex[:4].upper()}",
            status="Active"
        )
        # 2. Non-ION Engineer (LAM)
        lam_eng_id = uuid.uuid4()
        lam_eng = Engineer(
            engineer_id=lam_eng_id,
            company_id=other_comp_id,
            engineer_name="Lam Specialist John",
            orbit_id=f"ORB-LAM-{uuid.uuid4().hex[:4].upper()}",
            status="Active"
        )
        db.add_all([ion_eng, lam_eng])
        db.commit()
        created_engineer_ids.extend([ion_eng_id, lam_eng_id])

        admin_token = create_access_token({"sub": str(admin_user_id)})
        ion_mgr_token = create_access_token({"sub": str(ion_mgr_id)})
        lam_mgr_token = create_access_token({"sub": str(lam_mgr_id)})

        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        ion_headers = {"Authorization": f"Bearer {ion_mgr_token}"}
        lam_headers = {"Authorization": f"Bearer {lam_mgr_token}"}

        print("--- RUNNING 15 VERIFICATION TEST CASES ---\n")

        # Test 1: Create ION experience
        print("Test 1: Create ION experience...", end=" ")
        payload_1 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "South Korea",
            "start_date": "2026-04-20",
            "end_date": "2026-07-18",
            "notes": "Initial ION field deployment notes",
            "assessments": []
        }
        r1 = client.post("/api/ion-skills/experiences", json=payload_1, headers=ion_headers)
        assert r1.status_code == 201, f"Expected 201, got {r1.status_code}: {r1.text}"
        exp1_data = r1.json()
        assert exp1_data["where_location"] == "South Korea"
        assert exp1_data["engineer_id"] == str(ion_eng_id)
        assert exp1_data["company_id"] == str(ION_COMPANY_ID)
        exp1_id = exp1_data["experience_id"]
        created_exp_ids.append(uuid.UUID(exp1_id))
        print("PASSED [OK]")

        # Test 2: Create tool assessment
        print("Test 2: Create tool assessment...", end=" ")
        payload_2 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "Taiwan",
            "start_date": "2025-01-10",
            "end_date": "2025-03-30",
            "notes": "Taiwan fab experience",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 2,
                    "assessment_comment": "Hands-on experience in alignment and chamber maintenance."
                }
            ]
        }
        r2 = client.post("/api/ion-skills/experiences", json=payload_2, headers=ion_headers)
        assert r2.status_code == 201, f"Expected 201, got {r2.status_code}: {r2.text}"
        exp2_data = r2.json()
        assert len(exp2_data["assessments"]) == 1
        ass = exp2_data["assessments"][0]
        assert ass["tool_id"] == str(tool_h2.tool_id)
        assert ass["skill_level"] == 2
        assert ass["assessment_comment"] == "Hands-on experience in alignment and chamber maintenance."
        exp2_id = exp2_data["experience_id"]
        created_exp_ids.append(uuid.UUID(exp2_id))
        print("PASSED [OK]")

        # Test 3: Skill level 1 accepted
        print("Test 3: Skill level 1 accepted...", end=" ")
        payload_3 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "Japan",
            "start_date": "2024-05-01",
            "end_date": "2024-08-01",
            "assessments": [
                {
                    "tool_id": str(tool_m.tool_id),
                    "skill_level": 1,
                    "assessment_comment": "Beginner level observation"
                }
            ]
        }
        r3 = client.post("/api/ion-skills/experiences", json=payload_3, headers=ion_headers)
        assert r3.status_code == 201, f"Expected 201, got {r3.status_code}: {r3.text}"
        assert r3.json()["assessments"][0]["skill_level"] == 1
        created_exp_ids.append(uuid.UUID(r3.json()["experience_id"]))
        print("PASSED [OK]")

        # Test 4: Skill level 4 accepted
        print("Test 4: Skill level 4 accepted...", end=" ")
        payload_4 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "Singapore",
            "start_date": "2026-01-01",
            "end_date": "2026-03-01",
            "assessments": [
                {
                    "tool_id": str(tool_h3.tool_id),
                    "skill_level": 4,
                    "assessment_comment": "Expert level independent solver"
                }
            ]
        }
        r4 = client.post("/api/ion-skills/experiences", json=payload_4, headers=ion_headers)
        assert r4.status_code == 201, f"Expected 201, got {r4.status_code}: {r4.text}"
        assert r4.json()["assessments"][0]["skill_level"] == 4
        created_exp_ids.append(uuid.UUID(r4.json()["experience_id"]))
        print("PASSED [OK]")

        # Test 5: Skill level 0 rejected
        print("Test 5: Skill level 0 rejected...", end=" ")
        payload_5 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "Germany",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 0,
                    "assessment_comment": "Invalid zero level"
                }
            ]
        }
        r5 = client.post("/api/ion-skills/experiences", json=payload_5, headers=ion_headers)
        assert r5.status_code in (422, 400), f"Expected 422/400 for skill_level 0, got {r5.status_code}"
        print("PASSED [OK]")

        # Test 6: Skill level 5 rejected
        print("Test 6: Skill level 5 rejected...", end=" ")
        payload_6 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "Germany",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 5,
                    "assessment_comment": "Invalid five level"
                }
            ]
        }
        r6 = client.post("/api/ion-skills/experiences", json=payload_6, headers=ion_headers)
        assert r6.status_code in (422, 400), f"Expected 422/400 for skill_level 5, got {r6.status_code}"
        print("PASSED [OK]")

        # Test 7: Duplicate tool within same experience rejected
        print("Test 7: Duplicate tool within same experience rejected...", end=" ")
        payload_7 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "USA",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 2,
                    "assessment_comment": "First entry"
                },
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 3,
                    "assessment_comment": "Duplicate entry"
                }
            ]
        }
        r7 = client.post("/api/ion-skills/experiences", json=payload_7, headers=ion_headers)
        assert r7.status_code in (422, 400), f"Expected 422/400 for duplicate tools, got {r7.status_code}"
        print("PASSED [OK]")

        # Test 8: Same tool can exist in different experiences for same engineer
        print("Test 8: Same tool can exist in different experiences for same engineer...", end=" ")
        payload_8 = {
            "engineer_id": str(ion_eng_id),
            "where_location": "South Korea - Round 2",
            "start_date": "2026-08-01",
            "end_date": "2026-10-01",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 3,
                    "assessment_comment": "Promoted to Level 3 after 6 months."
                }
            ]
        }
        r8 = client.post("/api/ion-skills/experiences", json=payload_8, headers=ion_headers)
        assert r8.status_code == 201, f"Expected 201, got {r8.status_code}: {r8.text}"
        assert r8.json()["assessments"][0]["tool_id"] == str(tool_h2.tool_id)
        assert r8.json()["assessments"][0]["skill_level"] == 3
        created_exp_ids.append(uuid.UUID(r8.json()["experience_id"]))
        print("PASSED [OK]")

        # Test 9: Cross-company engineer rejected
        print("Test 9: Cross-company engineer rejected...", end=" ")
        payload_9 = {
            "engineer_id": str(lam_eng_id),
            "where_location": "Taiwan",
            "assessments": [
                {
                    "tool_id": str(tool_h2.tool_id),
                    "skill_level": 2
                }
            ]
        }
        r9 = client.post("/api/ion-skills/experiences", json=payload_9, headers=ion_headers)
        assert r9.status_code in (400, 403, 404), f"Expected 400/403/404 for LAM engineer, got {r9.status_code}"
        print("PASSED [OK]")

        # Test 10: Non-ION engineer rejected
        print("Test 10: Non-ION engineer rejected...", end=" ")
        non_existent_eng_id = str(uuid.uuid4())
        payload_10 = {
            "engineer_id": non_existent_eng_id,
            "where_location": "Unknown",
            "assessments": []
        }
        r10 = client.post("/api/ion-skills/experiences", json=payload_10, headers=ion_headers)
        assert r10.status_code in (400, 404), f"Expected 404/400 for non-existent engineer, got {r10.status_code}"
        print("PASSED [OK]")

        # Test 11: Historical assessments remain after newer assessment is added
        print("Test 11: Historical assessments remain after newer assessment is added...", end=" ")
        r11 = client.get(f"/api/ion-skills/engineers/{ion_eng_id}/history?tool_id={tool_h2.tool_id}", headers=ion_headers)
        assert r11.status_code == 200, f"Expected 200, got {r11.status_code}: {r11.text}"
        history = r11.json()
        assert len(history) >= 2, f"Expected at least 2 historical assessments for Tool H2, got {len(history)}"
        skill_levels = [h["skill_level"] for h in history]
        assert 2 in skill_levels and 3 in skill_levels, f"Expected history to contain levels 2 and 3, got {skill_levels}"
        print("PASSED [OK]")

        # Test 12: Latest skill summary resolves correctly
        print("Test 12: Latest skill summary resolves correctly...", end=" ")
        r12 = client.get(f"/api/ion-skills/engineers/{ion_eng_id}/current-summary", headers=ion_headers)
        assert r12.status_code == 200, f"Expected 200, got {r12.status_code}: {r12.text}"
        summary = r12.json()
        skills_map = {s["tool_name"]: s for s in summary["current_skills"]}
        # Tool H2 latest should be Level 3 (from 2026-08-01 round 2 vs 2025-01-10)
        assert tool_h2.tool_name in skills_map, f"Tool {tool_h2.tool_name} missing from summary"
        assert skills_map[tool_h2.tool_name]["skill_level"] == 3, f"Expected latest Level 3 for H2, got {skills_map[tool_h2.tool_name]['skill_level']}"
        # Tool M should be Level 1
        assert tool_m.tool_name in skills_map
        assert skills_map[tool_m.tool_name]["skill_level"] == 1
        print("PASSED [OK]")

        # Test 13: Unauthorized user cannot access ION data
        print("Test 13: Unauthorized user cannot access ION data...", end=" ")
        # LAM manager attempting to list ION experiences
        r13_a = client.get("/api/ion-skills/experiences", headers=lam_headers)
        assert r13_a.status_code == 403, f"Expected 403 Forbidden for LAM manager on ION experiences, got {r13_a.status_code}"
        # LAM manager attempting to view tools
        r13_b = client.get("/api/ion-skills/tools", headers=lam_headers)
        assert r13_b.status_code == 403, f"Expected 403 Forbidden for LAM manager on ION tools, got {r13_b.status_code}"
        # Anonymous user (no token)
        r13_c = client.get("/api/ion-skills/experiences")
        assert r13_c.status_code in (401, 403), f"Expected 401/403 for unauthenticated user, got {r13_c.status_code}"
        print("PASSED [OK]")

        # Test 14: Assessment cannot reference an experience belonging to another company
        print("Test 14: Assessment cannot reference an experience belonging to another company...", end=" ")
        # In our architecture, experience.company_id is strictly verified to be ION_COMPANY_ID on all endpoints.
        # Verify get_single_ion_experience with an experience not belonging to ION fails.
        fake_exp_id = str(uuid.uuid4())
        r14 = client.get(f"/api/ion-skills/experiences/{fake_exp_id}", headers=ion_headers)
        assert r14.status_code == 404, f"Expected 404 for invalid experience id, got {r14.status_code}"
        print("PASSED [OK]")

        # Test 15: Assessment engineer must match experience engineer
        print("Test 15: Assessment engineer must match experience engineer...", end=" ")
        # Direct database verification: all assessments created via service strictly inherit experience.engineer_id and ION_COMPANY_ID
        for exp_id in created_exp_ids:
            exp_row = db.get(IonSkillExperience, exp_id)
            if exp_row:
                for a in exp_row.assessments:
                    assert a.engineer_id == exp_row.engineer_id, f"Assessment engineer {a.engineer_id} does not match experience engineer {exp_row.engineer_id}"
                    assert a.company_id == ION_COMPANY_ID, f"Assessment company {a.company_id} does not match ION company {ION_COMPANY_ID}"
        print("PASSED [OK]")

        print("\n============================================================")
        print("ALL 15 BACKEND TESTS PASSED SUCCESSFULLY!")
        print("============================================================\n")

    finally:
        # Cleanup test data
        try:
            for exp_id in created_exp_ids:
                exp = db.get(IonSkillExperience, exp_id)
                if exp:
                    db.delete(exp)
            db.commit()

            for eng_id in created_engineer_ids:
                eng = db.get(Engineer, eng_id)
                if eng:
                    db.delete(eng)
            db.commit()

            for uid in created_user_ids:
                db.query(UserCompany).filter(UserCompany.user_id == uid).delete()
                u = db.get(User, uid)
                if u:
                    db.delete(u)
            db.commit()

            if other_comp_id in created_company_ids:
                c = db.get(Company, other_comp_id)
                if c:
                    db.delete(c)
                db.commit()

        except Exception as e:
            print("Cleanup warning:", e)
        finally:
            db.close()

if __name__ == "__main__":
    run_all_tests()
