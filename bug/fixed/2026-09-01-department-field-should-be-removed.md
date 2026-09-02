# Department field still exists across dashboard, survey, backend, and seed data

- **Status:** Fixed
- **Reported:** 2026-09-01
- **Fixed:** 2026-09-02

## Summary

`department` was a real field on the `Employee` model and showed up in multiple UI locations, even though it was not required for this version. The same review also found a related label inconsistency: the `ic` level showed as `"Individual Contributor"` in some places and `"IC"` in others.

## Details

Confirmed: both were real, and larger than the two department bugs already filed today.

This report explicitly asks for a full field removal ("no department field required for this version"), not just hiding a display — so it supersedes and subsumes `bug/2026-09-01-survey-employee-picker-shows-department.md` (that fix — remove the department line from `EmployeePicker.tsx` — is a subset of the work below; once this bug is fixed that one is fixed too and can be closed). `bug/fixed/2026-09-01-dashboard-department-grouping.md` (removing department as a `group_by` dimension) is a separate, already-fixed issue — this bug is about the field's existence, not grouping.

### A. Where `department` appeared

**Dashboard**
- `frontend/src/components/dashboard/DashboardToolbar.tsx:51` — the manager-scope `<select>` shows `{p.name} · {LEVEL_LABELS[p.level]} · {p.department} (...)`.

**Survey**
- `frontend/src/components/survey/EmployeePicker.tsx:40` — renders `<strong>{selected.department}</strong> · {LEVEL_LABELS[selected.level]}` after picking a name (already filed as its own bug; the fix is the same underlying change).

**Frontend data model / seed data**
- `frontend/src/types/employee.ts:6` — `Employee.department: string` is part of the shared type every component above reads from.
- `frontend/src/api/employees.ts:7-16` — all 10 survey seed employees carry a `department` value.
- `frontend/src/lib/dashboardFormat.ts:7` — `shortGroupLabel`'s override map still has `Infrastructure: "Infra."`, dead since `group_breakdown` became level-only in the earlier fix; delete it as part of this cleanup regardless.
- `frontend/tests/frontend.test.mjs:31-33` — three fixture employees carry a `department` value (harmless at runtime since JS ignores extra keys, but should be removed for consistency once the field is gone).

Note: the old dashboard local synthetic generator (`frontend/src/lib/dashboardSeedData.ts`) and local metric fallback (`frontend/src/lib/metricsEngine.ts`) were removed in Plan 8, so there is no longer a dashboard fallback data generator to update for this bug.

**Backend**
- `backend/app/models/employee.py:13` — `Employee.department: str` (required field).
- `backend/app/repositories/seed.py:6-27` — the `employee()` builder takes `department` as a required positional/keyword arg and writes `"department": department` into every seeded document; all 10 `SEED_EMPLOYEES` calls pass one.
- Backend tests constructing `Employee(...)` directly all pass `department=`: `backend/tests/test_metrics_service.py:178-182` (helper function + its one caller), `backend/tests/test_scope_resolver.py:74-76` (3 employees), `backend/tests/test_metrics_aggregator.py:207,307-311` (6 employees). These will fail to construct once `department` is removed from the model unless updated.
- Tests that only consume `SEED_EMPLOYEES` generically (`conftest.py`, `test_foundation.py`, `test_metrics_api.py`) don't reference `department` directly and need no changes — they'll keep working once `seed.py` stops emitting the key.

**Database**
- `backend/app/db.py:29-34` (`ensure_indexes`) — no index touches `department`; only `id`, `manager_id`, `level` are indexed, so no index migration is needed.
- However, `seed_employees()` (`backend/app/repositories/seed.py:29-31`) upserts via `{"$set": employee}`, which only sets keys present in the new document — it never removes fields. Any MongoDB instance already seeded before this fix would keep a stale `department` value on existing employee documents indefinitely. A real fix needs either an `$unset` migration step or documentation telling operators to drop/re-seed the `employees` collection.

**Docs**
- `docs/PRD.md:373,493(ADR),895,977` and `docs/ADR.md:250,258,292,493` all describe department as a legitimate, storable, displayable Employee attribute ("The frontend may display department, level, and manager as read-only context" — ADR.md:292). These statements are the root cause of the drift and need to be reworded to say department is not part of this version's data model at all, not just "not a metrics scope" (which is already fixed) or "shown as context" (which is what's being removed now).

### B. Related finding: `ic` level label is inconsistent ("Individual Contributor" vs "IC")

While checking every level reference per the request to "check all dashboard, survey, backend, database," found that the display label for the `ic` level is inconsistent between frontend and backend:

- `frontend/src/types/employee.ts:15` — `LEVEL_LABELS.ic = "Individual Contributor"`.
- `backend/app/services/metrics.py:34` — `LEVEL_LABELS["ic"] = "IC"`.

Practical effect: `group_breakdown` row labels (leaderboard, records table, chart x-axis) come from the real `/api/metrics` backend and say `"IC"`, while survey UI and frontend level selectors use `"Individual Contributor"` from `frontend/src/types/employee.ts`.

The user's message states the correct set is "Senior Director, Director, Manager, and Individual Contributor" — so the backend's `"IC"` is the one that's wrong relative to that. This also means the canonical docs need to change, since they currently use `"IC"` as the documented label, not shorthand:
- `docs/Questions.md:16` — `- \`ic\`: IC` (the canonical code→label mapping for the Level field).
- `docs/PRD.md:1147` — the §24 example `/api/metrics` response literally has `"label": "IC"` for a level group row.
- `docs/PRD.md` and `docs/ADR.md` also use bare `IC` throughout org-chart ASCII diagrams and prose (e.g. `docs/ADR.md:23,34,489-490,585,1130-1133`; `docs/PRD.md:36-42,188,654-657,681-734`) — worth a decision during implementation on whether those informal diagram/shorthand uses also change to "Individual Contributor" or stay as shorthand, versus the two formal `label`/mapping spots above which should definitely change.

Also worth checking once relabeled: `frontend/src/lib/dashboardFormat.ts`'s `shortGroupLabel` has a `"Senior Director" → "Sr. Dir."` abbreviation for chart x-axis space, but nothing for `"Individual Contributor"` (currently moot since the frontend already renders the long form there) — if the backend's `"IC"` becomes `"Individual Contributor"` too, the chart x-axis label will render the full 21-character string under a narrow bar column with no abbreviation, unlike the other three levels.

## Files changed to fix this

**Remove `department` field:**
1. `frontend/src/types/employee.ts` — drop `department` from `Employee`.
2. `frontend/src/api/employees.ts` — drop `department` from all seed entries.
3. `frontend/src/components/survey/EmployeePicker.tsx` — drop department from the rendered context line.
4. `frontend/src/components/dashboard/DashboardToolbar.tsx` — drop `· {p.department}` from the manager picker option.
5. `frontend/src/lib/dashboardFormat.ts` — drop the dead `Infrastructure: "Infra."` override.
6. `frontend/tests/frontend.test.mjs` — drop `department` from fixture employees.
7. `backend/app/models/employee.py` — drop `department` from the `Employee` model.
8. `backend/app/repositories/seed.py` — drop the `department` parameter/field from the seed builder and all 10 calls.
9. `backend/tests/test_metrics_service.py`, `backend/tests/test_scope_resolver.py`, `backend/tests/test_metrics_aggregator.py` — drop `department=` from every `Employee(...)` construction.
10. `docs/PRD.md`, `docs/ADR.md` — reword the passages describing department as a storable/displayable attribute; state plainly it's not part of this version's data model.
11. **Database**: no index change needed, but note (in docs or a migration note) that any already-seeded MongoDB `employees` collection will retain stale `department` values until re-seeded or explicitly `$unset`.

**Fix the `ic` label inconsistency:**
12. `backend/app/services/metrics.py` — change `LEVEL_LABELS["ic"]` from `"IC"` to `"Individual Contributor"` to match the frontend and the user's stated expectation.
13. `docs/Questions.md` — update the `ic` code→label line.
14. `docs/PRD.md` — update the §24 example response's `"label": "IC"`; decide on the org-chart/prose `IC` shorthand occurrences.
15. `docs/ADR.md` — decide on its `IC` shorthand occurrences for consistency.
16. `frontend/src/lib/dashboardFormat.ts` — consider adding a `shortGroupLabel` abbreviation for `"Individual Contributor"` once it's the label everywhere, so the adoption chart's x-axis doesn't render the full-length string.

**Supersedes:** `bug/2026-09-01-survey-employee-picker-shows-department.md` (its fix is item 3 above, a subset of this bug's scope).

## Fix

Removed `department` from the employee contract end-to-end:

- **Frontend**: removed `department` from `Employee`, frontend seed employees, the survey employee context line, and the dashboard manager selector. Removed the dead `Infrastructure` chart-label override and added a short label for `Individual Contributor`.
- **Backend**: removed `department` from the `Employee` model and seeded employee documents. `seed_employees()` now sends `$unset: {"department": ""}` on every seeded employee upsert so existing local MongoDB records drop stale department values automatically on startup.
- **Docs**: updated `docs/PRD.md`, `docs/ADR.md`, `docs/Questions.md`, and `docs/metrics.md` so department is described as absent from this version's employee data model, not stored/displayed context.
- **Local agent docs**: updated `CLAUDE.md` to match the new employee contract. `AGENTS.md` did not contain department-specific implementation guidance.
- **Tests**: added regression coverage for seed documents, stale Mongo cleanup, `/api/employees` serialization, frontend seed data, and selector source references.

The related `ic` label inconsistency was fixed at the same time: backend metrics now return `Individual Contributor`, matching the frontend and docs.

## Verification

Initial regression tests failed before the implementation:

- `uv run pytest tests/test_seed.py tests/test_employees_api.py`
- `npm test`

After the implementation, targeted backend and frontend tests passed.

Full local verification run on 2026-09-02:

- `uv run pytest`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `git diff --check`

Live stack verification:

- `GET /api/employees` returns employee records with `id`, `name`, `level`, and `manager_id`; no `department` key is returned.
- `GET /api/metrics?scope=level&scope_id=ic` returns scope name and group labels as `Individual Contributor`.
- MongoDB check `db.employees.countDocuments({department: {$exists: true}})` returns `0`.
