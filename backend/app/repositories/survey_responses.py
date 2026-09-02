from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.survey_response import SurveyResponseSubmission


class SurveyResponseRepository:
    def __init__(self, db: AsyncIOMotorDatabase, survey_cycle: str) -> None:
        self._collection = db.survey_responses
        self._survey_cycle = survey_cycle

    async def find_by_employee_ids(self, employee_ids: Sequence[str]) -> list[dict[str, Any]]:
        unique_employee_ids = list(dict.fromkeys(employee_ids))
        if not unique_employee_ids:
            return []

        cursor = self._collection.find(
            {
                "employee_id": {"$in": unique_employee_ids},
                "survey_cycle": self._survey_cycle,
            },
            {"_id": 0},
        )
        return [document async for document in cursor]

    async def upsert_response(
        self,
        submission: SurveyResponseSubmission,
        survey_version: str,
    ) -> tuple[dict[str, Any], bool]:
        query = {
            "employee_id": submission.employee_id,
            "survey_cycle": self._survey_cycle,
        }
        update_result = await self._collection.update_one(
            query,
            {
                "$setOnInsert": {
                    "id": f"response_{uuid4().hex}",
                    "employee_id": submission.employee_id,
                    "survey_cycle": self._survey_cycle,
                },
                "$set": {
                    "survey_version": survey_version,
                    "answers": submission.answers.model_dump(),
                    "submitted_at": datetime.now(UTC),
                },
            },
            upsert=True,
        )

        stored = await self._collection.find_one(query, {"_id": 0})
        if stored is None:  # pragma: no cover - defensive guard for database failures
            raise RuntimeError("survey response upsert did not return a stored document")
        return stored, update_result.upserted_id is not None
