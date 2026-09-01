from typing import Literal

from pydantic import BaseModel, Field


EmployeeLevel = Literal["senior_director", "director", "manager", "ic"]


class Employee(BaseModel):
    id: str = Field(examples=["emp_101"])
    name: str
    department: str
    level: EmployeeLevel
    manager_id: str | None = None
