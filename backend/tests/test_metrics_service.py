import pytest
from pydantic import ValidationError

from app.models.employee import Employee
from app.models.metrics import Q3Q5Criteria
from app.services.metrics import MetricsAggregator
from app.services.metrics_service import MetricsService, UnknownScopeError
from helpers import survey_response_document

pytestmark = pytest.mark.asyncio


class FakeEmployeeRepository:
    def __init__(self, employees: list[Employee]) -> None:
        self._employees = employees
        self.list_calls = 0

    async def list_employees(self) -> list[Employee]:
        self.list_calls += 1
        return self._employees


class FakeResponseRepository:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents
        self.employee_id_calls: list[list[str]] = []

    async def find_by_employee_ids(self, employee_ids: list[str]) -> list[dict]:
        self.employee_id_calls.append(employee_ids)
        employee_id_set = set(employee_ids)
        return [document for document in self._documents if document["employee_id"] in employee_id_set]


class FakeScopeResolver:
    def __init__(self, employee_ids: list[str]) -> None:
        self._employee_ids = employee_ids
        self.calls: list[tuple[str, str | None]] = []

    async def resolve(self, scope_type: str, scope_id: str | None = None) -> list[str]:
        self.calls.append((scope_type, scope_id))
        return self._employee_ids


async def test_get_metrics_uses_resolved_employee_scope_for_population_and_response_query():
    employees = [
        employee("emp_201", "Maya Singh", "manager"),
        employee("emp_202", "Theo Grant", "ic", "emp_201"),
        employee("emp_203", "Outside User", "ic"),
    ]
    response_repository = FakeResponseRepository(
        [
            survey_response_document("resp_202", "emp_202", "2026-h2"),
            survey_response_document("resp_203", "emp_203", "2026-h2"),
        ]
    )
    scope_resolver = FakeScopeResolver(["emp_202"])
    service = MetricsService(
        employee_repository=FakeEmployeeRepository(employees),
        response_repository=response_repository,
        scope_resolver=scope_resolver,
        metrics_aggregator=MetricsAggregator(),
    )

    metrics = await service.get_metrics(
        scope_type="manager",
        scope_id="emp_201",
        criteria=criteria(),
    )

    assert metrics.scope.model_dump() == {"type": "manager", "id": "emp_201", "name": "Maya Singh"}
    assert scope_resolver.calls == [("manager", "emp_201")]
    assert response_repository.employee_id_calls == [["emp_202"]]
    assert metrics.coverage.eligible_employees == 1
    assert metrics.coverage.respondents == 1
    assert metrics.group_breakdown.rows[0].key == "ic"


async def test_get_metrics_describes_level_scope_with_human_label():
    employees = [
        employee("emp_201", "Maya Singh", "manager"),
        employee("emp_202", "Theo Grant", "ic", "emp_201"),
    ]
    service = MetricsService(
        employee_repository=FakeEmployeeRepository(employees),
        response_repository=FakeResponseRepository([survey_response_document("resp_202", "emp_202", "2026-h2")]),
        scope_resolver=FakeScopeResolver(["emp_202"]),
        metrics_aggregator=MetricsAggregator(),
    )

    metrics = await service.get_metrics(
        scope_type="level",
        scope_id="ic",
        criteria=criteria(),
    )

    assert metrics.scope.model_dump() == {"type": "level", "id": "ic", "name": "Individual Contributor"}
    assert metrics.coverage.eligible_employees == 1


async def test_get_metrics_rejects_unknown_manager_before_loading_responses():
    response_repository = FakeResponseRepository([survey_response_document("resp_202", "emp_202", "2026-h2")])
    service = MetricsService(
        employee_repository=FakeEmployeeRepository([employee("emp_202", "Theo Grant", "ic")]),
        response_repository=response_repository,
        scope_resolver=FakeScopeResolver(["emp_202"]),
        metrics_aggregator=MetricsAggregator(),
    )

    with pytest.raises(UnknownScopeError, match="unknown manager scope: emp_missing"):
        await service.get_metrics(
            scope_type="manager",
            scope_id="emp_missing",
            criteria=criteria(),
        )

    assert response_repository.employee_id_calls == []


async def test_get_metrics_rejects_individual_contributor_manager_scope():
    response_repository = FakeResponseRepository([survey_response_document("resp_202", "emp_202", "2026-h2")])
    service = MetricsService(
        employee_repository=FakeEmployeeRepository([employee("emp_202", "Theo Grant", "ic")]),
        response_repository=response_repository,
        scope_resolver=FakeScopeResolver(["emp_202"]),
        metrics_aggregator=MetricsAggregator(),
    )

    with pytest.raises(UnknownScopeError, match="unknown manager scope: emp_202"):
        await service.get_metrics(
            scope_type="manager",
            scope_id="emp_202",
            criteria=criteria(),
        )

    assert response_repository.employee_id_calls == []


async def test_get_metrics_rejects_unknown_level_before_loading_responses():
    response_repository = FakeResponseRepository([survey_response_document("resp_202", "emp_202", "2026-h2")])
    service = MetricsService(
        employee_repository=FakeEmployeeRepository([employee("emp_202", "Theo Grant", "ic")]),
        response_repository=response_repository,
        scope_resolver=FakeScopeResolver(["emp_202"]),
        metrics_aggregator=MetricsAggregator(),
    )

    with pytest.raises(ValueError, match="unsupported employee level: contractor"):
        await service.get_metrics(
            scope_type="level",
            scope_id="contractor",
            criteria=criteria(),
        )

    assert response_repository.employee_id_calls == []


async def test_get_metrics_rejects_invalid_persisted_response_document():
    invalid_document = survey_response_document("resp_202", "emp_202", "2026-h2")
    invalid_document["answers"]["weekly_time_saved"] = "impossible_value"
    service = MetricsService(
        employee_repository=FakeEmployeeRepository([employee("emp_202", "Theo Grant", "ic")]),
        response_repository=FakeResponseRepository([invalid_document]),
        scope_resolver=FakeScopeResolver(["emp_202"]),
        metrics_aggregator=MetricsAggregator(),
    )

    with pytest.raises(ValidationError, match="weekly_time_saved"):
        await service.get_metrics(
            scope_type="org",
            scope_id=None,
            criteria=criteria(),
        )


def employee(
    employee_id: str,
    name: str,
    level: str,
    manager_id: str | None = None,
) -> Employee:
    return Employee(id=employee_id, name=name, level=level, manager_id=manager_id)


def criteria() -> Q3Q5Criteria:
    return Q3Q5Criteria(
        weekly_time_saved="more_than_5_hours",
        work_output_change="slightly_more",
        quality_change="slightly_better",
    )
