from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import get_database
from app.routers import survey_responses
from pymongo.errors import DuplicateKeyError

from helpers import replace_nested


class FakeEmployeesCollection:
    def __init__(self, employee_ids: set[str]) -> None:
        self._employee_ids = employee_ids

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        if query["id"] not in self._employee_ids:
            return None
        return {"id": query["id"]}


class FakeSurveyResponsesCollection:
    def __init__(self) -> None:
        self.documents: dict[tuple[str, str], dict] = {}

    def find(self, query: dict, projection: dict):
        survey_cycle = query["survey_cycle"]
        return FakeSubmittedEmployeeCursor(
            [
                {key: value for key, value in document.items() if key != "_id" and projection.get(key) != 0}
                for key, document in self.documents.items()
                if key[1] == survey_cycle
            ]
        )

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        document = self.documents.get((query["employee_id"], query["survey_cycle"]))
        if document is None:
            return None
        if projection == {"_id": 0}:
            return {key: value for key, value in document.items() if key != "_id"}
        return document

    async def insert_one(self, document: dict) -> None:
        key = (document["employee_id"], document["survey_cycle"])
        if key in self.documents:
            raise DuplicateKeyError("duplicate employee/cycle response")
        self.documents[key] = document


class FakeSubmittedEmployeeCursor:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents

    def __aiter__(self):
        self._iterator = iter(self._documents)
        return self

    async def __anext__(self):
        try:
            return next(self._iterator)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeDb:
    def __init__(self, employee_ids: set[str]) -> None:
        self.employees = FakeEmployeesCollection(employee_ids)
        self.survey_responses = FakeSurveyResponsesCollection()


@pytest.fixture
def survey_api_client(active_survey_cycle):
    db = FakeDb({"emp_104"})
    app = FastAPI()
    app.dependency_overrides[get_database] = lambda: db
    app.dependency_overrides[survey_responses.get_settings] = lambda: Settings(
        SURVEY_CYCLE=active_survey_cycle,
        SURVEY_VERSION="1.0",
    )
    app.include_router(survey_responses.router, prefix="/api")
    return TestClient(app), db


def test_post_survey_response_persists_server_fields(survey_api_client, valid_survey_submission, active_survey_cycle):
    client, db = survey_api_client

    response = client.post("/api/survey-responses", json=valid_survey_submission)

    assert response.status_code == 201
    body = response.json()
    assert body["employee_id"] == "emp_104"
    assert body["survey_cycle"] == active_survey_cycle
    assert body["survey_version"] == "1.0"
    assert body["id"].startswith("response_")
    assert datetime.fromisoformat(body["submitted_at"].replace("Z", "+00:00")).tzinfo == UTC
    assert db.survey_responses.documents[("emp_104", active_survey_cycle)]["answers"]["ai_usage_frequency"] == "daily"


def test_get_submitted_employee_ids_returns_active_cycle_respondents(survey_api_client, valid_survey_submission, active_survey_cycle):
    client, db = survey_api_client
    client.post("/api/survey-responses", json=valid_survey_submission)
    old_cycle_document = {
        **db.survey_responses.documents[("emp_104", active_survey_cycle)],
        "id": "resp_old",
        "survey_cycle": "2026-h1",
    }
    db.survey_responses.documents[("emp_104", "2026-h1")] = old_cycle_document

    response = client.get("/api/survey-responses/submitted-employee-ids")

    assert response.status_code == 200
    assert response.json() == {"employee_ids": ["emp_104"]}


def test_post_survey_response_rejects_existing_employee_cycle_response(survey_api_client, valid_survey_submission, active_survey_cycle):
    client, db = survey_api_client
    first = client.post("/api/survey-responses", json=valid_survey_submission)
    updated_submission = replace_nested(valid_survey_submission, ("answers", "ai_usage_frequency"), "never")

    second = client.post("/api/survey-responses", json=updated_submission)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json() == {"detail": "survey response already submitted"}
    assert len(db.survey_responses.documents) == 1
    document = db.survey_responses.documents[("emp_104", active_survey_cycle)]
    assert document["id"] == first.json()["id"]
    assert document["answers"]["ai_usage_frequency"] == "daily"


def test_post_survey_response_returns_404_for_unknown_employee(survey_api_client, valid_survey_submission):
    client, _ = survey_api_client
    unknown_employee_submission = replace_nested(valid_survey_submission, ("employee_id",), "emp_missing")

    response = client.post("/api/survey-responses", json=unknown_employee_submission)

    assert response.status_code == 404


def test_post_survey_response_returns_422_and_does_not_persist_invalid_answers(
    survey_api_client,
    valid_survey_submission,
):
    client, db = survey_api_client
    invalid_submission = replace_nested(
        valid_survey_submission,
        ("answers", "barriers"),
        [
            {"option": "no_major_barriers", "other_text": None},
            {"option": "lack_of_training", "other_text": None},
        ],
    )

    response = client.post("/api/survey-responses", json=invalid_submission)

    assert response.status_code == 422
    assert db.survey_responses.documents == {}


def test_post_survey_response_returns_422_and_does_not_persist_extra_client_fields(
    survey_api_client,
    valid_survey_submission,
):
    client, db = survey_api_client
    invalid_submission = replace_nested(valid_survey_submission, ("answers", "level"), "ic")

    response = client.post("/api/survey-responses", json=invalid_submission)

    assert response.status_code == 422
    assert db.survey_responses.documents == {}
