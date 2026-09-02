from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import get_database
from app.routers import employees
from helpers import FakeAsyncCursor, project_document


class FakeEmployeesCollection:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents

    def find(self, query: dict, projection: dict) -> FakeAsyncCursor:
        return FakeAsyncCursor([project_document(document, projection) for document in self._documents])


class FakeDb:
    def __init__(self, employee_documents: list[dict]) -> None:
        self.employees = FakeEmployeesCollection(employee_documents)


def test_list_employees_does_not_return_removed_department_field():
    db = FakeDb(
        [
            {
                "id": "emp_104",
                "name": "Alice Chen",
                "department": "Engineering",
                "level": "ic",
                "manager_id": "emp_103",
            }
        ]
    )
    app = FastAPI()
    app.dependency_overrides[get_database] = lambda: db
    app.include_router(employees.router, prefix="/api")

    response = TestClient(app).get("/api/employees")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "emp_104",
            "name": "Alice Chen",
            "level": "ic",
            "manager_id": "emp_103",
        }
    ]
