# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repo contains planning/architecture docs plus the completed implementation-plan baseline for **AI Productivity Insights**, an internal app where employees submit an AI-usage survey and leadership views hierarchy-aggregated productivity metrics.

- `docs/PRD.md` — product goals, users, survey questions (Q1–Q8), leadership metric formulas, API contract, acceptance criteria.
- `docs/ADR.md` — accepted architecture (React+TS frontend, FastAPI service layer, MongoDB) and the reasoning behind it.
- `docs/Questions.md` — canonical source for survey question text, option lists, and answer codes; must stay in sync with `docs/PRD.md` §8 and `frontend/src/types/survey.ts`.
- `docs/metrics.md` — canonical source for metric calculations and chart behavior.
- `backend/` — FastAPI service foundation with MongoDB configuration, index setup, seeded employees, and initial health/employee routes.
- `frontend/` — the React + TypeScript app. Both `/survey` and `/dashboard` are implemented. Survey employee lookup and submit confirmation keep local demo fallbacks; dashboard metrics are backend-owned.
- `bug/` — public file-based bug tracker. Active bugs live directly in `bug/`; fixed bugs move to `bug/fixed/`.

Read `docs/PRD.md` and `docs/ADR.md` before making product or architecture decisions — they encode specific, deliberate tradeoffs (see Architecture Principles below), not just background info.

During implementation, use `docs/PRD.md`, `docs/ADR.md`, `docs/Questions.md`, and `docs/metrics.md` as the source of truth. All Markdown files are public and may be tracked and pushed when intentionally changed.

## Commands

```bash
docker compose up --build       # MongoDB + FastAPI + Vite frontend
cd backend && uv sync --extra dev
cd backend && uv run uvicorn app.main:app --reload
cd backend && uv run --extra dev pytest
cd frontend && npm install      # install deps
cd frontend && npm run dev      # Vite dev server; proxies /api -> http://localhost:8000
cd frontend && npm test         # frontend logic/API-client tests
cd frontend && npm run test:e2e # Playwright submit-to-dashboard smoke test
cd frontend && npm run lint     # tsc --noEmit (type-check only, no separate linter configured)
cd frontend && npm run build    # tsc -b && vite build
```

Backend pytest, frontend logic tests, and Playwright E2E validation are configured.

The FastAPI backend provides `/health`, `/api/employees`, `/api/survey-responses`, and `/api/metrics`. `frontend/src/api/employees.ts` and `frontend/src/api/survey.ts` keep small demo fallbacks for unavailable backend development states. `frontend/src/api/metrics.ts` does not fall back locally; dashboard metric business logic lives in the backend.

## Architecture (target, per docs/ADR.md)

```
React (TS)  →  FastAPI  →  Service Layer  →  MongoDB
```

Backend has three logical responsibilities that must stay separate:
- **Survey Service** — validates and persists survey responses.
- **Hierarchy / Scope Resolver** — resolves a requested scope (`org` | `manager` | `level`) into a set of employee IDs by recursively walking `manager_id` links. This is pure hierarchy traversal, independent of metrics.
- **Metrics Engine** (`Signal Calculator` + `Metrics Aggregator`) — turns each raw survey response into a normalized per-employee signal object, then aggregates signals across the resolved population into leadership metrics.

Recommended service names/pipeline (ADR §20): `EmployeeRepository`, `SurveyResponseRepository`, `HierarchyService`, `ScopeResolver`, `SignalCalculator`, `MetricsAggregator`, `MetricsService`. `MetricsService.get_metrics()` composes them: resolve scope → fetch responses for those employees → calculate signals → aggregate.

### Architectural principles that constrain implementation choices

1. **Hierarchy determines population before anything else.** Aggregation is always: resolve scope → individual employee population → individual survey responses → per-employee signals → aggregate metric. Never compute a higher-level metric by averaging lower-level percentages — averaging pre-aggregated percentages across groups of different sizes is mathematically wrong (see the worked example in ADR §11 / PRD §20: two managers with 2 and 8 reports at 100%/50% adoption must yield 60% org-wide, not 75%). Any new metric or endpoint must be implemented as "recompute from raw responses over the resolved population," not "average child aggregates."
2. **Raw survey answers are the source of truth**, not derived scores. Store answers as submitted; compute signals/metrics at read time so metric definitions can evolve without rewriting history.
3. **Organizational attributes (department, level, manager) live on the Employee record, not in survey answers.** The survey only captures identity selection; department/level/manager are looked up and shown read-only, never submitted as editable survey fields — this prevents employee-record vs. survey-answer drift.
4. **"Not sure" is missing data, not zero.** Any calculation using banded/numeric answers (e.g. weekly time saved) must exclude "not sure" responses from both numerator and denominator, not treat them as 0. Every metric that uses a partial population must report its own explicit denominator (see PRD §20.2).
5. **Metric business logic lives only in the backend.** The frontend renders precomputed, presentation-ready metrics from `/api/metrics`; it must not re-derive adoption/quality/productivity rules from raw answer codes. When building dashboard UI, treat the API response shape (PRD §24) as the contract and don't reimplement threshold logic client-side.
6. **Metrics are transparent formulas, not weighted composite scores** — see `docs/metrics.md` for the canonical definitions behind adoption, time saved, output impact, quality, rework, Q3-Q5 analysis, benefits, barriers, and group breakdowns. Preserve this explainability when adding new metrics; don't introduce opaque weighted scoring.
7. **Every scope resolves to one of exactly three types:** `org` (all employees), `manager` (a manager + full recursive descendant subtree, not just direct reports), `level` (all employees at a given level). Department is an employee attribute shown as context but is not a supported metrics scope.
8. Survey responses are versioned by `survey_version` and `survey_cycle` (a backend-configured active cycle, e.g. `"2026-Q3"`); a resubmission for the same employee+cycle replaces the existing response rather than creating a duplicate.

## Frontend structure

```
frontend/src/
├── pages/            # SurveyPage.tsx, DashboardPage.tsx — both implemented
├── components/
│   ├── layout/        # AppLayout.tsx — shared nav/layout for both routes
│   ├── survey/         # EmployeePicker, RankQuestion, SingleSelectQuestion, MultiSelectQuestion, OtherTextInput
│   └── dashboard/      # sidebar/toolbar, hero cards, charts, distribution panels, records table
├── api/               # employees.ts, survey.ts, metrics.ts — fetch wrappers
├── lib/               # dashboardFormat.ts, dashboardScope.ts, surveyForm.ts — frontend-only UI/form helpers
└── types/             # employee.ts, survey.ts, metrics.ts — mirrors PRD survey question/option codes and the §24 metrics response shape
```

`frontend/src/types/survey.ts` is the frontend-side canonical list of question option codes (e.g. `few_times_week`, `1_5_hours`, `sometimes`) — these must match the answer codes implied by `docs/PRD.md` §22/§24 and the option lists in `docs/Questions.md` exactly, since the backend will key off these same codes.

Routing (`App.tsx`): `/` redirects to `/survey`; both `/survey` and `/dashboard` render inside a shared `AppLayout`.
