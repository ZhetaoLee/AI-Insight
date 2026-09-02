# Implementation Plan

This plan breaks the PRD into implementation phases. Use TDD for correctness-sensitive work: write a failing test, implement the smallest behavior needed to pass it, then refactor with tests green.

## Plan 1: Project Foundation [Complete]

- `backend/` exists for FastAPI routes, services, models, repositories, and tests.
- MongoDB connection settings, database name, and active survey cycle configuration exist.
- Required MongoDB indexes exist for hierarchy lookup, level lookup, survey cycle filtering, and unique `(employee_id, survey_cycle)` responses.
- Local development commands are documented for backend, frontend, and MongoDB.
- Docker images and `docker compose` are present so the full system can run locally with MongoDB, FastAPI, and the frontend.
- `docs/PRD.md`, `docs/ADR.md`, `docs/Questions.md`, and `docs/metrics.md` are the implementation references.
- `docs/Questions.md` is the single canonical survey question and answer-code source.

## Plan 2: Backend TDD Setup [Complete]

- Pytest, pytest-asyncio, and httpx test client support are configured.
- Deterministic employee and response fixtures exist.
- Tests cover exactly 10 seeded mock employees across Senior Director, Director, Manager, and IC levels.
- Tests cover hierarchy traversal, manager subtree resolution, level filtering, hierarchy cycle protection, and active survey-cycle filtering.

## Plan 3: Survey Submission API [Complete]

- `POST /api/survey-responses` is implemented test-first.
- Q1-Q8 answer codes are validated against the canonical question set.
- Q2 exactly three unique ranked areas and unique rank positions are enforced.
- `other_text` is required when Q2, Q7, or Q8 uses `other`.
- Q8 `no_major_barriers` exclusivity is enforced.
- One active response is upserted per `(employee_id, survey_cycle)`.
- Tests verify clients send only `employee_id` and `answers`; the server populates response IDs, survey cycle, survey version, and submission timestamp.

## Plan 4: Metrics Engine [Complete]

- Every formula from `docs/metrics.md` is implemented with exact unit tests.
- Population counts, response rate, active AI users, and adoption rate are calculated.
- Q2 rank counts and required sort order are calculated.
- Q3 midpoint mapping is applied and `not_sure` is excluded from numeric metrics.
- Q4, Q5, Q6, Q7, and Q8 distributions use the correct denominators.
- Dynamic Q3-Q5 matching count, denominator, and rate are implemented.
- Tests assert metric unit conventions: top-level `RateMetric.value` fields are fractions, while distribution and group breakdown percentages are whole percentages.

## Plan 5: Dashboard Metrics API [Complete]

- `GET /api/metrics` is implemented test-first.
- `scope=org`, `scope=manager&scope_id=...`, and `scope=level&scope_id=...` are supported.
- `group_breakdown` is always grouped by `level` — department is not a supported grouping dimension for the initial version.
- `q3`, `q4`, and `q5` query criteria default to `more_than_5_hours`, `slightly_more`, and `slightly_better`.
- `q3=not_sure` returns `422` because `not_sure` is missing data.
- The response is compatible with `frontend/src/types/metrics.ts`.
- Tests verify submitted responses affect later metrics responses.

## Plan 6: Frontend Alignment [Complete]

- Fix Q8 UI behavior so `no_major_barriers` is mutually exclusive.
- Add tests for required survey fields, Q2 ranking, `Other` text, and Q8 exclusivity.
- Add tests that dashboard requests include `scope`, `scope_id`, `q3`, `q4`, and `q5`.
- Keep local employee and survey-submit fallback behavior as a demo aid when the backend is unavailable.
- Dashboard metrics are fetched from the backend and are not recomputed in frontend code.

## Plan 7: End-to-End Validation [Complete]

- Run backend unit/API tests.
- Run frontend type-check and production build.
- Build Docker images when present and verify they start cleanly.
- Start MongoDB, FastAPI, and the Vite frontend locally, either directly or through Docker Compose.
- Manually validate survey submission, response replacement, dashboard refresh, org/manager/level scopes, and Q3-Q5 analysis.
- Add one Playwright smoke test for the full submit-to-dashboard flow.

## Plan 8: Final Review and Release [Complete]

- Implementation has been compared against PRD acceptance criteria.
- Docs and README match the final commands and API behavior.
- Full backend, frontend, build, and E2E validation passes locally.
- Intended tracked files are ready to commit and push to GitHub.

## Post-Plan Bug Tracking

- Bugs found after Plan 8 are tracked as public Markdown files under `bug/`.
- Active bugs live directly in `bug/`.
- Fixed bugs move to `bug/fixed/` and should include the fixing commit or date.
- Bug files document observed issues and expected fixes; they do not imply the bugs have been fixed.
