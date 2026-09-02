from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.employee import Employee
from app.models.metrics import Q3Q5Criteria, ScopeDescriptor
from app.models.survey_response import SurveyResponse
from app.services.metrics import MetricsAggregator, pct


def test_aggregate_population_headlines_and_unit_conventions(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)

    assert metrics.coverage.eligible_employees == 5
    assert metrics.coverage.respondents == 4
    assert metrics.coverage.response_rate == 0.8
    assert metrics.population.non_respondents == 1
    assert metrics.population.active_ai_users == 3
    assert metrics.headline_metrics.ai_adoption_rate.value == 0.75
    assert metrics.headline_metrics.ai_adoption_rate.count == 3
    assert metrics.headline_metrics.ai_adoption_rate.denominator == 4
    assert metrics.headline_metrics.avg_weekly_hours_saved.value == pytest.approx(16 / 3)
    assert metrics.headline_metrics.avg_weekly_hours_saved.denominator == 3
    assert metrics.headline_metrics.estimated_weekly_hours_saved == 16
    assert metrics.headline_metrics.reports_more_output.value == 0.5
    assert metrics.headline_metrics.reports_more_output.count == 2
    assert metrics.headline_metrics.reports_more_output.denominator == 4
    assert 0 <= metrics.headline_metrics.ai_adoption_rate.value <= 1
    assert metrics.usage_frequency.rows_by_code["daily"].pct == 50


def test_aggregate_question_distributions(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)

    assert metrics.usage_frequency.denominator == 4
    assert metrics.usage_frequency.rows_by_code["daily"].count == 2
    assert metrics.usage_frequency.rows_by_code["never"].count == 1
    assert metrics.weekly_time_saved.rows_by_code["more_than_5_hours"].pct == 50
    assert metrics.weekly_time_saved.rows_by_code["not_sure"].pct == 25
    assert metrics.work_output.rows_by_code["slightly_more"].pct == 25
    assert metrics.work_output.rows_by_code["significantly_more"].pct == 25
    assert metrics.work_quality.rows_by_code["slightly_better"].pct == 50
    assert metrics.ai_rework_frequency.rows_by_code["often"].pct == 25
    assert metrics.ai_rework_frequency.rows_by_code["almost_always"].pct == 25


def test_aggregate_value_area_ranking_sort_and_other_text(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)
    rows = metrics.workflow_value.rows

    assert rows[0].code == "implementation"
    assert (rows[0].rank1, rows[0].rank2, rows[0].rank3, rows[0].total) == (2, 1, 1, 4)
    assert rows[1].code == "research"
    assert (rows[1].rank1, rows[1].rank2, rows[1].rank3, rows[1].total) == (1, 2, 0, 3)
    assert rows[2].code == "testing"
    assert (rows[2].rank1, rows[2].rank2, rows[2].rank3, rows[2].total) == (1, 0, 1, 2)
    assert metrics.workflow_value.rows_by_code["other"].otherTexts == {"Documentation automation": 1}


def test_value_area_ranking_sort_uses_rank_tiebreakers(metric_employees):
    responses = [
        response(
            "resp_201",
            "emp_201",
            q1="daily",
            q2=[("planning", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="more_than_5_hours",
            q4="slightly_more",
            q5="slightly_better",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
        response(
            "resp_202",
            "emp_202",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="more_than_5_hours",
            q4="slightly_more",
            q5="slightly_better",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
    ]

    rows = aggregate(metric_employees, responses).workflow_value.rows

    assert rows[0].code == "research"
    assert (rows[0].total, rows[0].rank1, rows[0].rank2, rows[0].rank3) == (2, 0, 2, 0)
    assert rows[1].code == "testing"
    assert (rows[1].total, rows[1].rank1, rows[1].rank2, rows[1].rank3) == (2, 0, 0, 2)


def test_aggregate_dynamic_q3_q5_analysis_excludes_not_sure(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)

    assert metrics.q3_q5_analysis.criteria.weekly_time_saved == "more_than_5_hours"
    assert metrics.q3_q5_analysis.matching_count == 1
    assert metrics.q3_q5_analysis.analysis_denominator == 3
    assert metrics.q3_q5_analysis.matching_rate == pytest.approx(1 / 3)


def test_q3_midpoint_mapping_covers_every_known_band(metric_employees):
    responses = [
        response(
            "resp_201",
            "emp_201",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="no_noticeable_time_saved",
            q4="same",
            q5="no_meaningful_change",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
        response(
            "resp_202",
            "emp_202",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="less_than_1_hour",
            q4="same",
            q5="no_meaningful_change",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
        response(
            "resp_203",
            "emp_203",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="1_5_hours",
            q4="same",
            q5="no_meaningful_change",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
        response(
            "resp_204",
            "emp_204",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="more_than_5_hours",
            q4="same",
            q5="no_meaningful_change",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
    ]

    metrics = aggregate(metric_employees, responses)

    assert metrics.headline_metrics.estimated_weekly_hours_saved == 11.5
    assert metrics.headline_metrics.avg_weekly_hours_saved.value == pytest.approx(11.5 / 4)
    assert metrics.headline_metrics.avg_weekly_hours_saved.denominator == 4


def test_aggregate_benefits_and_barriers(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)

    assert metrics.benefits.denominator == 4
    assert metrics.benefits.rows[0].code == "saves_time"
    assert metrics.benefits.rows_by_code["saves_time"].count == 2
    assert metrics.benefits.rows_by_code["other"].otherTexts == {"Mentoring drafts": 1}
    assert metrics.barriers.denominator == 4
    assert metrics.barriers.rows_by_code["lack_of_training"].count == 2
    assert metrics.barriers.rows_by_code["lack_of_training"].pct == 50
    assert metrics.barriers.rows_by_code["no_major_barriers"].count == 1
    assert metrics.barriers.rows_by_code["other"].otherTexts == {"Data residency": 1}


def test_aggregate_group_breakdown_recomputes_group_metrics(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses)
    rows = {row.key: row for row in metrics.group_breakdown.rows}

    assert metrics.group_breakdown.group_by == "department"
    assert rows["Engineering"].eligible_employees == 3
    assert rows["Engineering"].respondents == 3
    assert rows["Engineering"].adoption_rate == 67
    assert rows["Engineering"].more_output_rate == 67
    assert rows["Engineering"].avg_hours_saved == 8
    assert rows["Engineering"].avg_hours_saved_denominator == 2
    assert rows["Engineering"].frequent_rework_rate == 33
    assert rows["Engineering"].top_barrier is not None
    assert rows["Engineering"].top_barrier.model_dump() == {"code": "lack_of_training", "label": "Lack of training"}
    assert rows["Product"].eligible_employees == 2
    assert rows["Product"].respondents == 1
    assert rows["Product"].adoption_rate == 100
    assert rows["Product"].more_output_rate == 0
    assert rows["Product"].avg_hours_saved == 0
    assert rows["Product"].avg_hours_saved_denominator == 1
    assert rows["Product"].frequent_rework_rate == 100
    assert rows["Product"].top_barrier is not None
    assert rows["Product"].top_barrier.model_dump() == {"code": "other", "label": "Other"}


def test_group_breakdown_group_without_respondents_returns_null_rates(metric_employees, metric_responses):
    employees = [
        *metric_employees,
        Employee(id="emp_206", name="No Response", department="HR", level="ic", manager_id=None),
    ]

    metrics = aggregate(employees, metric_responses)
    rows = {row.key: row for row in metrics.group_breakdown.rows}

    assert rows["HR"].eligible_employees == 1
    assert rows["HR"].respondents == 0
    assert rows["HR"].adoption_rate is None
    assert rows["HR"].more_output_rate is None
    assert rows["HR"].avg_hours_saved is None
    assert rows["HR"].avg_hours_saved_denominator == 0
    assert rows["HR"].frequent_rework_rate is None
    assert rows["HR"].top_barrier is None


def test_aggregate_level_group_breakdown_uses_level_labels(metric_employees, metric_responses):
    metrics = aggregate(metric_employees, metric_responses, group_by="level")
    rows = {row.key: row for row in metrics.group_breakdown.rows}

    assert list(rows) == ["manager", "ic"]
    assert rows["manager"].label == "Manager"
    assert rows["manager"].eligible_employees == 1
    assert rows["manager"].respondents == 1
    assert rows["ic"].label == "IC"
    assert rows["ic"].eligible_employees == 4
    assert rows["ic"].respondents == 3


def test_aggregate_empty_scope_returns_zero_and_null_metrics():
    metrics = aggregate([], [])

    assert metrics.coverage.response_rate == 0
    assert metrics.headline_metrics.ai_adoption_rate.value == 0
    assert metrics.headline_metrics.avg_weekly_hours_saved.value == 0
    assert metrics.headline_metrics.reports_more_output.value == 0
    assert metrics.usage_frequency.denominator == 0
    assert metrics.group_breakdown.rows == []


def test_aggregate_ignores_responses_outside_resolved_employee_scope(metric_employees, metric_responses):
    out_of_scope_response = response(
        "resp_999",
        "emp_999",
        q1="multiple_times_day",
        q2=[("management", 1, None), ("administration", 2, None), ("planning", 3, None)],
        q3="more_than_5_hours",
        q4="significantly_more",
        q5="much_better",
        q6="almost_never",
        q7=("helps_learn_faster", None),
        q8=[("poor_workflow_fit", None)],
    )

    metrics = aggregate(metric_employees, [*metric_responses, out_of_scope_response])

    assert metrics.coverage.respondents == 4
    assert metrics.population.active_ai_users == 3
    assert metrics.headline_metrics.estimated_weekly_hours_saved == 16
    assert metrics.usage_frequency.rows_by_code["multiple_times_day"].count == 0


def test_metrics_response_serialization_does_not_include_test_lookup_helpers(metric_employees, metric_responses):
    dumped = aggregate(metric_employees, metric_responses).model_dump()

    assert "rows_by_code" not in dumped["usage_frequency"]
    assert "rows_by_code" not in dumped["workflow_value"]
    assert "rows_by_code" not in dumped["benefits"]
    assert "rows_by_code" not in dumped["barriers"]


def test_q3_q5_criteria_rejects_not_sure_weekly_time_saved():
    with pytest.raises(ValidationError, match="not_sure"):
        Q3Q5Criteria(
            weekly_time_saved="not_sure",
            work_output_change="slightly_more",
            quality_change="slightly_better",
        )


def test_percentage_rounding_uses_half_up_ui_convention():
    assert pct(1, 8) == 13


def aggregate(employees, responses, group_by="department"):
    return MetricsAggregator().aggregate(
        scope=ScopeDescriptor(type="org", id=None, name="Organization"),
        employees=employees,
        responses=responses,
        group_by=group_by,
        criteria=Q3Q5Criteria(
            weekly_time_saved="more_than_5_hours",
            work_output_change="slightly_more",
            quality_change="slightly_better",
        ),
    )


@pytest.fixture
def metric_employees() -> list[Employee]:
    return [
        Employee(id="emp_201", name="Maya Singh", department="Engineering", level="manager", manager_id=None),
        Employee(id="emp_202", name="Theo Grant", department="Engineering", level="ic", manager_id="emp_201"),
        Employee(id="emp_203", name="Lina Park", department="Engineering", level="ic", manager_id="emp_201"),
        Employee(id="emp_204", name="Iris Chen", department="Product", level="ic", manager_id=None),
        Employee(id="emp_205", name="Jon Bell", department="Product", level="ic", manager_id=None),
    ]


@pytest.fixture
def metric_responses() -> list[SurveyResponse]:
    return [
        response(
            "resp_201",
            "emp_201",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("testing", 3, None)],
            q3="more_than_5_hours",
            q4="slightly_more",
            q5="slightly_better",
            q6="sometimes",
            q7=("saves_time", None),
            q8=[("lack_of_training", None), ("review_effort", None)],
        ),
        response(
            "resp_202",
            "emp_202",
            q1="never",
            q2=[("research", 1, None), ("implementation", 2, None), ("other", 3, "Documentation automation")],
            q3="not_sure",
            q4="same",
            q5="no_meaningful_change",
            q6="rarely",
            q7=("other", "Mentoring drafts"),
            q8=[("no_major_barriers", None)],
        ),
        response(
            "resp_203",
            "emp_203",
            q1="daily",
            q2=[("implementation", 1, None), ("research", 2, None), ("communication", 3, None)],
            q3="more_than_5_hours",
            q4="significantly_more",
            q5="slightly_better",
            q6="often",
            q7=("saves_time", None),
            q8=[("lack_of_training", None)],
        ),
        response(
            "resp_204",
            "emp_204",
            q1="few_times_week",
            q2=[("testing", 1, None), ("implementation", 3, None), ("communication", 2, None)],
            q3="no_noticeable_time_saved",
            q4="slightly_less",
            q5="slightly_worse",
            q6="almost_always",
            q7=("helps_get_unstuck", None),
            q8=[("other", "Data residency")],
        ),
    ]


def response(response_id, employee_id, *, q1, q2, q3, q4, q5, q6, q7, q8) -> SurveyResponse:
    return SurveyResponse.model_validate(
        {
            "id": response_id,
            "employee_id": employee_id,
            "survey_cycle": "2026-h2",
            "survey_version": "1.0",
            "submitted_at": datetime(2026, 9, 1, tzinfo=UTC),
            "answers": {
                "ai_usage_frequency": q1,
                "top_value_areas": [{"area": area, "rank": rank, "other_text": other_text} for area, rank, other_text in q2],
                "weekly_time_saved": q3,
                "work_output_change": q4,
                "quality_change": q5,
                "correction_frequency": q6,
                "biggest_benefit": {"option": q7[0], "other_text": q7[1]},
                "barriers": [{"option": option, "other_text": other_text} for option, other_text in q8],
            },
        }
    )
