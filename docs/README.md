# Docs

Canonical source-of-truth documents for this project. When implementing or reviewing a change, these take precedence over inference from code alone.

- **`PRD.md`** — Product Requirements Document. Product goals, users, information architecture, the survey experience, the executive dashboard, and acceptance criteria. The starting point for "what should this do?"
- **`ADR.md`** — Architecture Decision Record. The accepted system architecture (React/TypeScript frontend, FastAPI service layer, MongoDB) and the reasoning behind each major decision, including alternatives considered and rejected.
- **`Questions.md`** — canonical survey question source. Exact question text, option lists, and answer codes for Q1–Q8; frontend types, backend validation, and API payloads must all match these codes exactly.
- **`metrics.md`** — canonical metric source. The precise formula, denominator, and missing-data handling for every dashboard metric (adoption, time saved, output/quality impact, rework, the Q3-Q5 combined analysis, benefits, barriers, and group breakdowns). Backend aggregation and frontend charts must follow these definitions.
- **`implementation_plan.md`** — the PRD broken into implementation phases, tracked to completion, followed by an ongoing log of post-launch bug fixes and the reasoning behind each one.
