import pytest

from app.repositories.employees import EmployeeRepository

pytestmark = pytest.mark.asyncio


class FakeEmployeesCollection:
    def __init__(self, employee_ids: set[str]) -> None:
        self._employee_ids = employee_ids
        self.find_one_calls: list[tuple[dict, dict | None]] = []

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        self.find_one_calls.append((query, projection))
        if query["id"] not in self._employee_ids:
            return None
        return {"id": query["id"]}


class FakeDb:
    def __init__(self, employee_ids: set[str]) -> None:
        self.employees = FakeEmployeesCollection(employee_ids)


async def test_exists_returns_true_and_uses_minimal_projection_for_known_employee():
    db = FakeDb({"emp_104"})
    repository = EmployeeRepository(db)

    assert await repository.exists("emp_104") is True
    assert db.employees.find_one_calls == [({"id": "emp_104"}, {"_id": 0, "id": 1})]


async def test_exists_returns_false_for_unknown_employee():
    db = FakeDb({"emp_104"})
    repository = EmployeeRepository(db)

    assert await repository.exists("emp_missing") is False
