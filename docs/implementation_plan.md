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

## Plan 4: Metrics Engine

- Implement every formula from `docs/metrics.md` with exact unit tests.
- Calculate population counts, response rate, active AI users, and adoption rate.
- Calculate Q2 rank counts and required sort order.
- Apply Q3 midpoint mapping and exclude `not_sure` from numeric metrics.
- Calculate Q4, Q5, Q6, Q7, and Q8 distributions with correct denominators.
- Implement dynamic Q3-Q5 matching count, denominator, and rate.
- Assert metric unit conventions: top-level `RateMetric.value` fields are fractions, while distribution and group breakdown percentages are whole percentages.

## Plan 5: Dashboard Metrics API

- Implement `GET /api/metrics` test-first.
- Support `scope=org`, `scope=manager&scope_id=...`, and `scope=level&scope_id=...`.
- Support `group_by=department|level`.
- Support `group_by` defaulting to `department`.
- Support `q3`, `q4`, and `q5` query criteria with defaults of `more_than_5_hours`, `slightly_more`, and `slightly_better`.
- Return `422` for `q3=not_sure` because `not_sure` is missing data.
- Return a response compatible with `frontend/src/types/metrics.ts`.
- Verify submitted responses affect later metrics responses.

## Plan 6: Frontend Alignment

- Fix Q8 UI behavior so `no_major_barriers` is mutually exclusive.
- Add tests for required survey fields, Q2 ranking, `Other` text, and Q8 exclusivity.
- Add tests that dashboard requests include `scope`, `scope_id`, `group_by`, `q3`, `q4`, and `q5`.
- Keep local fallback behavior only as a demo aid until the backend is available.

## Plan 7: End-to-End Validation

- Run backend unit/API tests.
- Run frontend type-check and production build.
- Build Docker images when present and verify they start cleanly.
- Start MongoDB, FastAPI, and the Vite frontend locally, either directly or through Docker Compose.
- Manually validate survey submission, response replacement, dashboard refresh, org/manager/level scopes, and Q3-Q5 analysis.
- Add one Playwright smoke test for the full submit-to-dashboard flow.

## Plan 8: Final Review and Release

- Compare implementation against PRD acceptance criteria.
- Confirm docs and README match the final commands and API behavior.
- Run full validation before committing.
- Push only intended tracked files to GitHub.
