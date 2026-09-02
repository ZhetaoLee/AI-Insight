from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Settings, get_settings
from app.db import get_database
from app.models.survey_response import SurveyResponse, SurveyResponseSubmission
from app.repositories.employees import EmployeeRepository
from app.repositories.survey_responses import SurveyResponseRepository

router = APIRouter(tags=["survey responses"])


@router.post("/survey-responses", response_model=SurveyResponse)
async def submit_survey_response(
    submission: SurveyResponseSubmission,
    db: AsyncIOMotorDatabase = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    employee_repository = EmployeeRepository(db)
    if not await employee_repository.exists(submission.employee_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="employee not found")

    repository = SurveyResponseRepository(db, survey_cycle=settings.survey_cycle)
    stored, created = await repository.upsert_response(submission, survey_version=settings.survey_version)
    response = SurveyResponse.model_validate(stored)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        content=jsonable_encoder(response),
    )
