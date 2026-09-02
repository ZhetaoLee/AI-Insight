import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import get_database
from app.repositories.seed import SEED_EMPLOYEES
from app.routers import metrics, survey_responses
from helpers import FakeAsyncCursor, FakeUpdateResult, project_document, survey_response_document


class FakeEmployeesCollection:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents

    def find(self, query: dict, projection: dict) -> FakeAsyncCursor:
        return FakeAsyncCursor([project_document(document, projection) for document in self._documents])

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        document = next((document for document in self._documents if document["id"] == query["id"]), None)
        if document is None:
            return None
        return project_document(document, projection) if projection else document


class FakeSurveyResponsesCollection:
    def __init__(self, documents: list[dict]) -> None:
        self.documents = documents

    def find(self, query: dict, projection: dict) -> FakeAsyncCursor:
        employee_ids = set(query["employee_id"]["$in"])
        survey_cycle = query["survey_cycle"]
        documents = [
            project_document(document, projection)
            for document in self.documents
            if document["employee_id"] in employee_ids and document["survey_cycle"] == survey_cycle
        ]
        return FakeAsyncCursor(documents)

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        document = next(
            (
                document
                for document in self.documents
                if document["employee_id"] == query["employee_id"] and document["survey_cycle"] == query["survey_cycle"]
            ),
            None,
        )
        if document is None:
            return None
        return project_document(document, projection) if projection else document

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> "FakeUpdateResult":
        document = next(
            (
                document
                for document in self.documents
                if document["employee_id"] == query["employee_id"] and document["survey_cycle"] == query["survey_cycle"]
            ),
            None,
        )
        created = document is None
        if document is None:
            document = dict(update.get("$setOnInsert", {}))
            self.documents.append(document)
        document.update(update.get("$set", {}))
        return FakeUpdateResult(upserted_id="fake_insert_id" if created else None)


class FakeDb:
    def __init__(self, response_documents: list[dict]) -> None:
        self.employees = FakeEmployeesCollection([dict(employee) for employee in SEED_EMPLOYEES])
        self.survey_responses = FakeSurveyResponsesCollection(response_documents)


@pytest.fixture
def metrics_api_client(active_survey_cycle):
    db = FakeDb(
        [
            survey_response_document(
                "resp_104_current",
                "emp_104",
                active_survey_cycle,
                q1="daily",
                q3="more_than_5_hours",
                q4="slightly_more",
                q5="slightly_better",
                q8=[("lack_of_training", None)],
            ),
            survey_response_document(
                "resp_105_current",
                "emp_105",
                active_survey_cycle,
                q1="never",
                q3="not_sure",
                q4="same",
                q5="no_meaningful_change",
                q8=[("no_major_barriers", None)],
            ),
            survey_response_document(
                "resp_104_old",
                "emp_104",
                "2026-h1",
                q1="never",
                q3="no_noticeable_time_saved",
                q4="much_less",
                q5="much_worse",
                q8=[("poor_workflow_fit", None)],
            ),
        ]
    )
    app = FastAPI()
    app.dependency_overrides[get_database] = lambda: db
    app.dependency_overrides[metrics.get_settings] = lambda: Settings(SURVEY_CYCLE=active_survey_cycle, SURVEY_VERSION="1.0")
    app.dependency_overrides[survey_responses.get_settings] = lambda: Settings(
        SURVEY_CYCLE=active_survey_cycle,
        SURVEY_VERSION="1.0",
    )
    app.include_router(metrics.router, prefix="/api")
    app.include_router(survey_responses.router, prefix="/api")
    return TestClient(app), db


def test_get_metrics_returns_org_metrics_with_default_criteria(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=org")

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == {"type": "org", "id": None, "name": "Organization"}
    assert body["coverage"] == {"eligible_employees": 10, "respondents": 2, "response_rate": 0.2}
    assert body["population"]["active_ai_users"] == 1
    assert body["headline_metrics"]["ai_adoption_rate"] == {"value": 0.5, "count": 1, "denominator": 2}
    assert "estimated_weekly_hours_saved" not in body["headline_metrics"]
    assert "avg_weekly_hours_saved" not in body["headline_metrics"]
    assert body["q3_q5_analysis"]["criteria"] == {
        "weekly_time_saved": "more_than_5_hours",
        "work_output_change": "slightly_more",
        "quality_change": "slightly_better",
    }
    assert body["q3_q5_analysis"]["matching_count"] == 1
    assert body["q3_q5_analysis"]["analysis_denominator"] == 1
    assert body["group_breakdown"]["group_by"] == "level"
    assert all("avg_hours_saved" not in row and "avg_hours_saved_denominator" not in row for row in body["group_breakdown"]["rows"])


def test_get_metrics_supports_manager_scope(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=manager&scope_id=emp_103")

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == {"type": "manager", "id": "emp_103", "name": "David Kim"}
    assert body["coverage"]["eligible_employees"] == 3
    assert body["coverage"]["respondents"] == 2


def test_get_metrics_returns_400_for_unknown_manager_scope(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=manager&scope_id=emp_missing")

    assert response.status_code == 400


def test_get_metrics_returns_400_for_individual_contributor_manager_scope(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=manager&scope_id=emp_104")

    assert response.status_code == 400


def test_get_metrics_supports_level_scope(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=level&scope_id=ic")

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == {"type": "level", "id": "ic", "name": "Individual Contributor"}
    assert body["coverage"]["eligible_employees"] == 4
    assert body["coverage"]["respondents"] == 2
    assert body["group_breakdown"]["group_by"] == "level"
    assert body["group_breakdown"]["rows"][0]["key"] == "ic"


def test_get_metrics_uses_custom_q3_q5_criteria(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=org&q3=no_noticeable_time_saved&q4=slightly_less&q5=slightly_worse")

    assert response.status_code == 200
    assert response.json()["q3_q5_analysis"]["criteria"] == {
        "weekly_time_saved": "no_noticeable_time_saved",
        "work_output_change": "slightly_less",
        "quality_change": "slightly_worse",
    }


def test_get_metrics_returns_422_for_not_sure_q3(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=org&q3=not_sure")

    assert response.status_code == 422


def test_get_metrics_rejects_unsupported_group_by(metrics_api_client):
    client, _ = metrics_api_client

    response = client.get("/api/metrics?scope=org&group_by=department")

    assert response.status_code == 422


@pytest.mark.parametrize(
    "query",
    [
        "scope=manager",
        "scope=level",
        "scope=org&scope_id=emp_103",
        "scope=level&scope_id=contractor",
        "scope=team",
        "scope=org&q4=better",
    ],
)
def test_get_metrics_rejects_invalid_queries(metrics_api_client, query):
    client, _ = metrics_api_client

    response = client.get(f"/api/metrics?{query}")

    assert response.status_code == 422


def test_submitted_response_updates_later_metrics(metrics_api_client, valid_survey_submission):
    client, _ = metrics_api_client

    submission = {**valid_survey_submission, "employee_id": "emp_108"}
    post_response = client.post("/api/survey-responses", json=submission)
    metrics_response = client.get("/api/metrics?scope=level&scope_id=ic")

    assert post_response.status_code == 201
    assert metrics_response.status_code == 200
    body = metrics_response.json()
    assert body["coverage"]["eligible_employees"] == 4
    assert body["coverage"]["respondents"] == 3
    assert body["population"]["active_ai_users"] == 2
