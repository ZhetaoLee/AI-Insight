from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.employee import EmployeeLevel


def employee(
    employee_id: str,
    name: str,
    department: str,
    level: EmployeeLevel,
    manager_id: str | None = None,
) -> dict[str, str | None]:
    return {
        "id": employee_id,
        "name": name,
        "department": department,
        "level": level,
        "manager_id": manager_id,
    }


SEED_EMPLOYEES = [
    employee("emp_101", "Priya Nair", "Engineering", "senior_director"),
    employee("emp_102", "Sarah Lee", "Engineering", "director", "emp_101"),
    employee("emp_103", "David Kim", "Engineering", "manager", "emp_102"),
    employee("emp_104", "Alice Chen", "Engineering", "ic", "emp_103"),
    employee("emp_105", "Marcus Webb", "Engineering", "ic", "emp_103"),
    employee("emp_106", "Elena Ruiz", "Product", "director", "emp_101"),
    employee("emp_107", "Noah Patel", "Product", "manager", "emp_106"),
    employee("emp_108", "Jade Thompson", "Product", "ic", "emp_107"),
    employee("emp_109", "Omar Farouk", "Operations", "manager", "emp_101"),
    employee("emp_110", "Grace Liu", "Operations", "ic", "emp_109"),
]


async def seed_employees(db: AsyncIOMotorDatabase) -> None:
    for employee in SEED_EMPLOYEES:
        await db.employees.update_one({"id": employee["id"]}, {"$set": employee}, upsert=True)
