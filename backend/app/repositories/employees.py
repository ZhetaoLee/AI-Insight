from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.employee import Employee


class EmployeeRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._collection = db.employees

    async def list_employees(self) -> list[Employee]:
        cursor = self._collection.find({}, {"_id": 0}).sort("id", 1)
        return [Employee.model_validate(document) async for document in cursor]
