import pytest

from app.models.employee import Employee
from app.repositories.seed import SEED_EMPLOYEES


@pytest.fixture
def seed_employee_models() -> list[Employee]:
    return [Employee.model_validate(employee) for employee in SEED_EMPLOYEES]


@pytest.fixture
def response_documents() -> list[dict]:
    return [
        {
            "id": "resp_104_current",
            "employee_id": "emp_104",
            "survey_cycle": "2026-h2",
            "answers": {"ai_usage_frequency": "daily"},
        },
        {
            "id": "resp_104_old",
            "employee_id": "emp_104",
            "survey_cycle": "2026-h1",
            "answers": {"ai_usage_frequency": "never"},
        },
        {
            "id": "resp_105_current",
            "employee_id": "emp_105",
            "survey_cycle": "2026-h2",
            "answers": {"ai_usage_frequency": "few_times_week"},
        },
        {
            "id": "resp_108_current",
            "employee_id": "emp_108",
            "survey_cycle": "2026-h2",
            "answers": {"ai_usage_frequency": "daily"},
        },
    ]


@pytest.fixture
def active_survey_cycle() -> str:
    return "2026-h2"
