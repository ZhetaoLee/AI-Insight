import pytest

from app.models.employee import Employee
from app.services.hierarchy import HierarchyService
from app.services.scope_resolver import ScopeResolver

pytestmark = pytest.mark.asyncio


class InMemoryEmployeeRepository:
    def __init__(self, employees: list[Employee]) -> None:
        self._employees = employees

    async def list_employees(self) -> list[Employee]:
        return self._employees


def ids(*suffixes: str) -> list[str]:
    return [f"emp_{suffix}" for suffix in suffixes]


async def test_org_scope_includes_all_seeded_employees(seed_scope_resolver):
    employee_ids = await seed_scope_resolver.resolve("org")

    assert employee_ids == ids("101", "102", "103", "104", "105", "106", "107", "108", "109", "110")


async def test_manager_scope_includes_manager_and_all_descendants_across_branches(seed_scope_resolver):
    employee_ids = await seed_scope_resolver.resolve("manager", "emp_101")

    assert employee_ids[0] == "emp_101"
    assert set(employee_ids) == set(ids("101", "102", "103", "104", "105", "106", "107", "108", "109", "110"))


@pytest.mark.parametrize(
    ("level", "expected_ids"),
    [
        ("senior_director", ids("101")),
        ("director", ids("102", "106")),
        ("manager", ids("103", "107", "109")),
        ("ic", ids("104", "105", "108", "110")),
    ],
)
async def test_level_scope_includes_only_matching_level(seed_scope_resolver, level, expected_ids):
    employee_ids = await seed_scope_resolver.resolve("level", level)

    assert employee_ids == expected_ids


async def test_level_scope_rejects_unknown_level(seed_scope_resolver):
    with pytest.raises(ValueError, match="unsupported employee level"):
        await seed_scope_resolver.resolve("level", "contractor")


async def test_scope_resolver_requires_scope_id_for_manager_and_level(seed_scope_resolver):
    with pytest.raises(ValueError, match="manager scope requires scope_id"):
        await seed_scope_resolver.resolve("manager")

    with pytest.raises(ValueError, match="level scope requires scope_id"):
        await seed_scope_resolver.resolve("level")


async def test_unknown_manager_scope_resolves_to_empty_population(seed_scope_resolver):
    assert await seed_scope_resolver.resolve("manager", "emp_missing") == []


async def test_scope_resolver_rejects_unknown_scope_type(seed_scope_resolver):
    with pytest.raises(ValueError, match="unsupported scope type"):
        await seed_scope_resolver.resolve("department")  # type: ignore[arg-type]


async def test_hierarchy_traversal_protects_against_cycles():
    employees = [
        Employee(id="emp_a", name="A", department="Engineering", level="manager", manager_id="emp_c"),
        Employee(id="emp_b", name="B", department="Engineering", level="manager", manager_id="emp_a"),
        Employee(id="emp_c", name="C", department="Engineering", level="manager", manager_id="emp_b"),
    ]
    hierarchy = HierarchyService(InMemoryEmployeeRepository(employees))

    employee_ids = await hierarchy.descendant_ids("emp_a")

    assert employee_ids == ["emp_a", "emp_b", "emp_c"]


@pytest.fixture
def seed_scope_resolver(seed_employee_models) -> ScopeResolver:
    return scope_resolver_for(seed_employee_models)


def scope_resolver_for(employees: list[Employee]) -> ScopeResolver:
    repository = InMemoryEmployeeRepository(employees)
    return ScopeResolver(repository, HierarchyService(repository))
