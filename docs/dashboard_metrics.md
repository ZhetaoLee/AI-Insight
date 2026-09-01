# Dashboard Metrics Logic

## Scope Resolution

Metrics are defined for one employee scope at a time:

- `org`: all seeded employees.
- `manager`: selected manager plus all descendants.
- `level`: all employees at the selected level.

Never average manager percentages upward. Resolve employees first, read individual responses, derive individual signals, then aggregate.

## Population Metrics

- `eligible_employees`: count of employees in resolved scope.
- `respondents`: employees in scope with submitted responses.
- `non_respondents`: `eligible_employees - respondents`.
- `response_rate`: `respondents / eligible_employees`.
- `active_ai_users`: respondents where Q1 is not `never`.
- `ai_adoption_rate`: `active_ai_users / respondents`.

Return counts and denominators with rates.

## Q2. AI Value Area Ranking

For each value area, count rank positions separately:

- `rank1`: number of respondents ranking the area first.
- `rank2`: number of respondents ranking the area second.
- `rank3`: number of respondents ranking the area third.
- `total`: `rank1 + rank2 + rank3`.

Sort rows by:

```text
total DESC
rank1 DESC
rank2 DESC
rank3 DESC
```

Chart rule: horizontal stacked bars. Use dark blue for rank 1, medium blue for rank 2, and light blue for rank 3. Show `Other` as one row; show submitted `other_text` values on hover.

## Q3. Weekly Time Saved

Distribution:

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

Average:

```text
avg_weekly_hours_saved = sum(estimated_hours) / respondents_with_known_Q3_values
```

Total:

```text
estimated_weekly_hours_saved = sum(estimated_hours)
```

`not_sure` is missing data, not zero.

## Q4. Work Output Impact

Distribution:

```text
option_percentage = option_count / respondents_who_answered_Q4
```

Positive output count:

```text
reports_more_output = count(slightly_more, significantly_more)
```

Rate:

```text
reports_more_output_rate = reports_more_output / respondents_who_answered_Q4
```

## Q5. Work Quality Impact

Distribution:

```text
option_percentage = option_count / respondents_who_answered_Q5
```

Better quality count:

```text
better_quality = count(slightly_better, much_better)
```

## Q6. AI Rework Frequency

Distribution:

```text
option_percentage = option_count / respondents_who_answered_Q6
```

Frequent rework count:

```text
frequent_rework = count(often, almost_always)
```

## Dynamic Q3-Q5 Analysis

Leadership can combine one selected value from Q3, Q4, and Q5.

Example:

```text
Q3 = more_than_5_hours
AND Q4 = slightly_more
AND Q5 = slightly_better
```

Returned values:

- `matching_count`: respondents matching all selected criteria.
- `analysis_denominator`: respondents with valid answers for Q3, Q4, and Q5.
- `matching_rate`: `matching_count / analysis_denominator`.

Exclude Q3 `not_sure` from the denominator.

## Q7. Primary Benefits

Distribution:

```text
benefit_percentage = benefit_count / respondents_who_answered_Q7
```

Chart rule: horizontal bars sorted by count descending. Show `Other` as one row; show submitted `other_text` values on hover.

## Q8. Barriers

Q8 is multiple choice. One respondent may contribute to multiple barrier counts.

Distribution:

```text
barrier_percentage = barrier_count / respondents_who_answered_Q8
```

Chart rule: horizontal bars sorted by count descending. `no_major_barriers` is mutually exclusive with all other barrier choices. Show `Other` as one row; show submitted `other_text` values on hover.
