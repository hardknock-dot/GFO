import os
import sys
import unittest
from fastapi.testclient import TestClient
from uuid import UUID

# Ensure backend root is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.services.security import create_access_token

class TestPaginationAndPerformance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        with next(get_db()) as db:
            cls.comp = db.query(Company).first()
            if not cls.comp:
                cls.skipTest(cls, "No company found in database")
            cls.user = db.query(User).filter(User.company_id == cls.comp.company_id).first()
            if not cls.user:
                cls.user = db.query(User).first()
            token = create_access_token(data={"sub": str(cls.user.user_id)})
            cls.headers = {"Authorization": f"Bearer {token}"}

    def test_01_engineers_pagination_schema(self):
        res = self.client.get(
            f"/api/engineers?company_id={self.comp.company_id}&page=1&page_size=5",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200, f"Expected 200 OK, got {res.status_code}: {res.text}")
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("page", data)
        self.assertIn("page_size", data)
        self.assertIn("total", data)
        self.assertIn("total_pages", data)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 5)
        self.assertIsInstance(data["items"], list)

    def test_02_engineers_server_side_search(self):
        res = self.client.get(
            f"/api/engineers?company_id={self.comp.company_id}&search=test&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_03_schedules_pagination_schema(self):
        res = self.client.get(
            f"/api/schedules?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)

    def test_04_skills_pagination_schema(self):
        res = self.client.get(
            f"/api/skills?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_05_visa_pagination_schema(self):
        res = self.client.get(
            f"/api/visa?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_06_leaves_pagination_schema(self):
        res = self.client.get(
            f"/api/leaves?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_07_travel_pagination_schema(self):
        res = self.client.get(
            f"/api/travel?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_08_performance_pagination_schema(self):
        res = self.client.get(
            f"/api/performance?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_09_missed_schedules_pagination_schema(self):
        res = self.client.get(
            f"/api/missed-schedules?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_10_engineer_deletion_requests_pagination_schema(self):
        res = self.client.get(
            f"/api/engineer-deletion-requests?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_11_delete_requests_pagination_schema(self):
        res = self.client.get(
            f"/api/delete-requests?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_12_upload_history_pagination_schema(self):
        res = self.client.get(
            f"/api/upload/history?company_id={self.comp.company_id}&page=1&page_size=10",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

    def test_13_pagination_validation_constraints(self):
        # Invalid page < 1
        res = self.client.get(
            f"/api/engineers?page=0&page_size=20",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 422)

        # Invalid page_size > 100
        res = self.client.get(
            f"/api/engineers?page=1&page_size=150",
            headers=self.headers
        )
        self.assertEqual(res.status_code, 422)

if __name__ == "__main__":
    unittest.main()
