# Remove the "Q3 2026 survey" card at the dashboard sidebar's bottom

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

The bottom-left of the dashboard shows a "Q3 2026 survey" card (response count, response-rate bar, non-respondent count). Requested: remove it.

## Details

Confirmed: the card exists exactly as described, at the bottom of the sidebar.

### Current implementation

`frontend/src/components/dashboard/DashboardSidebar.tsx:41-50`:

```tsx
<div className="sidebar-coverage-card">
  <div className="coverage-card-title">Q3 2026 survey</div>
  <div className="coverage-card-sub">
    {coverage.respondents} of {coverage.eligible_employees} responses collected · {ratePct}% response rate
  </div>
  <div className="coverage-bar-track">
    <div className="coverage-bar-fill" style={{ width: `${ratePct}%` }} />
  </div>
  <div className="coverage-card-foot">{coverage.eligible_employees - coverage.respondents} non-respondents</div>
</div>
```

Its container, `.sidebar-coverage-card` (`DashboardPage.css:152-160`), has `margin-top: auto` inside the sidebar's flex column — that's what pins it to the bottom, confirming "left bottom" placement.

### A concrete correctness problem with the current card, beyond just removing it

The "Q3 2026" in the title is a **hardcoded string, not derived from any config or data** — and it doesn't even match the backend's actual active cycle. `backend/app/config.py:10` sets the real default: `survey_cycle: str = Field(default="2026-h2", ...)`. So today this card would say "Q3 2026 survey" regardless of what cycle is actually active, and right now that's factually `2026-h2`, not Q3 2026. (`docs/PRD.md`/`docs/ADR.md` only ever use "2026-Q3" as an *illustrative example* value for the config — "for example `2026-Q3`" — not a mandate; the backend's real default is different.) This is independent supporting evidence for removing the card rather than trying to keep it accurate.

Related, not part of this bug's scope: `frontend/src/components/dashboard/RecordsTable.tsx:117` has the same category of hardcoded text in its footer — `"Seeded demonstration data · {eligibleTotal} eligible employees · fielded Q3 2026"`. Flagging since it's the same root issue (hardcoded cycle string) elsewhere, but the user only asked about the sidebar card, so not including it in the fix list below.

### Doc requirement check — coverage visibility is required, this specific card is not

`docs/PRD.md` §13.2 "Response Coverage" (lines 572-581) requires that response coverage stay visible somewhere on the dashboard:

```text
8 / 10 employees responded
80% response coverage

Coverage should remain visible so leadership can judge metric reliability.
```

That requirement is satisfied elsewhere already — `frontend/src/components/dashboard/HeroCards.tsx`'s "Response rate" card shows the same respondents/eligible/rate numbers in the main content area, independent of this sidebar card. So removing the sidebar card doesn't violate §13.2; the data isn't disappearing from the dashboard, just from this one duplicate location. (Cross-reference: `bug/2026-09-02-hero-cards-redesign.md`, filed earlier today, proposes reworking that same hero card into plain "Employees"/"Respondents"/"Active AI Users" counts — if both bugs are fixed, coverage-type numbers will still exist there, just not as a combined rate sentence. Noting the overlap so the two fixes aren't planned in isolation.)

### Tests

No test references `sidebar-coverage-card`, `coverage-card-title/sub/foot`, `coverage-bar-track/fill`, or "Q3 2026" anywhere in `frontend/tests/` or `frontend/e2e/` — nothing to update.

### Cleanup once the card is removed

- The `coverage` prop passed into `<DashboardSidebar>` (`DashboardPage.tsx:122`, `coverage={metrics.coverage}`) is used **only** to render this card (`ratePct` and the JSX above) — nothing else in `DashboardSidebar.tsx` reads it. Removing the card should also remove the now-unnecessary `coverage` prop from `DashboardSidebarProps`, its `Coverage` type import, and the prop passed at the call site.
- Confirmed via search that `.sidebar-coverage-card`, `.coverage-card-title`, `.coverage-card-sub`, `.coverage-bar-track`, `.coverage-bar-fill`, and `.coverage-card-foot` are used nowhere else in the codebase — safe to delete entirely, not just the JSX block.

## Files that need to change to fix this

1. **`frontend/src/components/dashboard/DashboardSidebar.tsx`** — remove the `.sidebar-coverage-card` JSX block (lines 41-50) and the `ratePct` calculation that only feeds it; remove the `coverage` prop from `DashboardSidebarProps` and its `Coverage` import if nothing else in the file needs it.
2. **`frontend/src/pages/DashboardPage.tsx`** — remove the `coverage={metrics.coverage}` prop passed to `<DashboardSidebar>` (line 122).
3. **`frontend/src/pages/DashboardPage.css`** — remove the now-dead `.sidebar-coverage-card`, `.coverage-card-title`, `.coverage-card-sub`, `.coverage-bar-track`, `.coverage-bar-fill`, `.coverage-card-foot` rules (`DashboardPage.css:152-193`).

No backend, database, or test changes needed. Worth a quick look at `bug/2026-09-02-hero-cards-redesign.md` alongside this one since both touch where coverage/response numbers surface on the dashboard.

## Fix

The sidebar coverage card was removed by the shared sidebar/navigation implementation. The current sidebar is shared app chrome with only two route links:

- `Dashboard`
- `Survey`

Confirmed fixed in the current code:

- `frontend/src/components/dashboard/DashboardSidebar.tsx` no longer accepts a `coverage` prop.
- `frontend/src/components/dashboard/DashboardSidebar.tsx` no longer renders `Q3 2026 survey`.
- `frontend/src/pages/DashboardPage.tsx` no longer passes `coverage={metrics.coverage}` to the sidebar.
- `frontend/src/pages/DashboardPage.css` no longer contains `.sidebar-coverage-card`, `.coverage-card-title`, `.coverage-card-sub`, `.coverage-bar-track`, `.coverage-bar-fill`, or `.coverage-card-foot`.
- `frontend/e2e/survey-dashboard.spec.ts` verifies `Q3 2026 survey` is absent from both `/survey` and `/dashboard`.
- `frontend/tests/frontend.test.mjs` has source-level regression coverage that the sidebar no longer contains `coverage` or `Q3 2026 survey`.

To preserve `docs/PRD.md` §13.2's requirement that response coverage remains visible, coverage now appears in the dashboard content area as `Response coverage`, not in the sidebar.

No backend, database, `AGENTS.md`, or `CLAUDE.md` change was needed.

## Verification

Full local verification run on 2026-09-02:

- `uv run pytest` — 91 passed
- `npm test` — 16 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Local app verification:

- Docker Compose is running with frontend, backend, and MongoDB healthy.
- `/dashboard` and `/survey` are reachable locally.
