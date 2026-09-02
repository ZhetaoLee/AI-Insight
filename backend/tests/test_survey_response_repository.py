import pytest
from pymongo.errors import DuplicateKeyError

from app.models.survey_response import SurveyResponseSubmission
from app.repositories.survey_responses import SurveyResponseAlreadyExistsError, SurveyResponseRepository
from helpers import FakeAsyncCursor, project_document

pytestmark = pytest.mark.asyncio


class FakeSurveyResponsesCollection:
    def __init__(self, documents: list[dict], *, hide_existing_on_id_lookup: bool = False) -> None:
        self._documents = documents
        self.find_calls: list[tuple[dict, dict]] = []
        self.update_calls: list[tuple[dict, dict, bool]] = []
        self._hide_existing_on_id_lookup = hide_existing_on_id_lookup

    def find(self, query: dict, projection: dict) -> FakeAsyncCursor:
        self.find_calls.append((query, projection))
        survey_cycle = query["survey_cycle"]
        employee_ids = set(query.get("employee_id", {}).get("$in", []))
        matches = [
            {key: value for key, value in document.items() if key != "_id"}
            for document in self._documents
            if document["survey_cycle"] == survey_cycle and (not employee_ids or document["employee_id"] in employee_ids)
        ]
        return FakeAsyncCursor(matches)

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        if self._hide_existing_on_id_lookup and projection == {"_id": 0, "id": 1}:
            return None

        document = next(
            (
                document
                for document in self._documents
                if document["employee_id"] == query["employee_id"] and document["survey_cycle"] == query["survey_cycle"]
            ),
            None,
        )
        if document is None:
            return None
        if projection is None:
            return document
        return project_document(document, projection)

    async def insert_one(self, document: dict) -> None:
        query = {
            "employee_id": document["employee_id"],
            "survey_cycle": document["survey_cycle"],
        }
        existing = next(
            (
                stored
                for stored in self._documents
                if stored["employee_id"] == query["employee_id"] and stored["survey_cycle"] == query["survey_cycle"]
            ),
            None,
        )
        if existing is not None:
            raise DuplicateKeyError("duplicate employee/cycle response")
        self._documents.append(document)


class FakeDb:
    def __init__(self, response_documents: list[dict], *, hide_existing_on_id_lookup: bool = False) -> None:
        self.survey_responses = FakeSurveyResponsesCollection(
            response_documents,
            hide_existing_on_id_lookup=hide_existing_on_id_lookup,
        )


async def test_find_by_employee_ids_filters_to_active_survey_cycle(response_documents, active_survey_cycle):
    repository = SurveyResponseRepository(FakeDb(response_documents), survey_cycle=active_survey_cycle)

    responses = await repository.find_by_employee_ids(["emp_104", "emp_105"])

    assert [response["id"] for response in responses] == ["resp_104_current", "resp_105_current"]
    assert {response["survey_cycle"] for response in responses} == {"2026-h2"}


async def test_find_by_employee_ids_skips_query_for_empty_input(response_documents, active_survey_cycle):
    db = FakeDb(response_documents)
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)

    responses = await repository.find_by_employee_ids([])

    assert responses == []
    assert db.survey_responses.find_calls == []


async def test_find_by_employee_ids_deduplicates_query_ids(response_documents, active_survey_cycle):
    db = FakeDb(response_documents)
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)

    await repository.find_by_employee_ids(["emp_104", "emp_104", "emp_105"])

    query, projection = db.survey_responses.find_calls[0]
    assert query == {
        "employee_id": {"$in": ["emp_104", "emp_105"]},
        "survey_cycle": active_survey_cycle,
    }
    assert projection == {"_id": 0}


async def test_submitted_employee_ids_filters_to_active_survey_cycle(response_documents, active_survey_cycle):
    db = FakeDb(response_documents)
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)

    employee_ids = await repository.submitted_employee_ids()

    assert employee_ids == ["emp_104", "emp_105", "emp_108"]
    query, projection = db.survey_responses.find_calls[0]
    assert query == {"survey_cycle": active_survey_cycle}
    assert projection == {"_id": 0, "employee_id": 1}


async def test_create_response_creates_new_employee_cycle_response(valid_survey_submission, active_survey_cycle):
    db = FakeDb([])
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)
    submission = SurveyResponseSubmission.model_validate(valid_survey_submission)

    stored = await repository.create_response(submission, survey_version="1.0")

    assert stored["id"].startswith("response_")
    assert stored["employee_id"] == "emp_104"
    assert stored["survey_cycle"] == active_survey_cycle
    assert stored["survey_version"] == "1.0"
    assert stored["answers"]["ai_usage_frequency"] == "daily"
    assert "submitted_at" in stored


async def test_create_response_rejects_existing_employee_cycle_response(
    valid_survey_submission,
    active_survey_cycle,
):
    existing_document = {
        "id": "resp_existing",
        "employee_id": "emp_104",
        "survey_cycle": active_survey_cycle,
        "survey_version": "1.0",
        "answers": {"ai_usage_frequency": "never"},
    }
    db = FakeDb([existing_document])
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)
    submission = SurveyResponseSubmission.model_validate(valid_survey_submission)

    with pytest.raises(SurveyResponseAlreadyExistsError):
        await repository.create_response(submission, survey_version="1.1")

    assert db.survey_responses.update_calls == []
    assert db.survey_responses._documents == [existing_document]


async def test_create_response_rejects_duplicate_key_when_document_appears_before_insert(
    valid_survey_submission,
    active_survey_cycle,
):
    existing_document = {
        "id": "resp_existing",
        "employee_id": "emp_104",
        "survey_cycle": active_survey_cycle,
        "survey_version": "1.0",
        "answers": {"ai_usage_frequency": "never"},
    }
    db = FakeDb([existing_document], hide_existing_on_id_lookup=True)
    repository = SurveyResponseRepository(db, survey_cycle=active_survey_cycle)
    submission = SurveyResponseSubmission.model_validate(valid_survey_submission)

    with pytest.raises(SurveyResponseAlreadyExistsError):
        await repository.create_response(submission, survey_version="1.1")

    assert db.survey_responses._documents == [existing_document]
