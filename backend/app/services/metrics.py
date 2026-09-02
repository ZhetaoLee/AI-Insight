from collections.abc import Callable, Sequence

from app.models.employee import Employee
from app.models.metrics import (
    AverageMetric,
    Coverage,
    DashboardMetricsResponse,
    DistributionRow,
    GroupBreakdown,
    GroupRow,
    HeadlineMetrics,
    OptionDistribution,
    Population,
    Q3Q5Analysis,
    Q3Q5Criteria,
    QuestionDistribution,
    RankedOptionRow,
    RateMetric,
    ScopeDescriptor,
    TopBarrier,
    ValueAreaRanking,
    ValueAreaRow,
)
from app.models.survey_response import NO_MAJOR_BARRIERS, OTHER, SurveyResponse

Option = tuple[str, str]
Selection = tuple[str, str | None]
Respondent = tuple[Employee, SurveyResponse]

LEVEL_LABELS = {
    "senior_director": "Senior Director",
    "director": "Director",
    "manager": "Manager",
    "ic": "IC",
}
AI_USAGE_FREQUENCY: tuple[Option, ...] = (
    ("never", "Never"),
    ("few_times_month", "A few times per month"),
    ("few_times_week", "A few times per week"),
    ("daily", "Daily"),
    ("multiple_times_day", "Multiple times per day"),
)
TOP_VALUE_AREAS: tuple[Option, ...] = (
    ("planning", "Planning"),
    ("research", "Research"),
    ("design", "Design"),
    ("implementation", "Implementation"),
    ("testing", "Testing"),
    ("troubleshooting", "Troubleshooting"),
    ("review", "Review"),
    ("communication", "Communication"),
    ("management", "Management"),
    ("administration", "Administration"),
    (OTHER, "Other"),
)
WEEKLY_TIME_SAVED: tuple[Option, ...] = (
    ("no_noticeable_time_saved", "No noticeable time saved"),
    ("less_than_1_hour", "Less than 1 hour"),
    ("1_5_hours", "1-5 hours"),
    ("more_than_5_hours", "More than 5 hours"),
    ("not_sure", "Not sure"),
)
WORK_OUTPUT_CHANGE: tuple[Option, ...] = (
    ("much_less", "Much less"),
    ("slightly_less", "Slightly less"),
    ("same", "Same"),
    ("slightly_more", "Slightly more"),
    ("significantly_more", "Significantly more"),
)
QUALITY_CHANGE: tuple[Option, ...] = (
    ("much_worse", "Much worse"),
    ("slightly_worse", "Slightly worse"),
    ("no_meaningful_change", "No meaningful change"),
    ("slightly_better", "Slightly better"),
    ("much_better", "Much better"),
)
CORRECTION_FREQUENCY: tuple[Option, ...] = (
    ("almost_never", "Almost never"),
    ("rarely", "Rarely"),
    ("sometimes", "Sometimes"),
    ("often", "Often"),
    ("almost_always", "Almost always"),
)
BIGGEST_BENEFIT: tuple[Option, ...] = (
    ("saves_time", "Saves time"),
    ("reduces_repetitive_work", "Reduces repetitive work"),
    ("helps_get_unstuck", "Helps me get unstuck"),
    ("improves_work_quality", "Improves work quality"),
    ("supports_better_decisions", "Supports better decisions"),
    ("helps_explore_ideas", "Helps explore ideas"),
    ("helps_learn_faster", "Helps me learn faster"),
    (OTHER, "Other"),
)
BARRIERS: tuple[Option, ...] = (
    ("tool_access", "Tool access"),
    ("lack_of_training", "Lack of training"),
    ("reliability_concerns", "Reliability concerns"),
    ("review_effort", "Review effort"),
    ("security_privacy_concerns", "Security and privacy concerns"),
    ("lack_of_internal_context", "Lack of internal context"),
    ("poor_workflow_fit", "Poor workflow fit"),
    (NO_MAJOR_BARRIERS, "No major barriers"),
    (OTHER, "Other"),
)
HOURS_BY_Q3 = {
    "no_noticeable_time_saved": 0.0,
    "less_than_1_hour": 0.5,
    "1_5_hours": 3.0,
    "more_than_5_hours": 8.0,
}
MORE_OUTPUT_CODES = {"slightly_more", "significantly_more"}
FREQUENT_REWORK_CODES = {"often", "almost_always"}
LEVEL_ORDER = ("senior_director", "director", "manager", "ic")


class MetricsAggregator:
    def aggregate(
        self,
        *,
        scope: ScopeDescriptor,
        employees: Sequence[Employee],
        responses: Sequence[SurveyResponse],
        criteria: Q3Q5Criteria,
    ) -> DashboardMetricsResponse:
        respondents = self._respondents(employees, responses)
        active = [response for _, response in respondents if response.answers.ai_usage_frequency != "never"]
        hours = known_hours(respondents)
        more_output = [response for _, response in respondents if response.answers.work_output_change in MORE_OUTPUT_CODES]
        total_hours = sum(hours)

        return DashboardMetricsResponse(
            scope=scope,
            coverage=Coverage(
                eligible_employees=len(employees),
                respondents=len(respondents),
                response_rate=fraction(len(respondents), len(employees)),
            ),
            population=Population(
                eligible_employees=len(employees),
                respondents=len(respondents),
                non_respondents=len(employees) - len(respondents),
                active_ai_users=len(active),
            ),
            headline_metrics=HeadlineMetrics(
                ai_adoption_rate=RateMetric(value=fraction(len(active), len(respondents)), count=len(active), denominator=len(respondents)),
                avg_weekly_hours_saved=AverageMetric(value=average(hours), denominator=len(hours)),
                estimated_weekly_hours_saved=total_hours,
                reports_more_output=RateMetric(value=fraction(len(more_output), len(respondents)), count=len(more_output), denominator=len(respondents)),
            ),
            usage_frequency=self._option_distribution(
                respondents,
                AI_USAGE_FREQUENCY,
                lambda response: response.answers.ai_usage_frequency,
            ),
            workflow_value=self._value_area_ranking(respondents),
            weekly_time_saved=self._option_distribution(
                respondents,
                WEEKLY_TIME_SAVED,
                lambda response: response.answers.weekly_time_saved,
            ),
            work_output=self._option_distribution(
                respondents,
                WORK_OUTPUT_CHANGE,
                lambda response: response.answers.work_output_change,
            ),
            work_quality=self._option_distribution(
                respondents,
                QUALITY_CHANGE,
                lambda response: response.answers.quality_change,
            ),
            ai_rework_frequency=self._option_distribution(
                respondents,
                CORRECTION_FREQUENCY,
                lambda response: response.answers.correction_frequency,
            ),
            q3_q5_analysis=self._q3_q5_analysis(respondents, criteria),
            benefits=self._selection_distribution(
                respondents,
                BIGGEST_BENEFIT,
                lambda response: [(response.answers.biggest_benefit.option, response.answers.biggest_benefit.other_text)],
            ),
            barriers=self._selection_distribution(
                respondents,
                BARRIERS,
                lambda response: [(barrier.option, barrier.other_text) for barrier in response.answers.barriers],
            ),
            group_breakdown=self._group_breakdown(employees, responses),
        )

    def _respondents(
        self,
        employees: Sequence[Employee],
        responses: Sequence[SurveyResponse],
    ) -> list[Respondent]:
        responses_by_employee_id = {response.employee_id: response for response in responses}
        return [(employee, responses_by_employee_id[employee.id]) for employee in employees if employee.id in responses_by_employee_id]

    def _option_distribution(
        self,
        respondents: Sequence[Respondent],
        options: Sequence[Option],
        answer_code: Callable[[SurveyResponse], str],
    ) -> QuestionDistribution:
        counts = {code: 0 for code, _ in options}
        for _, response in respondents:
            counts[answer_code(response)] += 1
        rows = [DistributionRow(code=code, label=label, count=counts[code], pct=pct(counts[code], len(respondents))) for code, label in options]
        return QuestionDistribution(denominator=len(respondents), rows=rows)

    def _selection_distribution(
        self,
        respondents: Sequence[Respondent],
        options: Sequence[Option],
        selections: Callable[[SurveyResponse], Sequence[Selection]],
    ) -> OptionDistribution:
        counts = {code: 0 for code, _ in options}
        other_texts: dict[str, dict[str, int]] = {}
        for _, response in respondents:
            for code, other_text in selections(response):
                counts[code] += 1
                add_other_text(other_texts.setdefault(code, {}), code, other_text)

        rows = [
            RankedOptionRow(
                code=code,
                label=label,
                count=counts[code],
                pct=pct(counts[code], len(respondents)),
                otherTexts=other_texts.get(code, {}),
            )
            for code, label in options
        ]
        rows.sort(key=lambda row: row.count, reverse=True)
        return OptionDistribution(denominator=len(respondents), rows=rows)

    def _value_area_ranking(self, respondents: Sequence[Respondent]) -> ValueAreaRanking:
        counts = {code: {"rank1": 0, "rank2": 0, "rank3": 0, "otherTexts": {}} for code, _ in TOP_VALUE_AREAS}
        for _, response in respondents:
            for area in response.answers.top_value_areas:
                area_counts = counts[area.area]
                area_counts[f"rank{area.rank}"] += 1
                add_other_text(area_counts["otherTexts"], area.area, area.other_text)

        rows = [
            ValueAreaRow(
                code=code,
                label=label,
                rank1=area_counts["rank1"],
                rank2=area_counts["rank2"],
                rank3=area_counts["rank3"],
                total=area_counts["rank1"] + area_counts["rank2"] + area_counts["rank3"],
                otherTexts=area_counts["otherTexts"],
            )
            for code, label in TOP_VALUE_AREAS
            for area_counts in [counts[code]]
        ]
        rows.sort(key=lambda row: (row.total, row.rank1, row.rank2, row.rank3), reverse=True)
        return ValueAreaRanking(denominator=len(respondents), rows=rows)

    def _q3_q5_analysis(
        self,
        respondents: Sequence[Respondent],
        criteria: Q3Q5Criteria,
    ) -> Q3Q5Analysis:
        valid = [response for _, response in respondents if estimated_hours(response) is not None]
        matching = [
            response
            for response in valid
            if response.answers.weekly_time_saved == criteria.weekly_time_saved
            and response.answers.work_output_change == criteria.work_output_change
            and response.answers.quality_change == criteria.quality_change
        ]
        return Q3Q5Analysis(
            criteria=criteria,
            matching_count=len(matching),
            analysis_denominator=len(valid),
            matching_rate=fraction(len(matching), len(valid)),
        )

    def _group_breakdown(
        self,
        employees: Sequence[Employee],
        responses: Sequence[SurveyResponse],
    ) -> GroupBreakdown:
        rows: list[GroupRow] = []

        for key in LEVEL_ORDER:
            members = [employee for employee in employees if employee.level == key]
            if not members:
                continue
            respondents = self._respondents(members, responses)
            active = [response for _, response in respondents if response.answers.ai_usage_frequency != "never"]
            more_output = [response for _, response in respondents if response.answers.work_output_change in MORE_OUTPUT_CODES]
            hours = known_hours(respondents)
            frequent_rework = [response for _, response in respondents if response.answers.correction_frequency in FREQUENT_REWORK_CODES]

            rows.append(
                GroupRow(
                    key=key,
                    label=LEVEL_LABELS[key],
                    eligible_employees=len(members),
                    respondents=len(respondents),
                    adoption_rate=pct_or_none(len(active), len(respondents)),
                    more_output_rate=pct_or_none(len(more_output), len(respondents)),
                    avg_hours_saved=average_or_none(hours),
                    avg_hours_saved_denominator=len(hours),
                    frequent_rework_rate=pct_or_none(len(frequent_rework), len(respondents)),
                    top_barrier=self._top_barrier(respondents),
                )
            )

        rows.sort(key=lambda row: row.adoption_rate if row.adoption_rate is not None else -1, reverse=True)
        return GroupBreakdown(group_by="level", rows=rows)

    def _top_barrier(self, respondents: Sequence[Respondent]) -> TopBarrier | None:
        counts: dict[str, int] = {}
        for _, response in respondents:
            for barrier in response.answers.barriers:
                if barrier.option == NO_MAJOR_BARRIERS:
                    continue
                counts[barrier.option] = counts.get(barrier.option, 0) + 1

        if not counts:
            return None

        code = max(counts, key=counts.get)
        return TopBarrier(code=code, label=label_for(BARRIERS, code))


def pct(numerator: int, denominator: int) -> int:
    return int((numerator / denominator) * 100 + 0.5) if denominator else 0


def pct_or_none(numerator: int, denominator: int) -> int | None:
    return pct(numerator, denominator) if denominator else None


def fraction(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0


def average(values: Sequence[float]) -> float:
    return sum(values) / len(values) if values else 0


def average_or_none(values: Sequence[float]) -> float | None:
    return average(values) if values else None


def label_for(options: Sequence[Option], code: str) -> str:
    return next((label for option_code, label in options if option_code == code), code)


def add_other_text(bucket: dict[str, int], code: str, text: str | None) -> None:
    if code != OTHER or not text:
        return
    bucket[text] = bucket.get(text, 0) + 1


def estimated_hours(response: SurveyResponse) -> float | None:
    return HOURS_BY_Q3.get(response.answers.weekly_time_saved)


def known_hours(respondents: Sequence[Respondent]) -> list[float]:
    return [hours for _, response in respondents if (hours := estimated_hours(response)) is not None]
