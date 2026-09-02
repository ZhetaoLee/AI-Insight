# "Adoption by level" chart has a stray scroll window, and should drop "Reports more output"

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Two issues in the "Adoption by level" chart (`AdoptionChart.tsx`): confirmed it has a leftover horizontal-scroll container ("window") that's no longer needed now that this chart only ever renders 4 columns, and it currently shows a second "Reports more output" series that should be removed, leaving just the AI adoption rate bars.

## Details

### Issue 1 — the chart has a stray scrollable "window"

Confirmed: `frontend/src/pages/DashboardPage.css` gives the chart's plotting area its own nested horizontal scrollbar:

```css
.bar-chart-area {                    /* line 330 */
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;                  /* <- creates a scrollable "window" */
}

.bar-chart-plot {                    /* line 350 */
  display: flex;
  ...
  min-width: 390px;                  /* <- forces that window to appear */
  ...
}
```

`.charts-grid` (line 269) lays this chart card out with `grid-template-columns: repeat(auto-fit, minmax(330px, 1fr))` — meaning the card itself can legitimately render as narrow as 330px. Once you subtract the card's own padding (`22px 24px`, `chart-card` line 282-287) and the 34px+10px axis column, the actual space left for `.bar-chart-plot` can easily be well under its own `min-width: 390px` — so the browser has no choice but to show a horizontal scrollbar/clipped viewport inside the chart, i.e. a "window" nested inside the card, exactly as reported. This isn't a rare edge case; it's the normal outcome any time the card renders anywhere near its own minimum width.

**Root cause:** `min-width: 390px` looks like a leftover from the chart's original design source (the Claude Design mock-up this dashboard was implemented from), which was built to comfortably fit up to 7 columns — the original demo data had 7 departments. Department grouping was removed from the dashboard in an earlier fix (`bug/fixed/2026-09-01-dashboard-department-grouping.md`), and the chart has only ever grouped by `level` since — which is capped at 4 possible values (`senior_director`, `director`, `manager`, `ic`; confirmed via `LEVEL_ORDER` in `backend/app/services/metrics.py`). A fixed `min-width` sized for 7 columns no longer makes sense for a chart that can only ever show 4, and is what's forcing the unnecessary scroll window.

### Issue 2 — "Reports more output" should be removed from this chart

Confirmed: `frontend/src/components/dashboard/AdoptionChart.tsx` currently renders two series per level, not one:

- Legend (lines 22-31): both "AI adoption rate" (green dot) and "Reports more output" (light-green dot).
- Each bar column (lines 52-55): two bars side by side — `r.adoption_rate` and `r.more_output_rate`.
- The hover-hint text (line 15): `"... adoption {rate}% · more output {rate}% · ..."`.

Removing "Reports more output" here means dropping its legend entry, its bar from each column, and its clause from the hint text — leaving one bar per level (adoption rate only).

**Scope check — this is narrower than it might look:** `more_output_rate` (`GroupRow.more_output_rate`) is still used elsewhere and should **not** be removed from the backend or types: `frontend/src/components/dashboard/RecordsTable.tsx` has its own separate "Reports more output" column (line 16) that's unaffected by this request — the user specifically said "in Adoption by level," and nothing suggests the table column should also go. So this is purely a rendering change inside `AdoptionChart.tsx`, not a data-model change.

**Doc/test check:** there's no documented spec for this specific chart anywhere in `docs/PRD.md`, `docs/ADR.md`, or `docs/metrics.md` — it (like the rest of the dashboard's chart choices) came entirely from the Claude Design source, not a PRD requirement, so removing one of its series doesn't conflict with anything documented. No test references `AdoptionChart`'s legend or bars at all (confirmed via search) — the only related test, `frontend/tests/frontend.test.mjs:283`, checks that "Reports more output" was removed from `HeroCards` (a separate, already-fixed bug), not from this chart.

## Notes

**Files that would need to change:**

1. `frontend/src/pages/DashboardPage.css` — remove or reduce `.bar-chart-plot`'s `min-width: 390px` (line 356) so it fits within the card at its actual minimum width instead of forcing `.bar-chart-area`'s `overflow-x: auto` (line 335) to kick in; 4 columns' worth of width is all that's ever needed now. Worth also revisiting `.bar-chart-bars > div`'s `width: 26%` (line 382), which was sized for two side-by-side bars per column — once only one bar remains per column (see Issue 2), that ratio may want adjusting so the single remaining bar isn't awkwardly narrow.
2. `frontend/src/components/dashboard/AdoptionChart.tsx` — remove the "Reports more output" legend item (part of lines 22-31), remove its bar from the per-column render (part of lines 52-55), and drop the "· more output {rate}%" clause from the hover-hint text (line 15).

No backend, database, docs, or test changes needed — `more_output_rate` stays exactly as-is in the API/types for `RecordsTable`'s separate column; this is a frontend-only rendering and layout fix scoped to `AdoptionChart.tsx` and its CSS.

## Fix

Updated the `Adoption by level` chart so it is focused on AI adoption only:

- `frontend/src/components/dashboard/AdoptionChart.tsx`: removed the `Reports more output` legend item.
- `frontend/src/components/dashboard/AdoptionChart.tsx`: removed the second per-level bar that used `more_output_rate`.
- `frontend/src/components/dashboard/AdoptionChart.tsx`: removed the `more output` clause from the hover hint.
- `frontend/src/pages/DashboardPage.css`: removed the chart area's forced `overflow-x: auto`.
- `frontend/src/pages/DashboardPage.css`: replaced the plot's old `min-width: 390px` with `min-width: 0` so the four-level chart can fit inside the card.
- `frontend/src/pages/DashboardPage.css`: widened the single remaining adoption bar from the old two-series width.
- `frontend/tests/frontend.test.mjs`: added source-level regression coverage for the one-series chart and removal of the nested scroll-window CSS.
- `frontend/e2e/survey-dashboard.spec.ts`: added browser checks that the `Adoption by level` card has no `Reports more output` label, has one legend item, renders four adoption bars, and does not horizontally overflow.

`more_output_rate` remains in the frontend type and backend API because `frontend/src/components/dashboard/RecordsTable.tsx` still uses it for the separate `Reports more output` table column.

No backend, database, docs, `AGENTS.md`, or `CLAUDE.md` change was needed.

## Verification

Initial regression coverage failed before the implementation:

- `npm test`

Full local verification run on 2026-09-02:

- `uv run pytest` — 91 passed
- `npm test` — 17 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Live-flow verification:

- Playwright submits a survey response and navigates to `/dashboard`.
- Playwright scopes assertions to the `Adoption by level` chart card.
- The chart has one legend item and four adoption bars.
- The chart card does not contain `Reports more output`.
- The chart area does not horizontally overflow.
