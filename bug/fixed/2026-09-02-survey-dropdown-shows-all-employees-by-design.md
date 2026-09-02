# Survey name dropdown always shows all 10 employees, even after they've responded

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

The survey name dropdown previously listed every seeded employee even after that employee had already submitted for the active survey cycle. The intended product behavior is now one accepted response per employee per active cycle: submitted employees are hidden from new survey submissions, and direct duplicate API submissions are rejected with `409 Conflict`.

## Fix

- Added `GET /api/survey-responses/submitted-employee-ids` so the frontend can load active-cycle submitted employee IDs separately from the static employee directory.
- Changed `POST /api/survey-responses` from replace-on-resubmit behavior to insert-only behavior with duplicate active-cycle submissions rejected as `409 Conflict`.
- Updated the survey page to fetch submitted employee IDs and pass only available employees to the name picker.
- Kept local demo fallback behavior consistent by reading submitted IDs from `localStorage` and rejecting duplicate local submissions.
- Updated the E2E test setup to reset the Docker Compose Mongo volume so no prior submitted-response state leaks between smoke-test runs.
- Updated public docs and local agent guidance to reflect submitted-employee filtering and duplicate-response rejection.

## Local Verification

- `cd backend && uv run --extra dev pytest`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`

The Playwright smoke test submits as `Alice Chen`, returns to `/survey`, and verifies `Alice Chen` is no longer present in the `Your name` dropdown.
