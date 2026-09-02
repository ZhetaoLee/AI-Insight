# AI Insight

AI Insight is an internal survey and executive dashboard application for understanding how AI affects employee productivity, quality, and workflow friction.

Employees submit a short AI-usage survey (`/survey`). Leadership then views the results on an executive dashboard (`/dashboard`) that rolls individual responses up into aggregated metrics across three scopes:

- the full organization,
- a selected manager plus all of their descendants,
- a selected employee level (e.g. all Individual Contributors, org-wide).

Every metric is computed by recomputing from raw individual responses over the resolved population for the selected scope — never by averaging pre-aggregated child percentages — so numbers stay correct regardless of how unevenly sized the underlying teams are. See `docs/PRD.md` for the full product spec, `docs/ADR.md` for the architecture decisions behind it, and `docs/metrics.md` for the canonical metric formulas.

## Setup

### Option 1: Docker Compose (recommended)

Runs MongoDB, FastAPI, and the Vite dev server together with one command:

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

### Option 2: Run frontend and backend locally

**Backend** (requires MongoDB running separately, e.g. via `docker compose up mongo`):

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

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

Useful frontend commands:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
npm run preview
```

### Option 3: Live deployment

Live URL: **https://insight.zhetaoli.dev**

This points at an AWS Lightsail instance.

## Assumptions

- MongoDB is the source of truth for employees and survey responses; metrics are computed at read time from raw responses rather than stored as precomputed scores, so metric definitions can evolve without rewriting history.
- Seed data is deterministic and contains exactly 10 mock employees across the required hierarchy levels (Senior Director, Director, Manager, Individual Contributor), standing in for the ~50-person real organization described in the PRD.
- Dashboard metrics are computed and owned entirely by the backend; the frontend renders precomputed, presentation-ready values and never re-derives adoption/quality/productivity rules from raw answer codes.
- Department is intentionally absent from this version's employee data model and is not a supported metrics scope.
- "Not sure" answers (e.g. Q3 weekly time saved) are treated as missing data and excluded from the relevant analysis, not converted into an estimated value of zero.
- One survey response is accepted per employee per active survey cycle (backend-configured, e.g. `2026-H2`); a resubmission attempt in the same cycle is rejected rather than overwriting the prior response.
- This is a take-home/demo build: authentication, authorization, and multi-tenant concerns are out of scope, and the seeded employee/survey data is illustrative rather than real.

## AI-Assisted Development Approach

I used AI tools selectively throughout the project to accelerate development while keeping the product requirements, survey design, dashboard metrics, system architecture, aggregation logic, and final engineering decisions under my control.

Rather than relying on a single AI tool for the entire assignment, I intentionally assigned different roles to different AI agents based on their strengths. I treated them more like members of a development team, with each agent focusing on a specific part of the development process.

### Claude Design — UI/UX Designer

I used Claude Design primarily as the UI/UX design agent.

Its role was to help explore the visual direction of the application, including the dashboard layout, information hierarchy, component structure, and overall user experience.

I chose Claude Design because it allowed me to quickly translate product requirements into a structured frontend design and iterate on UI ideas before implementation.

This was especially useful for the executive dashboard, where the goal was not only to display metrics, but also to organize the information in a way that gives leadership a clear view of AI adoption, productivity impact, and areas for improvement.

### Claude + MCP — Design Integration, Debugging, and Documentation

For the initial frontend implementation, I connected Claude to Claude Design through MCP.

This allowed Claude to directly access the design context rather than relying only on screenshots or manually written descriptions. Its role was to help translate the UI design into the existing frontend codebase while maintaining consistency with the original design.

I also used Claude as a debugging and documentation agent. It helped review existing code, identify potential issues, reason through bugs across multiple files, and improve the project documentation.

I chose Claude for this role because it is effective at working with larger amounts of project context and reasoning across multiple related files.

### Codex — Implementation and Testing Agent

I used Codex as the primary implementation and testing agent.

Its role was to take the requirements, architecture, and design decisions that had already been defined and turn them into working code.

I used Codex to implement frontend and backend features, make changes across the codebase, write and run tests, and iterate on implementation issues based on test results.

I chose Codex for this role because it is well suited to code-focused development workflows where the agent needs to inspect an existing repository, modify multiple files, execute tests, and iterate on the implementation.

### Why I Used Multiple AI Agents

The main reason I used multiple AI tools was not simply because they offered different features. I wanted to create a structured AI-assisted development process where each agent had a clearly defined role and could focus on the type of work it handled best.

This separation of responsibilities helped reduce context switching and avoided having one general-purpose agent handle design, implementation, debugging, testing, and documentation all at once.

Instead, I used each agent within a more focused area, similar to how different members of a software development team may specialize in design, development, testing, or review.

## Bug Tracker

Post-plan bugs are tracked as public Markdown files under `bug/`.

- Active bugs live directly in `bug/`.
- Fixed bugs move to `bug/fixed/`.
- New bug reports should start from `bug/TEMPLATE.md`.
