from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import Settings, get_settings
from app.db import get_database
from app.models.survey_response import SubmittedEmployeeIds, SurveyResponse, SurveyResponseSubmission
from app.repositories.employees import EmployeeRepository
from app.repositories.survey_responses import SurveyResponseAlreadyExistsError, SurveyResponseRepository

router = APIRouter(tags=["survey responses"])


@router.get("/survey-responses/submitted-employee-ids", response_model=SubmittedEmployeeIds)
async def list_submitted_employee_ids(
    db: AsyncIOMotorDatabase = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> SubmittedEmployeeIds:
    repository = SurveyResponseRepository(db, survey_cycle=settings.survey_cycle)
    return SubmittedEmployeeIds(employee_ids=await repository.submitted_employee_ids())


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
    try:
        stored = await repository.create_response(submission, survey_version=settings.survey_version)
    except SurveyResponseAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="survey response already submitted",
        ) from exc
    response = SurveyResponse.model_validate(stored)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(response),
    )
