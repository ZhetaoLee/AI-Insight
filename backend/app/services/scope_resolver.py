from typing import Literal

from app.models.employee import EMPLOYEE_LEVELS
from app.services.hierarchy import EmployeeReader, HierarchyService

ScopeType = Literal["org", "manager", "level"]


class ScopeResolver:
    def __init__(self, employee_repository: EmployeeReader, hierarchy_service: HierarchyService) -> None:
        self._employee_repository = employee_repository
        self._hierarchy_service = hierarchy_service

    async def resolve(self, scope_type: ScopeType, scope_id: str | None = None) -> list[str]:
        if scope_type == "org":
            return [employee.id for employee in await self._employee_repository.list_employees()]

        if scope_type == "manager":
            if scope_id is None:
                raise ValueError("manager scope requires scope_id")
            return await self._hierarchy_service.descendant_ids(scope_id)

        if scope_type == "level":
            if scope_id is None:
                raise ValueError("level scope requires scope_id")
            if scope_id not in EMPLOYEE_LEVELS:
                raise ValueError(f"unsupported employee level: {scope_id}")
            employees = await self._employee_repository.list_employees()
            return [employee.id for employee in employees if employee.level == scope_id]

        raise ValueError(f"unsupported scope type: {scope_type}")
