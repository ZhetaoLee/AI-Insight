from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Settings, get_settings
from app.db import get_database
from app.models.metrics import (
    AnalysisWeeklyTimeSaved,
    DashboardMetricsResponse,
    GroupByField,
    Q3Q5Criteria,
    ScopeType,
)
from app.models.survey_response import QualityChange, WorkOutputChange
from app.repositories.employees import EmployeeRepository
from app.repositories.survey_responses import SurveyResponseRepository
from app.services.hierarchy import HierarchyService
from app.services.metrics import MetricsAggregator
from app.services.metrics_service import MetricsService, UnknownScopeError
from app.services.scope_resolver import ScopeResolver

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_metrics(
    scope: ScopeType = Query(...),
    scope_id: str | None = Query(default=None),
    q3: AnalysisWeeklyTimeSaved = Query(default="more_than_5_hours"),
    q4: WorkOutputChange = Query(default="slightly_more"),
    q5: QualityChange = Query(default="slightly_better"),
    group_by: GroupByField = Query(default="level"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> DashboardMetricsResponse:
    del group_by
    validate_scope_id(scope, scope_id)
    employee_repository = EmployeeRepository(db)
    hierarchy_service = HierarchyService(employee_repository)
    service = MetricsService(
        employee_repository=employee_repository,
        response_repository=SurveyResponseRepository(db, survey_cycle=settings.survey_cycle),
        scope_resolver=ScopeResolver(employee_repository, hierarchy_service),
        metrics_aggregator=MetricsAggregator(),
    )

    try:
        return await service.get_metrics(
            scope_type=scope,
            scope_id=scope_id,
            criteria=Q3Q5Criteria(weekly_time_saved=q3, work_output_change=q4, quality_change=q5),
        )
    except UnknownScopeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def validate_scope_id(scope: ScopeType, scope_id: str | None) -> None:
    if scope == "org" and scope_id is not None:
        raise HTTPException(status_code=422, detail="scope_id must be omitted for org scope")

    if scope in {"manager", "level"} and scope_id is None:
        raise HTTPException(
            status_code=422,
            detail="scope_id is required for manager and level scopes",
        )
