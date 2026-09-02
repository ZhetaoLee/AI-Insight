from collections.abc import Sequence
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


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
