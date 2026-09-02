# Remove "average weekly time saved" (and its hour-midpoint estimate) — keep only the Weekly Time Saved bar chart

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the dashboard derives an "average/estimated weekly hours saved" number by mapping each Q3 answer bucket to an arbitrary midpoint hour value and averaging those — remove that estimate everywhere it appears, keeping only the Q3 "Weekly time saved" percentage-distribution bar chart, which doesn't depend on the midpoint estimate at all.

## Details

### What happens vs. what's expected

Confirmed: the midpoint-derived average shows up in five places today, all of it downstream of one lookup table, `HOURS_BY_Q3` (`backend/app/services/metrics.py:105-110`):

```python
HOURS_BY_Q3 = {
    "no_noticeable_time_saved": 0.0,
    "less_than_1_hour": 0.5,
    "1_5_hours": 3.0,
    "more_than_5_hours": 8.0,
}
```

This produces two headline numbers (`avg_weekly_hours_saved`, `estimated_weekly_hours_saved` in `HeadlineMetrics`) and a per-level-group number (`avg_hours_saved`/`avg_hours_saved_denominator` in `GroupRow`) — both are exactly the kind of estimate the report calls "not accurate": a survey respondent picking "1-5 hours" is silently converted to exactly "3.0 hours" and averaged as if it were a precise measurement.

Where it's surfaced in the UI:
- `frontend/src/components/dashboard/AdoptionChart.tsx:15` — hover-hint text ends with `"... {avg_hours_saved} h avg saved"`.
- `frontend/src/components/dashboard/AdoptionSidePanel.tsx:66-68` — leaderboard row meta text: `"{respondents} / {eligible} responses · {avg_hours_saved} h avg saved"`.
- `frontend/src/components/dashboard/RecordsTable.tsx:10,17,31,100` — a whole sortable "Avg hrs saved" column.
- `frontend/src/components/dashboard/DistributionPanels.tsx:85` — the **"Weekly time saved" panel's own footer** (the chart the report says to keep) currently reads: `"Midpoints 0 / 0.5 / 3 / 8 hours. 'Not sure' is missing data, excluded from the {avg_weekly_hours_saved.denominator}-response average."` — this needs rewording once the average is gone, since the bar chart above it is unaffected but its footnote currently references the very thing being removed.
- (Already confirmed separately: `HeroCards.tsx` no longer has an "Avg weekly time saved" card — that was replaced with Employees/Respondents/Active AI Users in an earlier, already-fixed bug, so no change needed there.)

### The Weekly Time Saved bar chart itself is independent and doesn't need to change

`docs/metrics.md`'s Q3 formula is just `option_percentage = option_count / respondents_who_answered_Q3` — a plain distribution of how many respondents picked each bucket. It never touches `HOURS_BY_Q3`. `metrics.weekly_time_saved.rows` (the data the bar chart renders) comes from a separate code path (`self._option_distribution(...)` in `backend/app/services/metrics.py`) that has nothing to do with the hours lookup. So "keep the Weekly Time Saved bar chart" and "remove the average hours estimate" are cleanly separable — confirmed there's no shared computation to untangle, only the footer text noted above.

### A hidden dependency that would break if `HOURS_BY_Q3` is just deleted outright

`backend/app/services/metrics.py:265`, inside `_q3_q5_analysis` (the Dynamic Q3-Q5 analysis feature — a different, still-wanted feature):

```python
valid = [response for _, response in respondents if estimated_hours(response) is not None]
```

This reuses `estimated_hours()` (which wraps `HOURS_BY_Q3.get(...)`) purely as a "does this response have a real Q3 answer, i.e. not `not_sure`" check — it's not actually using the hour value here, just exploiting that `HOURS_BY_Q3` has no entry for `"not_sure"`. If `HOURS_BY_Q3`/`estimated_hours` are deleted, this line needs to become a direct check instead, e.g. `response.answers.weekly_time_saved != "not_sure"` — otherwise the Q3-Q5 analysis denominator breaks along with the average.

### This is a documented requirement, not just leftover code — removing it is a real spec change

- `docs/PRD.md` §11 "Estimated Weekly Time Saved" (lines 446-486) is an entire section dedicated to this metric (the midpoint mapping, "Average Weekly Time Saved" formula, "Estimated Organizational Capacity Created" formula, and a worked example).
- `docs/PRD.md:1343` — formal, numbered Acceptance Criterion 12: **"Weekly time saved uses the Q3 midpoint mapping in `docs/metrics.md`."** This would need to be revised or removed, not just the code.
- `docs/PRD.md:609` (§13.5) — "Display Q3 as a bar chart with percentages. Also display average estimated weekly time saved using the midpoint mapping..." — the first half (bar chart) stays true, the second half doesn't.
- `docs/PRD.md:822` (§20.2 Denominators) — lists "Average weekly time saved → respondents whose Q3 is not 'Not sure'" as one bullet in a general denominators example.
- `docs/PRD.md:1072-1076,1150-1151` — the example `/api/metrics` response includes `avg_weekly_hours_saved`, `estimated_weekly_hours_saved`, and per-group `avg_hours_saved`/`avg_hours_saved_denominator`.
- `docs/ADR.md:619-635` (Decision 11 "Use Transparent Metric Definitions") — one of three illustrative formulas is `Average Estimated Weekly Time Saved = sum(estimated_hours) / respondents_with_known_Q3_values`; the decision itself (favor transparent formulas over opaque scores) stays valid, just needs a different example or one fewer.
- `docs/metrics.md:83-105` (Q3 section) — "Estimated hours mapping," "Average estimated weekly time saved," and "Total estimated weekly time saved" subsections would be removed, leaving just the option-percentage formula (which is what the bar chart uses).
- `docs/metrics.md:213-233` (Group Breakdown) — `avg_hours_saved`/`avg_hours_saved_denominator` listed as required `GroupRow` fields; would be removed from that list.
- `docs/metrics.md:33` — "Hour fields are raw estimated hours" (Unit Conventions) becomes stale once no hour fields remain.

### Tests that assert the current behavior

`backend/tests/test_metrics_api.py:135-136` and `backend/tests/test_metrics_aggregator.py:23-25,160-162,188-189,197-198,217-218,241,265` — 16 assertions total across these two files directly check `avg_weekly_hours_saved`, `estimated_weekly_hours_saved`, `avg_hours_saved`, or `avg_hours_saved_denominator`. All would need removing or rewriting once those fields no longer exist. No frontend test (`frontend/tests/`, `frontend/e2e/`) references any of this — confirmed via search, nothing there to update.

## Notes

**Files that would need to change:**

Backend:
1. `backend/app/models/metrics.py` — remove `avg_weekly_hours_saved` and `estimated_weekly_hours_saved` from `HeadlineMetrics`; remove `avg_hours_saved`/`avg_hours_saved_denominator` from `GroupRow`; `AverageMetric` becomes unused and removable too (confirmed via search it's used nowhere else).
2. `backend/app/services/metrics.py` — remove `HOURS_BY_Q3`, `estimated_hours()`, `known_hours()`, `average()`, `average_or_none()` (confirmed all four helpers are used only for this metric); update the two call sites that build `HeadlineMetrics`/`GroupRow` accordingly; fix `_q3_q5_analysis`'s `valid` filter (line 265) to check `weekly_time_saved != "not_sure"` directly instead of via the soon-to-be-removed `estimated_hours()`.
3. `backend/tests/test_metrics_api.py`, `backend/tests/test_metrics_aggregator.py` — remove/update the 16 assertions listed above.

Frontend:
4. `frontend/src/types/metrics.ts` — remove `avg_weekly_hours_saved`/`estimated_weekly_hours_saved` from `HeadlineMetrics`, `avg_hours_saved`/`avg_hours_saved_denominator` from `GroupRow`.
5. `frontend/src/components/dashboard/AdoptionChart.tsx` — drop the "avg saved" clause from the hover-hint text.
6. `frontend/src/components/dashboard/AdoptionSidePanel.tsx` — drop the "avg saved" clause from the leaderboard row meta text.
7. `frontend/src/components/dashboard/RecordsTable.tsx` — remove the "Avg hrs saved" column entirely (header, sort key, cell).
8. `frontend/src/components/dashboard/DistributionPanels.tsx` — reword the "Weekly time saved" panel's footer text so it no longer cites midpoints or an average that no longer exists, while keeping the bar chart itself unchanged.

Docs:
9. `docs/PRD.md` — remove or substantially rewrite §11 "Estimated Weekly Time Saved" (lines 446-486); revise Acceptance Criterion 12 (line 1343); trim §13.5 (line 609) to just the bar-chart sentence; drop the "Average weekly time saved" bullet from §20.2 (line 822); remove the average/estimated fields from the example `/api/metrics` response (lines 1072-1076, 1150-1151).
10. `docs/ADR.md` — drop or replace the "Average Estimated Weekly Time Saved" formula in Decision 11's example (lines 630-631).
11. `docs/metrics.md` — remove the "Estimated hours mapping," "Average estimated weekly time saved," and "Total estimated weekly time saved" subsections from Q3 (lines 83-105), keeping only the percentage-distribution formula; drop `avg_hours_saved`/`avg_hours_saved_denominator` from the Group Breakdown required-fields list (lines 230-231); revisit the "Hour fields are raw estimated hours" line in Unit Conventions (line 33).

One thing worth deciding explicitly during implementation: `docs/PRD.md` §11 is a numbered top-level section — removing it outright shifts every subsequent section number (§12 onward) unless the doc is renumbered throughout or the section is left as an intentional gap/marked removed instead of deleted.

## Fix

Removed the midpoint-derived weekly-hours estimate from the product contract and implementation while preserving the Q3 weekly-time-saved distribution:

- `backend/app/models/metrics.py`: removed `AverageMetric`, `headline_metrics.avg_weekly_hours_saved`, `headline_metrics.estimated_weekly_hours_saved`, `group_breakdown.rows[].avg_hours_saved`, and `group_breakdown.rows[].avg_hours_saved_denominator`.
- `backend/app/services/metrics.py`: removed the Q3 hour midpoint lookup and average helpers; Q3-Q5 analysis now directly excludes `not_sure` from the analysis denominator.
- `frontend/src/types/metrics.ts`: removed the deleted API fields from the TypeScript response contract.
- `frontend/src/components/dashboard/AdoptionChart.tsx`: removed average-hours text from the adoption hover hint.
- `frontend/src/components/dashboard/AdoptionSidePanel.tsx`: removed average-hours text from leaderboard rows.
- `frontend/src/components/dashboard/RecordsTable.tsx`: removed the sortable `Avg hrs saved` column.
- `frontend/e2e/survey-dashboard.spec.ts`: added API and UI checks that the removed fields and labels are absent.
- `backend/tests/test_metrics_api.py`, `backend/tests/test_metrics_aggregator.py`, and `frontend/tests/frontend.test.mjs`: updated regression coverage around the removed fields and preserved Q3 distribution behavior.
- `docs/metrics.md`, `docs/PRD.md`, `docs/ADR.md`, and `docs/implementation_plan.md`: updated the documented metric/API contract to show Q3 as a distribution only, with no midpoint-derived hour estimate.
- `CLAUDE.md`: updated local guidance so future implementation work does not reintroduce Q3 hour estimates.

No database migration or cleanup was needed because the removed values were read-time calculations, not persisted fields.

## Verification

Regression tests were updated first and failed against the old frontend code because `avg_hours_saved` and `avg saved` were still present.

Full local verification run on 2026-09-02:

- `uv run --extra dev pytest` — 91 passed
- `npm test` — 20 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`
- `docker compose up --build -d`
- `curl -I http://127.0.0.1:5173/dashboard` — 200 OK
- `curl -I http://127.0.0.1:5173/survey` — 200 OK
- Running `/api/metrics?scope=org` contract check — removed weekly-hours fields are absent

Live-flow verification:

- Playwright submits a survey response and verifies it appears in the executive dashboard.
- `/api/metrics` no longer returns `avg_weekly_hours_saved` or `estimated_weekly_hours_saved` under `headline_metrics`.
- `group_breakdown.rows[]` no longer returns `avg_hours_saved` or `avg_hours_saved_denominator`.
- The dashboard no longer renders `Avg hrs saved` or `avg saved`.
- The Q3 weekly-time-saved distribution panel still renders as part of the six distribution cards.
