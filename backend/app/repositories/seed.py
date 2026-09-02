from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.employee import EmployeeLevel


def employee(
    employee_id: str,
    name: str,
    level: EmployeeLevel,
    manager_id: str | None = None,
) -> dict[str, str | None]:
    return {
        "id": employee_id,
        "name": name,
        "level": level,
        "manager_id": manager_id,
    }


REMOVED_EMPLOYEE_FIELD_UNSETS = {"department": ""}

SEED_EMPLOYEES = [
    employee("emp_101", "Priya Nair", "senior_director"),
    employee("emp_102", "Sarah Lee", "director", "emp_101"),
    employee("emp_103", "David Kim", "manager", "emp_102"),
    employee("emp_104", "Alice Chen", "ic", "emp_103"),
    employee("emp_105", "Marcus Webb", "ic", "emp_103"),
    employee("emp_106", "Elena Ruiz", "director", "emp_101"),
    employee("emp_107", "Noah Patel", "manager", "emp_106"),
    employee("emp_108", "Jade Thompson", "ic", "emp_107"),
    employee("emp_109", "Omar Farouk", "manager", "emp_106"),
    employee("emp_110", "Grace Liu", "ic", "emp_109"),
]


async def seed_employees(db: AsyncIOMotorDatabase) -> None:
    for employee_doc in SEED_EMPLOYEES:
        await db.employees.update_one(
            {"id": employee_doc["id"]},
            {"$set": employee_doc, "$unset": REMOVED_EMPLOYEE_FIELD_UNSETS},
            upsert=True,
        )
