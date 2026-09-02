from collections import Counter

from app.config import Settings
from app.main import create_app
from app.repositories.seed import SEED_EMPLOYEES


EXPECTED_LEVEL_COUNTS = {
    "senior_director": 1,
    "director": 2,
    "manager": 3,
    "ic": 4,
}


def test_cors_origins_accepts_comma_separated_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

    settings = Settings()

    assert settings.cors_origin_list == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_seed_employees_have_required_plan_one_shape():
    employee_ids = {employee["id"] for employee in SEED_EMPLOYEES}
    manager_ids = {employee["manager_id"] for employee in SEED_EMPLOYEES if employee["manager_id"] is not None}
    level_counts = Counter(employee["level"] for employee in SEED_EMPLOYEES)

    assert len(SEED_EMPLOYEES) == 10
    assert len(employee_ids) == 10
    assert manager_ids.issubset(employee_ids)
    assert all(employee["id"] != employee["manager_id"] for employee in SEED_EMPLOYEES)
    assert level_counts == EXPECTED_LEVEL_COUNTS


def test_foundation_routes_are_registered():
    app = create_app()
    route_paths = registered_route_paths(app.routes)

    assert "/health" in route_paths
    assert "/api/employees" in route_paths
    assert "/api/survey-responses" in route_paths


def registered_route_paths(routes):
    route_paths = set()
    for route in routes:
        if hasattr(route, "path"):
            route_paths.add(route.path)
            continue

        include_context = getattr(route, "include_context", None)
        if include_context is not None:
            prefix = include_context.prefix
            route_paths.update(f"{prefix}{child.path}" for child in include_context.included_router.routes)

    return route_paths
