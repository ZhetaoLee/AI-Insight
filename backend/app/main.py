from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import connect_to_mongo, ensure_indexes
from app.repositories.seed import seed_employees
from app.routers import employees, health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    client, db = await connect_to_mongo(settings)
    app.state.mongo_client = client
    app.state.db = db
    app.state.settings = settings
    await ensure_indexes(db)
    await seed_employees(db)
    try:
        yield
    finally:
        client.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="AI Insight API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(employees.router, prefix="/api")
    return app


app = create_app()
