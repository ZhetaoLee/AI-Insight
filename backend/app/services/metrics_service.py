from collections.abc import Sequence

from app.models.employee import Employee
from app.models.metrics import DashboardMetricsResponse, Q3Q5Criteria, ScopeDescriptor, ScopeType
from app.models.survey_response import SurveyResponse
from app.repositories.employees import EmployeeRepository
from app.repositories.survey_responses import SurveyResponseRepository
from app.services.metrics import LEVEL_LABELS, MetricsAggregator
from app.services.scope_resolver import ScopeResolver


class UnknownScopeError(ValueError):
    pass


class MetricsService:
    def __init__(
        self,
        employee_repository: EmployeeRepository,
        response_repository: SurveyResponseRepository,
        scope_resolver: ScopeResolver,
        metrics_aggregator: MetricsAggregator,
    ) -> None:
        self._employee_repository = employee_repository
        self._response_repository = response_repository
        self._scope_resolver = scope_resolver
        self._metrics_aggregator = metrics_aggregator

    async def get_metrics(
        self,
        *,
        scope_type: ScopeType,
        scope_id: str | None,
        criteria: Q3Q5Criteria,
    ) -> DashboardMetricsResponse:
        employees = await self._employee_repository.list_employees()
        scope = self._describe_scope(employees, scope_type, scope_id)
        employee_ids = await self._scope_resolver.resolve(scope_type, scope_id)
        employee_id_set = set(employee_ids)
        scoped_employees = [employee for employee in employees if employee.id in employee_id_set]
        responses = [
            SurveyResponse.model_validate(document)
            for document in await self._response_repository.find_by_employee_ids(employee_ids)
        ]
        return self._metrics_aggregator.aggregate(
            scope=scope,
            employees=scoped_employees,
            responses=responses,
            criteria=criteria,
        )

    def _describe_scope(
        self,
        employees: Sequence[Employee],
        scope_type: ScopeType,
        scope_id: str | None,
    ) -> ScopeDescriptor:
        if scope_type == "org":
            return ScopeDescriptor(type="org", id=None, name="Organization")

        if scope_type == "manager":
            manager = next((employee for employee in employees if employee.id == scope_id), None)
            if manager is None or manager.level == "ic":
                raise UnknownScopeError(f"unknown manager scope: {scope_id}")
            return ScopeDescriptor(type="manager", id=manager.id, name=manager.name)

        level_label = LEVEL_LABELS.get(scope_id or "")
        if level_label is None:
            raise ValueError(f"unsupported employee level: {scope_id}")
        return ScopeDescriptor(type="level", id=scope_id, name=level_label)
