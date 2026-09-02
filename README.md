# AI Insight

AI Insight is an internal survey and executive dashboard application for understanding how AI affects employee productivity, quality, and workflow friction.

The product collects individual survey responses and rolls them up into leadership metrics across:

- the full organization,
- a selected manager plus all descendants,
- a selected employee level.

The dashboard must aggregate from individual employee responses.

## Full Local Setup

Run the full stack with MongoDB, FastAPI, and Vite:

```bash
docker compose up --build
```

Local services:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
MongoDB:  mongodb://localhost:27017
```

The backend creates required MongoDB indexes and seeds 10 mock employees on startup.

## Backend Setup

Run the API directly when MongoDB is already running:

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

Useful backend checks:

```bash
uv run python -m compileall app
uv run --extra dev pytest
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to:

```text
http://localhost:8000
```

Useful frontend commands:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
npm run preview
```

## API Surface

Initial implemented endpoints:

```text
GET /health
GET /api/employees
GET /api/metrics
POST /api/survey-responses
```

## Bug Tracker

Post-plan bugs are tracked as public Markdown files under `bug/`.

- Active bugs live directly in `bug/`.
- Fixed bugs move to `bug/fixed/`.
- New bug reports should start from `bug/TEMPLATE.md`.

## Assumptions

- MongoDB is the source of truth for employees and survey responses.
- Seed data is deterministic and contains 10 employees across the required hierarchy levels.
- The survey employee picker and submit confirmation keep local fallback behavior as a demo aid when the backend is unavailable.
- Dashboard metrics are computed by the backend.
