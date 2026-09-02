import pytest

from app.repositories.survey_responses import SurveyResponseRepository

pytestmark = pytest.mark.asyncio


class FakeAsyncCursor:
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


class FakeSurveyResponsesCollection:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents
        self.find_calls: list[tuple[dict, dict]] = []

    def find(self, query: dict, projection: dict) -> FakeAsyncCursor:
        self.find_calls.append((query, projection))
        employee_ids = set(query["employee_id"]["$in"])
        survey_cycle = query["survey_cycle"]
        matches = [
            {key: value for key, value in document.items() if key != "_id"}
            for document in self._documents
            if document["employee_id"] in employee_ids and document["survey_cycle"] == survey_cycle
        ]
        return FakeAsyncCursor(matches)


class FakeDb:
    def __init__(self, response_documents: list[dict]) -> None:
        self.survey_responses = FakeSurveyResponsesCollection(response_documents)


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
