from collections import deque
from collections.abc import Sequence
from typing import Protocol

from app.models.employee import Employee


class EmployeeReader(Protocol):
    async def list_employees(self) -> list[Employee]: ...


class HierarchyService:
    def __init__(self, employee_repository: EmployeeReader) -> None:
        self._employee_repository = employee_repository

    async def descendant_ids(self, manager_id: str) -> list[str]:
        employees = await self._employee_repository.list_employees()
        if manager_id not in {employee.id for employee in employees}:
            return []

        children_by_manager = self._children_by_manager(employees)
        seen = {manager_id}
        ordered_ids = [manager_id]
        queue = deque([manager_id])

        while queue:
            current_id = queue.popleft()
            for child in children_by_manager.get(current_id, []):
                if child.id in seen:
                    continue
                seen.add(child.id)
                ordered_ids.append(child.id)
                queue.append(child.id)

        return ordered_ids

    @staticmethod
    def _children_by_manager(employees: Sequence[Employee]) -> dict[str, list[Employee]]:
        children_by_manager: dict[str, list[Employee]] = {}
        for employee in employees:
            if employee.manager_id is None:
                continue
            children_by_manager.setdefault(employee.manager_id, []).append(employee)
        return children_by_manager
