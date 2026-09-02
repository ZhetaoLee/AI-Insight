import pytest

from app.repositories.seed import SEED_EMPLOYEES, seed_employees

pytestmark = pytest.mark.asyncio


class FakeEmployeesCollection:
    def __init__(self) -> None:
        self.update_one_calls: list[tuple[dict, dict, bool]] = []

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> None:
        self.update_one_calls.append((query, update, upsert))


class FakeDb:
    def __init__(self) -> None:
        self.employees = FakeEmployeesCollection()


async def test_seed_employees_omit_removed_department_field():
    assert all("department" not in employee for employee in SEED_EMPLOYEES)


async def test_seed_employees_unsets_stale_department_field():
    db = FakeDb()

    await seed_employees(db)

    assert len(db.employees.update_one_calls) == len(SEED_EMPLOYEES)
    assert all(update["$unset"] == {"department": ""} for _, update, _ in db.employees.update_one_calls)
    assert all("department" not in update["$set"] for _, update, _ in db.employees.update_one_calls)
