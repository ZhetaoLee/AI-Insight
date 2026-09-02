from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.survey_response import SurveyResponseSubmission


class SurveyResponseAlreadyExistsError(Exception):
    pass


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

    async def submitted_employee_ids(self) -> list[str]:
        cursor = self._collection.find(
            {"survey_cycle": self._survey_cycle},
            {"_id": 0, "employee_id": 1},
        )
        employee_ids = []
        async for document in cursor:
            employee_ids.append(document["employee_id"])
        return list(dict.fromkeys(employee_ids))

    async def create_response(
        self,
        submission: SurveyResponseSubmission,
        survey_version: str,
    ) -> dict[str, Any]:
        query = {
            "employee_id": submission.employee_id,
            "survey_cycle": self._survey_cycle,
        }
        if await self._collection.find_one(query, {"_id": 0, "id": 1}) is not None:
            raise SurveyResponseAlreadyExistsError

        document = {
            "id": f"response_{uuid4().hex}",
            "employee_id": submission.employee_id,
            "survey_cycle": self._survey_cycle,
            "survey_version": survey_version,
            "answers": submission.answers.model_dump(),
            "submitted_at": datetime.now(UTC),
        }
        try:
            await self._collection.insert_one(dict(document))
        except DuplicateKeyError as exc:
            raise SurveyResponseAlreadyExistsError from exc
        return document
