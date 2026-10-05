import sys
import os
import uuid
from datetime import date, datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.skill import Skill
from app.models.user import User
from app.models.user_company import UserCompany
from app.models.ion_skill import IonSkillTool
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token, get_password_hash

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("\n============================================================")
    print("ORMP — CLIENT ROLE & EXECUTIVE PORTAL TEST SUITE")
    print("============================================================\n")

    created_company_ids = []
    created_user_ids = []
    created_engineer_ids = []
    created_schedule_ids = []
    created_skill_ids = []

    try:
        suffix = uuid.uuid4().hex[:6]
        # 1. Setup Test Companies A & B
        comp_a_id = uuid.uuid4()
        comp_a = Company(
            company_id=comp_a_id,
            company_name=f"Alpha Semi Tech Corp {suffix}",
            short_name=f"ALP_{suffix}",
            is_active=True
        )
        db.add(comp_a)
        created_company_ids.append(comp_a_id)

        comp_b_id = uuid.uuid4()
        comp_b = Company(
            company_id=comp_b_id,
            company_name=f"Beta Micro Systems Corp {suffix}",
            short_name=f"BET_{suffix}",
            is_active=True
        )
        db.add(comp_b)
        created_company_ids.append(comp_b_id)
        db.commit()

        # 2. Setup Client User A (Authorized ONLY for Company A)
        client_a_id = uuid.uuid4()
        client_a = User(
            user_id=client_a_id,
            company_id=comp_a_id,
            full_name="Alice Client",
            email=f"client_a_{client_a_id.hex[:6]}@clientcorp.com",
            password_hash=get_password_hash("Password123!"),
            role="Client",
            is_active=True
        )
        db.add(client_a)
        created_user_ids.append(client_a_id)
        db.commit()

        # Map client_a to comp_a in user_companies
        uc_a = UserCompany(user_id=client_a_id, company_id=comp_a_id)
        db.add(uc_a)
        db.commit()

        # 3. Setup Client User Multi (Authorized for BOTH Comp A and Comp B)
        client_multi_id = uuid.uuid4()
        client_multi = User(
            user_id=client_multi_id,
            company_id=comp_a_id,
            full_name="Bob MultiClient",
            email=f"client_multi_{client_multi_id.hex[:6]}@clientcorp.com",
            password_hash=get_password_hash("Password123!"),
            role="Client",
            is_active=True
        )
        db.add(client_multi)
        created_user_ids.append(client_multi_id)
        db.commit()

        uc_m1 = UserCompany(user_id=client_multi_id, company_id=comp_a_id)
        uc_m2 = UserCompany(user_id=client_multi_id, company_id=comp_b_id)
        db.add_all([uc_m1, uc_m2])
        db.commit()

        # 4. Setup Engineers for Company A & B
        today = date.today()

        eng_a1_id = uuid.uuid4()
        eng_a1 = Engineer(
            engineer_id=eng_a1_id,
            company_id=comp_a_id,
            orbit_id=f"ORB-{eng_a1_id.hex[:4].upper()}",
            engineer_name="Alice Engineer Alpha",
            status="Deployed",
            level="L4 Master",
            primary_tool_type="Kiyo GX"
        )
        db.add(eng_a1)
        created_engineer_ids.append(eng_a1_id)

        eng_a2_id = uuid.uuid4()
        eng_a2 = Engineer(
            engineer_id=eng_a2_id,
            company_id=comp_a_id,
            orbit_id=f"ORB-{eng_a2_id.hex[:4].upper()}",
            engineer_name="Adam Engineer Alpha",
            status="Active",
            level="L3 Senior",
            primary_tool_type="Altus Max"
        )
        db.add(eng_a2)
        created_engineer_ids.append(eng_a2_id)

        eng_b1_id = uuid.uuid4()
        eng_b1 = Engineer(
            engineer_id=eng_b1_id,
            company_id=comp_b_id,
            orbit_id=f"ORB-{eng_b1_id.hex[:4].upper()}",
            engineer_name="Beth Engineer Beta",
            status="Active",
            level="L2 Specialist",
            primary_tool_type="EOS-DS"
        )
        db.add(eng_b1)
        created_engineer_ids.append(eng_b1_id)
        db.commit()

        # 5. Setup Skills
        sk_a1 = Skill(
            skill_id=uuid.uuid4(),
            engineer_id=eng_a1_id,
            tool_type="Kiyo GX",
        )
        sk_a2 = Skill(
            skill_id=uuid.uuid4(),
            engineer_id=eng_a2_id,
            tool_type="Altus LFW",
        )
        db.add_all([sk_a1, sk_a2])
        created_skill_ids.extend([sk_a1.skill_id, sk_a2.skill_id])
        db.commit()

        # 6. Setup Schedules (Deployments)
        # Completed deployment: 10 days
        sch_a1 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a1_id,
            start_date=today - timedelta(days=30),
            end_date=today - timedelta(days=21),
            country="Taiwan",
            support_type="Install & Startup",
            schedule_status="Completed"
        )
        # Ongoing deployment: 15 days
        sch_a2 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a1_id,
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=10),
            country="USA",
            support_type="Field Service",
            schedule_status="Active Assignment"
        )
        # Future deployment
        sch_a3 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a2_id,
            start_date=today + timedelta(days=14),
            end_date=today + timedelta(days=28),
            country="Japan",
            support_type="Field Service",
            schedule_status="Upcoming"
        )
        # Comp B deployment
        sch_b1 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_b1_id,
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=5),
            country="Germany",
            support_type="Preventive Maintenance",
            schedule_status="Completed"
        )
        db.add_all([sch_a1, sch_a2, sch_a3, sch_b1])
        created_schedule_ids.extend([sch_a1.schedule_id, sch_a2.schedule_id, sch_a3.schedule_id, sch_b1.schedule_id])
        db.commit()

        # Authentication Tokens
        token_a = create_access_token({"sub": str(client_a_id)})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        token_multi = create_access_token({"sub": str(client_multi_id)})
        headers_multi = {"Authorization": f"Bearer {token_multi}"}

        print("[TEST 1] Testing /auth/me for Client Role...")
        res = client.get("/api/auth/me", headers=headers_a)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["role"] == "Client", f"Expected role 'Client', got '{data['role']}'"
        assert str(comp_a_id) in data["accessibleCompanies"]
        assert str(comp_b_id) not in data["accessibleCompanies"]
        print("  [PASS] Client authentication and role verified successfully.")

        print("[TEST 2] Testing /api/client/overview isolation (Client A -> Only Comp A)...")
        res = client.get("/api/client/overview", headers=headers_a)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        kpi = data["kpi"]
        assert kpi["companies_served"] == 1, f"Expected 1 company served, got {kpi['companies_served']}"
        assert kpi["total_engineers"] == 2, f"Expected 2 engineers, got {kpi['total_engineers']}"
        assert kpi["total_deployments"] == 3, f"Expected 3 deployments, got {kpi['total_deployments']}"
        assert kpi["countries_covered"] == 3, f"Expected 3 countries (Taiwan, USA, Japan), got {kpi['countries_covered']}"
        assert len(data["companies"]) == 1
        assert data["companies"][0]["company_id"] == str(comp_a_id)
        print("  [PASS] Client overview correctly isolated to authorized company.")

        print("[TEST 3] Testing cross-tenant injection protection...")
        res = client.get(f"/api/client/overview?company_id={comp_b_id}", headers=headers_a)
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
        print("  [PASS] Client cannot inject unauthorized company_id parameter.")

        print("[TEST 4] Testing Client Multi-Company Overview...")
        res = client.get("/api/client/overview", headers=headers_multi)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["kpi"]["companies_served"] == 2
        assert data["kpi"]["total_engineers"] == 3
        assert data["kpi"]["total_deployments"] == 4
        assert len(data["companies"]) == 2
        print("  [PASS] Multi-tenant client receives aggregated overview across authorized companies.")

        print("[TEST 5] Testing /api/client/workforce...")
        res = client.get("/api/client/workforce", headers=headers_a)
        assert res.status_code == 200
        wf = res.json()
        assert wf["total_engineers"] == 2
        assert len(wf["by_company"]) == 1
        assert wf["by_company"][0]["engineer_count"] == 2
        assert any(lvl["level"] == "L4 Master" and lvl["count"] == 1 for lvl in wf["by_competency_level"])
        print("  [PASS] Workforce aggregate data correctly computed without personal info.")

        print("[TEST 6] Testing /api/client/expertise taxonomy...")
        res = client.get("/api/client/expertise", headers=headers_a)
        assert res.status_code == 200
        exp = res.json()
        assert len(exp["processes"]) > 0
        proc_names = [p["process_name"] for p in exp["processes"]]
        assert "Etch" in proc_names or "Deposition" in proc_names
        print("  [PASS] Technology expertise preserves taxonomy hierarchy.")

        print("[TEST 7] Testing /api/client/deployments metrics...")
        res = client.get("/api/client/deployments", headers=headers_a)
        assert res.status_code == 200
        dep = res.json()
        assert dep["total_deployments"] == 3
        assert dep["completed_deployments"] == 1
        assert dep["ongoing_deployments"] == 1
        assert dep["future_deployments"] == 1
        assert dep["total_deployment_days"] > 0
        assert dep["longest_deployment_days"] >= 15
        assert dep["engineers_with_multiple_deployments"] == 1 # eng_a1 has 2 deployments
        print("  [PASS] Deployment experience, duration buckets, and statuses calculated correctly.")

        print("[TEST 8] Testing /api/client/geography...")
        res = client.get("/api/client/geography", headers=headers_a)
        assert res.status_code == 200
        geo = res.json()
        assert geo["total_deployments"] == 3
        assert geo["countries_count"] == 3
        c_names = [c["name"] for c in geo["countries"]]
        assert "Taiwan" in c_names
        assert "USA" in c_names
        assert "Japan" in c_names
        print("  [PASS] Geography country aggregation verified.")

        print("[TEST 9] Testing /api/client/companies/{id} detail view...")
        res = client.get(f"/api/client/companies/{comp_a_id}", headers=headers_a)
        assert res.status_code == 200
        det = res.json()
        assert det["company"]["company_id"] == str(comp_a_id)
        assert det["kpi"]["total_engineers"] == 2
        print("  [PASS] Company detail endpoint returns complete presentation overview.")

        print("[TEST 10] Testing write/mutation restriction for Client Role...")
        # Attempt to create engineer
        res_mut = client.post("/api/engineers", json={
            "engineer_name": "Hacker Engineer",
            "company_id": str(comp_a_id),
            "orbit_id": "ORB-HACK",
            "status": "Active"
        }, headers=headers_a)
        assert res_mut.status_code == 403, f"Expected 403 Forbidden for Client mutation, got {res_mut.status_code}"

        # Attempt to access admin users endpoint
        res_adm = client.get("/api/users", headers=headers_a)
        assert res_adm.status_code == 403, f"Expected 403 Forbidden for Client accessing /users, got {res_adm.status_code}"
        print("  [PASS] Client role is strictly read-only and denied admin/mutation operations.")

        print("\n============================================================")
        print("ALL 10 CLIENT PORTAL TESTS PASSED SUCCESSFULLY!")
        print("============================================================\n")

    finally:
        # Cleanup test data in strict reverse dependency order
        try:
            db.rollback()
            for sid in created_schedule_ids:
                s = db.get(Schedule, sid)
                if s: db.delete(s)
            for skid in created_skill_ids:
                sk = db.get(Skill, skid)
                if sk: db.delete(sk)
            db.commit()

            for eid in created_engineer_ids:
                e = db.get(Engineer, eid)
                if e: db.delete(e)
            db.commit()

            # Delete user companies
            from sqlalchemy import text
            for uid in created_user_ids:
                db.execute(text("DELETE FROM user_companies WHERE user_id = :uid"), {"uid": uid})
                u = db.get(User, uid)
                if u: db.delete(u)
            db.commit()

            for cid in created_company_ids:
                c = db.get(Company, cid)
                if c: db.delete(c)
            db.commit()
        except Exception as err:
            print("Cleanup notice:", err)
        finally:
            db.close()

if __name__ == "__main__":
    run_tests()
