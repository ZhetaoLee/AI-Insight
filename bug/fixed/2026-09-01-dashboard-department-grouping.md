# Dashboard exposes department as a grouping dimension

- **Status:** Fixed
- **Reported:** 2026-09-01

## Summary

The executive dashboard let leadership group/compare by department (a "Department / Level" toggle on the adoption chart, leaderboard, and records table, with `group_by=department` as the API default), even though department is not a supported dashboard dimension for the initial version.

## Details

`docs/ADR.md` and `docs/PRD.md` state that every metrics scope is exactly one of `org`, `manager`, or `level`. In practice this had been read narrowly as "not a **scope**" while still allowing department as a **group_breakdown grouping dimension**, and the docs, backend, and frontend all built that in:

- `GET /api/metrics` accepted `group_by=department|level`, defaulting to `department`.
- The dashboard rendered a "Department / Level" toggle on the adoption chart and the records table, and used department for hero-card sparklines/leaderboard grouping.
- `docs/metrics.md`, `docs/implementation_plan.md`, `docs/PRD.md`, and `docs/ADR.md` all documented `group_by=department` as supported/default in their API examples.

Reported by the user after opening the dashboard and seeing the department grouping still present.

## Fix

Removed department as a dashboard grouping dimension end-to-end. A later field-removal fix also removed department from the employee contract entirely:

- **Backend**: `GroupByField` narrowed to `Literal["level"]`; unsupported `group_by=department` requests return `422`; `MetricsAggregator._group_breakdown` always groups by level. Updated `test_metrics_api.py`, `test_metrics_service.py`, and `test_metrics_aggregator.py` accordingly.
- **Frontend**: Removed the `GroupByField` type, the `groupBy` dashboard state, and the "Department / Level" toggle UI from `AdoptionChart`, `RecordsTable`, and `AdoptionSidePanel`. The frontend no longer has a local metrics fallback after Plan 8, so dashboard metrics now come only from `/api/metrics`.
- **Docs**: `docs/metrics.md`, `docs/implementation_plan.md`, `docs/PRD.md`, and `docs/ADR.md` updated to drop every `group_by=department` example/reference and state that `group_breakdown` is always grouped by `level`.
- **Database**: No migration was needed for this bug. Department grouping was computed at read time; no persisted aggregate, index, or dashboard grouping preference had to be removed.

Verified with the backend pytest suite, frontend tests, frontend type-check, production build, and Playwright smoke test during the Plan 8 release pass.

## Reverification

Checked again on 2026-09-02 against the current codebase:

- Dashboard API requests from the frontend do not send `group_by`.
- The dashboard no longer renders a "Department / Level" grouping toggle.
- Backend `group_breakdown` remains level-only.
- `GET /api/metrics?scope=org&group_by=department` is covered by a negative API test and returns `422`.
- No database migration is needed for this specific fixed bug because no department-grouped aggregate data is persisted.
