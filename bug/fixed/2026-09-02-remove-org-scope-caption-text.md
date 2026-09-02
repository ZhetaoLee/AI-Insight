# Remove the "All employees. Every rate is computed..." caption text from the dashboard

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the exact quoted text — "All employees. Every rate is computed from individual responses in scope, never averaged up from group percentages." — exists in the code, rendered as the subtitle caption under the "Executive overview" heading whenever the dashboard's hierarchy scope is org-wide (i.e. the Organization root is selected in the sidebar tree). Removing it is a straightforward text change, but what should appear in its place (if anything) is not specified by the report and is flagged below as an open decision.

## Details

### Confirmed: exact location and condition

`frontend/src/pages/DashboardPage.tsx:59-64`:

```tsx
const scopeCaption =
  scopeType === "org"
    ? "All employees. Every rate is computed from individual responses in scope, never averaged up from group percentages."
    : scopeType === "manager"
      ? `Manager scope: ${managerName} plus all descendants, resolved to individual responses.`
      : `Level scope: all employees at ${LEVEL_LABELS[level]}, resolved to individual responses.`;
```

This is only the `scopeType === "org"` branch — the caption is org-scope-specific. It's rendered at `DashboardPage.tsx:81`:

```tsx
<div className="content-heading">
  <div className="content-title">Executive overview</div>
  <div className="content-caption">{scopeCaption}</div>
</div>
```

So today: viewing org-wide data shows this exact sentence under "Executive overview"; switching to a manager subtree or a level shows a different, shorter caption ("Manager scope: David Kim plus all descendants..." / "Level scope: all employees at Manager...") that is unaffected by this report — only the org-scope text is named in the request.

### Nothing in the docs mandates this exact wording

Searched `docs/PRD.md`, `docs/ADR.md`, and `docs/metrics.md` for this sentence or any spec of the caption's content — no match. This text is presentation copy, not a documented API contract or acceptance criterion. It does loosely restate the architectural principle in `CLAUDE.md` #1 ("never compute a higher-level metric by averaging lower-level percentages") in user-facing language, but removing the UI sentence has no effect on that underlying computation guarantee, which lives in the backend `MetricsAggregator`/`ScopeResolver`, not in this caption string.

### Open question: what replaces it

The report says "remove" this text but doesn't say what the org-scope caption should become. Two straightforward options, worth deciding explicitly before implementing:
1. Leave the caption area blank for org scope (the `.content-caption` div renders empty, or is omitted entirely, only when `scopeType === "org"`), while the manager/level captions keep their existing explanatory text.
2. Replace it with a shorter caption consistent in tone with the manager/level ones (e.g. something naming "Organization" the way `"Manager scope: ..."` names the manager), rather than leaving a visibly empty gap next to "Executive overview."

This report only confirms the text should go; picking between "blank" and "replaced with something shorter" is an implementation decision.

### Existing tests assert this exact text and would need updating

- `frontend/e2e/survey-dashboard.spec.ts:111` — asserted visible right after the dashboard loads (default org scope).
- `frontend/e2e/survey-dashboard.spec.ts:118` — asserted again after clicking "Organization" then toggling out of and back into hierarchy mode.

Both would need to be rewritten (or removed, if the caption becomes blank) to match whatever replaces this text.

## Notes

**Files that need to change:**

1. `frontend/src/pages/DashboardPage.tsx` — remove or replace the `scopeType === "org"` branch of `scopeCaption` (lines 59-64).
2. `frontend/e2e/survey-dashboard.spec.ts` — update the two assertions (lines 111, 118) that check for this exact text.

No backend, database, or documentation changes are needed — this is frontend-only presentation copy with no documented spec backing the current wording.

## Fix

- Went with option 1 from the "open question" above: the report said "remove," so the org-scope caption is now genuinely blank rather than replaced with new unrequested copy. `DashboardPage.tsx`'s `scopeCaption` now returns `""` for `scopeType === "org"` (the manager/level branches are unchanged).
- `DashboardPage.tsx` no longer unconditionally renders the `.content-caption` div — it's now `{scopeCaption && <div className="content-caption">{scopeCaption}</div>}`, so org scope shows just the "Executive overview" title with no empty line/gap beneath it, instead of an empty caption element taking up space.
- `frontend/e2e/survey-dashboard.spec.ts` — replaced both assertions of the removed text (lines 111, 118 in the prior version) with `await expect(page.locator(".content-caption")).toHaveCount(0);` at the same points in the flow (after clicking back to "Organization," and after toggling Level mode back into Hierarchy mode), confirming the caption element is genuinely absent for org scope rather than just checking for missing text.
- No backend, database, or documentation changes were needed, matching the original analysis; the local database was confirmed clean (0 survey responses, seeded employees intact) after verification.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 33 tests pass (unaffected; no unit test referenced this caption text).
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 95 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes against the full Docker Compose stack, confirming `.content-caption` is absent for org scope at both points in the flow.
- Local Docker Compose stack (`docker compose up --build -d`) confirmed healthy afterward (`/health` returns `{"status":"ok"}`, frontend responds `200`, `survey_responses` collection empty) for manual browser verification at `http://localhost:5173`.
