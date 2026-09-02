from collections.abc import Hashable
from datetime import UTC, datetime
from typing import Any


class FakeAsyncCursor:
    def __init__(self, documents: list[dict]) -> None:
        self._documents = documents

    def sort(self, field: str, direction: int) -> "FakeAsyncCursor":
        reverse = direction < 0
        self._documents.sort(key=lambda document: document[field], reverse=reverse)
        return self

    def __aiter__(self):
        self._iterator = iter(self._documents)
        return self

    async def __anext__(self):
        try:
            return next(self._iterator)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeUpdateResult:
    def __init__(self, upserted_id: str | None, matched_count: int | None = None) -> None:
        self.upserted_id = upserted_id
        self.matched_count = matched_count


def replace_nested(payload: dict, path: tuple[Hashable, ...], value: Any) -> dict:
    current = dict(payload)
    root = current
    for key in path[:-1]:
        next_value = current[key]
        copied = list(next_value) if isinstance(next_value, list) else dict(next_value)
        current[key] = copied
        current = copied
    current[path[-1]] = value
    return root


def add_nested(payload: dict, path: tuple[Hashable, ...], key: Hashable, value: Any) -> dict:
    current = dict(payload)
    root = current
    for path_key in path:
        next_value = current[path_key]
        copied = list(next_value) if isinstance(next_value, list) else dict(next_value)
        current[path_key] = copied
        current = copied
    current[key] = value
    return root


def project_document(document: dict, projection: dict | None) -> dict:
    if projection is None:
        return dict(document)
    excluded = {key for key, value in projection.items() if value == 0}
    included = {key for key, value in projection.items() if value == 1}
    if included:
        return {key: document[key] for key in included if key in document and key not in excluded}
    return {key: value for key, value in document.items() if key not in excluded}


def survey_response_document(
    response_id: str,
    employee_id: str,
    survey_cycle: str,
    *,
    q1: str = "daily",
    q2: list[tuple[str, int, str | None]] | None = None,
    q3: str = "more_than_5_hours",
    q4: str = "slightly_more",
    q5: str = "slightly_better",
    q6: str = "sometimes",
    q7: tuple[str, str | None] = ("saves_time", None),
    q8: list[tuple[str, str | None]] | None = None,
) -> dict:
    top_value_areas = q2 if q2 is not None else [
        ("implementation", 1, None),
        ("research", 2, None),
        ("testing", 3, None),
    ]
    barriers = q8 if q8 is not None else [("lack_of_training", None)]
    return {
        "id": response_id,
        "employee_id": employee_id,
        "survey_cycle": survey_cycle,
        "survey_version": "1.0",
        "submitted_at": datetime(2026, 9, 1, tzinfo=UTC),
        "answers": {
            "ai_usage_frequency": q1,
            "top_value_areas": [
                {"area": area, "rank": rank, "other_text": other_text}
                for area, rank, other_text in top_value_areas
            ],
            "weekly_time_saved": q3,
            "work_output_change": q4,
            "quality_change": q5,
            "correction_frequency": q6,
            "biggest_benefit": {"option": q7[0], "other_text": q7[1]},
            "barriers": [{"option": option, "other_text": other_text} for option, other_text in barriers],
        },
    }
