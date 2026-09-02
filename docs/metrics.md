# Metrics

This is the canonical metric source for implementation. Backend aggregation,
frontend formatting, dashboard charts, and tests must follow these definitions.

## Scope Rules

Metrics are calculated for exactly one resolved employee scope:

- `org`: all employees.
- `manager`: the selected manager plus all descendants.
- `level`: all employees at the selected level.

Never average manager percentages upward. Resolve employees first, retrieve
individual responses, compute per-response signals, then aggregate those signals.

## Population Metrics

- `eligible_employees`: number of employees in the resolved scope.
- `respondents`: employees in scope with a submitted response.
- `non_respondents`: `eligible_employees - respondents`.
- `response_rate`: `respondents / eligible_employees`.
- `active_ai_users`: respondents where Q1 is not `never`.
- `ai_adoption_rate`: `active_ai_users / respondents`.

Return counts and denominators with rates.

## Unit Conventions

- `RateMetric.value` fields are fractions from `0` to `1`.
- Distribution `pct` fields are whole percentages from `0` to `100`.
- `group_breakdown` rate fields are whole percentages from `0` to `100`.
- Hour fields are raw estimated hours.
- Counts and denominators are integers.

## Q1. AI Usage Frequency

Display the option distribution as a bar chart with percentages.

```text
option_percentage = option_count / respondents_who_answered_Q1
```

An active AI user is any respondent whose Q1 answer is not `never`.

## Q2. AI Value Area Ranking

Display as a horizontal stacked bar chart.

For each value area, count rank positions separately:

- `rank1`: number of respondents ranking the area first.
- `rank2`: number of respondents ranking the area second.
- `rank3`: number of respondents ranking the area third.
- `total`: `rank1 + rank2 + rank3`.

Use these chart segments:

- Rank 1: dark blue.
- Rank 2: medium blue.
- Rank 3: light blue.

Sort rows dynamically from top to bottom:

```text
total DESC
rank1 DESC
rank2 DESC
rank3 DESC
```

Show `other` as `Other` in the chart. On hover, show submitted `other_text`
details.

## Q3. Weekly Time Saved

Display the option distribution as a bar chart with percentages.

```text
option_percentage = option_count / respondents_who_answered_Q3
```

Estimated hours mapping:

```text
no_noticeable_time_saved = 0
less_than_1_hour = 0.5
1_5_hours = 3
more_than_5_hours = 8
not_sure = excluded
```

Average estimated weekly time saved:

```text
avg_weekly_hours_saved = sum(estimated_hours) / respondents_with_known_Q3_values
```

Total estimated weekly time saved:

```text
estimated_weekly_hours_saved = sum(estimated_hours)
```

`not_sure` is missing data, not zero.

## Q4. Work Output Impact

Display the option distribution as a bar chart with percentages.

```text
option_percentage = option_count / respondents_who_answered_Q4
```

Positive output count:

```text
reports_more_output = count(slightly_more, significantly_more)
```

Positive output rate:

```text
reports_more_output_rate = reports_more_output / respondents_who_answered_Q4
```

## Q5. Work Quality Impact

Display the option distribution as a bar chart with percentages.

```text
option_percentage = option_count / respondents_who_answered_Q5
```

Better quality count:

```text
better_quality = count(slightly_better, much_better)
```

Better quality rate:

```text
better_quality_rate = better_quality / respondents_who_answered_Q5
```

## Q6. AI Rework Frequency

Display the option distribution as a bar chart with percentages.

```text
option_percentage = option_count / respondents_who_answered_Q6
```

Frequent rework count:

```text
frequent_rework = count(often, almost_always)
```

Frequent rework rate:

```text
frequent_rework_rate = frequent_rework / respondents_who_answered_Q6
```

## Dynamic Q3-Q5 Analysis

Leadership can combine one selected value from each of Q3, Q4, and Q5 to find
matching respondents.

Example:

```text
Q3 = more_than_5_hours
AND Q4 = slightly_more
AND Q5 = slightly_better
```

Returned metrics:

- `matching_count`: respondents matching all selected criteria.
- `analysis_denominator`: respondents with valid answers for Q3, Q4, and Q5.
- `matching_rate`: `matching_count / analysis_denominator`.

Exclude Q3 `not_sure` from the denominator.

## Q7. Primary Benefits

Display as a horizontal bar chart sorted by count descending.

```text
benefit_percentage = benefit_count / respondents_who_answered_Q7
```

Show `other` as `Other` in the chart. On hover, show submitted `other_text`
details.

## Q8. Barriers

Display as a horizontal bar chart sorted by count descending.

Q8 is multiple choice, so one respondent may contribute to more than one barrier
count.

```text
barrier_percentage = barrier_count / respondents_who_answered_Q8
```

`no_major_barriers` is mutually exclusive with every other barrier choice. Show
`other` as `Other` in the chart. On hover, show submitted `other_text` details.

## Group Breakdown

The metrics endpoint can return `group_breakdown` rows for dashboard comparison.
Supported values:

- `department`
- `level`

Each group row must be recomputed from the employees and responses in that group,
not derived by averaging child rows.

Required group row fields:

- `key`: stable group key.
- `label`: display label.
- `eligible_employees`: number of employees in the group.
- `respondents`: number of employees in the group with submitted responses.
- `adoption_rate`: `active_ai_users / respondents`, returned as a whole percentage.
- `more_output_rate`: `reports_more_output / respondents_who_answered_Q4`, returned as a whole percentage.
- `avg_hours_saved`: average estimated weekly hours saved for known Q3 values.
- `avg_hours_saved_denominator`: respondents with known Q3 values.
- `frequent_rework_rate`: `frequent_rework / respondents_who_answered_Q6`, returned as a whole percentage.
- `top_barrier`: highest-count Q8 barrier for the group, or `null` when unavailable.

## Missing Data Rule

`not_sure` is missing data, not zero. Exclude it from metrics requiring numeric
values and return the denominator used for each metric.
