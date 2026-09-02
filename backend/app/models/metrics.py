from typing import Literal

from pydantic import BaseModel, field_validator

from app.models.employee import EmployeeLevel
from app.models.survey_response import QualityChange, WorkOutputChange

ScopeType = Literal["org", "manager", "level"]
# Department lives on the Employee record as display context only — it is not
# a supported dashboard grouping dimension (see docs/ADR.md / CLAUDE.md
# architecture principle 7). Level is the only group_breakdown dimension.
GroupByField = Literal["level"]
AnalysisWeeklyTimeSaved = Literal["no_noticeable_time_saved", "less_than_1_hour", "1_5_hours", "more_than_5_hours"]


class ScopeDescriptor(BaseModel):
    type: ScopeType
    id: str | None
    name: str


class Coverage(BaseModel):
    eligible_employees: int
    respondents: int
    response_rate: float


class Population(BaseModel):
    eligible_employees: int
    respondents: int
    non_respondents: int
    active_ai_users: int


class RateMetric(BaseModel):
    value: float
    count: int
    denominator: int


class AverageMetric(BaseModel):
    value: float
    denominator: int


class HeadlineMetrics(BaseModel):
    ai_adoption_rate: RateMetric
    avg_weekly_hours_saved: AverageMetric
    estimated_weekly_hours_saved: float
    reports_more_output: RateMetric


class DistributionRow(BaseModel):
    code: str
    label: str
    count: int
    pct: int


class QuestionDistribution(BaseModel):
    denominator: int
    rows: list[DistributionRow]

    @property
    def rows_by_code(self) -> dict[str, DistributionRow]:
        return {row.code: row for row in self.rows}


class ValueAreaRow(BaseModel):
    code: str
    label: str
    rank1: int
    rank2: int
    rank3: int
    total: int
    otherTexts: dict[str, int]


class ValueAreaRanking(BaseModel):
    denominator: int
    rows: list[ValueAreaRow]

    @property
    def rows_by_code(self) -> dict[str, ValueAreaRow]:
        return {row.code: row for row in self.rows}


class RankedOptionRow(BaseModel):
    code: str
    label: str
    count: int
    pct: int
    otherTexts: dict[str, int]


class OptionDistribution(BaseModel):
    denominator: int
    rows: list[RankedOptionRow]

    @property
    def rows_by_code(self) -> dict[str, RankedOptionRow]:
        return {row.code: row for row in self.rows}


class Q3Q5Criteria(BaseModel):
    weekly_time_saved: AnalysisWeeklyTimeSaved
    work_output_change: WorkOutputChange
    quality_change: QualityChange

    @field_validator("weekly_time_saved")
    @classmethod
    def reject_not_sure(cls, value: AnalysisWeeklyTimeSaved) -> AnalysisWeeklyTimeSaved:
        if value == "not_sure":
            raise ValueError("not_sure is not valid for Q3-Q5 analysis criteria")
        return value


class Q3Q5Analysis(BaseModel):
    criteria: Q3Q5Criteria
    matching_count: int
    analysis_denominator: int
    matching_rate: float


class TopBarrier(BaseModel):
    code: str
    label: str


class GroupRow(BaseModel):
    key: str
    label: str
    eligible_employees: int
    respondents: int
    adoption_rate: int | None
    more_output_rate: int | None
    avg_hours_saved: float | None
    avg_hours_saved_denominator: int
    frequent_rework_rate: int | None
    top_barrier: TopBarrier | None


class GroupBreakdown(BaseModel):
    group_by: GroupByField
    rows: list[GroupRow]


class DashboardMetricsResponse(BaseModel):
    scope: ScopeDescriptor
    coverage: Coverage
    population: Population
    headline_metrics: HeadlineMetrics
    usage_frequency: QuestionDistribution
    workflow_value: ValueAreaRanking
    weekly_time_saved: QuestionDistribution
    work_output: QuestionDistribution
    work_quality: QuestionDistribution
    ai_rework_frequency: QuestionDistribution
    q3_q5_analysis: Q3Q5Analysis
    benefits: OptionDistribution
    barriers: OptionDistribution
    group_breakdown: GroupBreakdown
