import asyncio

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.config import Settings


async def connect_to_mongo(settings: Settings) -> tuple[AsyncIOMotorClient, AsyncIOMotorDatabase]:
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    await _ping_with_retry(client)
    return client, client[settings.mongodb_db_name]


async def _ping_with_retry(client: AsyncIOMotorClient, attempts: int = 10) -> None:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            await client.admin.command("ping")
            return
        except Exception as exc:  # pragma: no cover - exercised by local infra failures
            last_error = exc
            await asyncio.sleep(1)
    if last_error is not None:
        raise last_error


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.employees.create_index([("id", ASCENDING)], unique=True, name="employees_id_unique")
    await db.employees.create_index([("manager_id", ASCENDING)], name="employees_manager_id")
    await db.employees.create_index([("level", ASCENDING)], name="employees_level")
    await db.survey_responses.create_index([("survey_cycle", ASCENDING)], name="survey_responses_cycle")
    await db.survey_responses.create_index(
        [("employee_id", ASCENDING), ("survey_cycle", ASCENDING)],
        unique=True,
        name="survey_responses_employee_cycle_unique",
    )


def get_database(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db
