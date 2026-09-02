from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

AIUsageFrequency = Literal["never", "few_times_month", "few_times_week", "daily", "multiple_times_day"]
TopValueArea = Literal[
    "planning",
    "research",
    "design",
    "implementation",
    "testing",
    "troubleshooting",
    "review",
    "communication",
    "management",
    "administration",
    "other",
]
WeeklyTimeSaved = Literal["no_noticeable_time_saved", "less_than_1_hour", "1_5_hours", "more_than_5_hours", "not_sure"]
WorkOutputChange = Literal["much_less", "slightly_less", "same", "slightly_more", "significantly_more"]
QualityChange = Literal["much_worse", "slightly_worse", "no_meaningful_change", "slightly_better", "much_better"]
CorrectionFrequency = Literal["almost_never", "rarely", "sometimes", "often", "almost_always"]
BiggestBenefit = Literal[
    "saves_time",
    "reduces_repetitive_work",
    "helps_get_unstuck",
    "improves_work_quality",
    "supports_better_decisions",
    "helps_explore_ideas",
    "helps_learn_faster",
    "other",
]
Barrier = Literal[
    "tool_access",
    "lack_of_training",
    "reliability_concerns",
    "review_effort",
    "security_privacy_concerns",
    "lack_of_internal_context",
    "poor_workflow_fit",
    "no_major_barriers",
    "other",
]

OTHER = "other"
NO_MAJOR_BARRIERS = "no_major_barriers"


class RankedArea(BaseModel):
    model_config = ConfigDict(extra="forbid")

    area: TopValueArea
    rank: int = Field(ge=1, le=3)
    other_text: str | None = None

    @model_validator(mode="after")
    def require_other_text(self) -> "RankedArea":
        if self.area == OTHER and not text_present(self.other_text):
            raise ValueError("other_text is required when area is other")
        return self


class BiggestBenefitSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option: BiggestBenefit
    other_text: str | None = None

    @model_validator(mode="after")
    def require_other_text(self) -> "BiggestBenefitSelection":
        if self.option == OTHER and not text_present(self.other_text):
            raise ValueError("other_text is required when option is other")
        return self


class BarrierSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option: Barrier
    other_text: str | None = None

    @model_validator(mode="after")
    def require_other_text(self) -> "BarrierSelection":
        if self.option == OTHER and not text_present(self.other_text):
            raise ValueError("other_text is required when option is other")
        return self


class SurveyAnswers(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_usage_frequency: AIUsageFrequency
    top_value_areas: list[RankedArea]
    weekly_time_saved: WeeklyTimeSaved
    work_output_change: WorkOutputChange
    quality_change: QualityChange
    correction_frequency: CorrectionFrequency
    biggest_benefit: BiggestBenefitSelection
    barriers: list[BarrierSelection]

    @field_validator("top_value_areas")
    @classmethod
    def validate_top_value_areas(cls, areas: list[RankedArea]) -> list[RankedArea]:
        if len(areas) != 3:
            raise ValueError("top_value_areas must contain exactly 3 ranked areas")
        if len({area.area for area in areas}) != 3:
            raise ValueError("top_value_areas must contain 3 unique areas")
        if {area.rank for area in areas} != {1, 2, 3}:
            raise ValueError("top_value_areas must use ranks 1, 2, and 3")
        return areas

    @field_validator("barriers")
    @classmethod
    def validate_barriers(cls, barriers: list[BarrierSelection]) -> list[BarrierSelection]:
        if not barriers:
            raise ValueError("barriers must contain at least one option")
        options = [barrier.option for barrier in barriers]
        if len(set(options)) != len(options):
            raise ValueError("barriers must not contain duplicate options")
        if NO_MAJOR_BARRIERS in options and len(options) > 1:
            raise ValueError("no_major_barriers is mutually exclusive with every other barrier")
        return barriers


class SurveyResponseSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employee_id: str
    answers: SurveyAnswers


class SurveyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    survey_cycle: str
    survey_version: str
    answers: SurveyAnswers
    submitted_at: datetime


def text_present(value: str | None) -> bool:
    return value is not None and bool(value.strip())
