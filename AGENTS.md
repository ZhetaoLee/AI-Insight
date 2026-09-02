# Repository Guidelines

## Project Structure & Module Organization

This repository contains planning and architecture documentation plus the completed implementation-plan baseline for **AI Productivity Insights**:

- `docs/PRD.md` defines product goals, users, survey flows, metrics, and non-goals.
- `docs/ADR.md` records the accepted architecture: React + TypeScript frontend, FastAPI service layer, and MongoDB persistence.
- `docs/Questions.md` is the canonical survey question and answer-code source.
- `docs/metrics.md` is the canonical metric calculation and chart-behavior source.
- `backend/` is the FastAPI service with MongoDB configuration, index setup, seeded employees, survey submission routes, and metrics routes.
- `frontend/` is the React + TypeScript application (Vite, React Router). The survey page (`/survey`) and executive dashboard (`/dashboard`) are implemented.
- `bug/` is the public file-based bug tracker. Active bugs live directly in `bug/`; fixed bugs move to `bug/fixed/`.

All Markdown files are public project documentation and may be tracked and pushed to GitHub when intentionally changed, including `README.md`, `docs/*.md`, `bug/*.md`, `AGENTS.md`, and `CLAUDE.md`.

During implementation, use `docs/PRD.md`, `docs/ADR.md`, `docs/Questions.md`, and `docs/metrics.md` as the source of truth. Keep `README.md`, `AGENTS.md`, and `CLAUDE.md` at the repository root.

Keep major backend areas separated:

- `backend/` for FastAPI routes, services, models, and persistence logic.
- `backend/tests/` for backend tests.
- package-local `__tests__/` directories for future frontend tests when needed.

## Build, Test, and Development Commands

- `docker compose up --build` to run MongoDB, FastAPI, and the Vite frontend together.
- `cd backend && uv sync --extra dev` to install backend dependencies.
- `cd backend && uv run uvicorn app.main:app --reload` to start the FastAPI backend when MongoDB is already running.
- `cd backend && uv run --extra dev pytest` to run backend tests.
- `cd frontend && npm install` to install frontend dependencies.
- `cd frontend && npm run dev` to start the Vite dev server. It proxies `/api` to `http://localhost:8000`.
- `cd frontend && npm test` to run frontend logic/API-client tests.
- `cd frontend && npm run test:e2e` to run the Playwright submit-to-dashboard smoke test through Docker Compose.
- `cd frontend && npm run lint` (`tsc --noEmit`) to type-check.
- `cd frontend && npm run build` to produce a production build.
- `git diff --check` to catch whitespace issues before committing tracked files.

All validation must be runnable locally. It is acceptable to create Docker images or a `docker compose` setup for MongoDB, FastAPI, and the frontend when that makes tests and manual verification repeatable.

## Coding Style & Naming Conventions

Keep Markdown concise and structured with clear headings. Use fenced code blocks for commands, JSON examples, and architecture diagrams. Prefer descriptive filenames with uppercase names for repository-level documents such as `PRD.md`, `ADR.md`, and `AGENTS.md`.

For future code, follow the stack in `docs/ADR.md`: TypeScript for the React frontend and Python for FastAPI. Use clear domain names such as `SurveyService`, `MetricsService`, `scope_resolver`, and `survey_responses`.

## Testing Guidelines

Use TDD for correctness-sensitive work. Add or update a failing test first, confirm the failure, implement the smallest change, then rerun the targeted test and related suite.

Backend pytest support is configured. Tests cover hierarchy aggregation, metric calculations from `docs/metrics.md`, survey submission replacement behavior, response coverage, Q8 multiple-choice barriers, `Other` text handling, and dynamic Q3-Q5 analysis. Frontend tests cover survey validation, API parameters, API error states, and the critical submit-to-dashboard workflow.

Before calling work complete, verify the app can run locally end to end, including MongoDB-backed API calls and frontend dashboard/survey flows.

Name tests after behavior, for example `test_manager_scope_includes_reports` or `DashboardFilters.test.tsx`.

## Commit & Pull Request Guidelines

Use short, imperative commit messages such as `Implement dashboard filters` or `Add survey response API`.

Pull requests should include a concise summary, validation steps, linked issue or task context, and screenshots for UI changes. Note any product or architecture decisions that update `docs/PRD.md` or `docs/ADR.md`.
