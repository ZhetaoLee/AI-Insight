from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.models.employee import Employee
from app.repositories.employees import EmployeeRepository

router = APIRouter(tags=["employees"])


@router.get("/employees", response_model=list[Employee])
async def list_employees(db: AsyncIOMotorDatabase = Depends(get_database)) -> list[Employee]:
    return await EmployeeRepository(db).list_employees()
