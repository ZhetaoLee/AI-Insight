# Remove "Adoption by level" chart; put AI adoption rate and Level leaderboard side by side; add help icon to AI adoption rate

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: "Adoption by level" (`AdoptionChart.tsx`) is redundant with the "Level leaderboard," which already shows the exact same adoption-rate-per-level data as ranked rows. Requested: delete the chart, place the "AI adoption rate" gauge card and "Level leaderboard" card side by side in its place, and add a help icon to the gauge card using text that (conveniently) already exists in the code, just needs relocating into a tooltip.

## Details

### Current layout, confirmed

`frontend/src/pages/DashboardPage.tsx`'s `.charts-grid` (lines 118-121) has exactly two children:

```tsx
<div className="charts-grid">
  <AdoptionChart groupBreakdown={metrics.group_breakdown} />
  <AdoptionSidePanel adoptionRate={metrics.headline_metrics.ai_adoption_rate} groupBreakdown={metrics.group_breakdown} groupLabel="Level" />
</div>
```

`AdoptionSidePanel.tsx` itself wraps **two** cards — the "AI adoption rate" gauge and the "Level leaderboard" — inside one `.dashboard-side-stack` div that stacks them vertically (lines 17-79). So today's layout is: wide bar chart on the left, a narrow vertical stack of [gauge, leaderboard] on the right.

### Why "Adoption by level" is redundant — confirmed by reading both

`AdoptionChart.tsx` renders one bar per level using `r.adoption_rate` (already simplified to a single series in an earlier fix — it used to also show "Reports more output," which was removed). The "Level leaderboard" (`AdoptionSidePanel.tsx` lines 47-77) renders the **same** `groupBreakdown.rows`, sorted by adoption (`leaderboard-sub`: "By adoption"), showing each level's name and its `r.adoption_rate` as a percentage, color-coded by strength. Both are presenting the identical dataset (`GroupRow.adoption_rate` per level) — one as bars, one as a ranked list — confirming the report's claim that the chart adds no information beyond what the leaderboard already shows.

### This supersedes an earlier, now-moot bug report

`bug/2026-09-02-adoption-by-level-chart-window-and-more-output.md` (filed earlier today) asked to fix this same chart's nested-scroll-window bug and drop its second bar series — and that fix has since landed (confirmed: the chart now has only one bar per level and no horizontal-scroll window). This new request removes the chart entirely, which makes that earlier fix moot going forward — not flagging this as a problem, just noting the relationship since both concern the same component. (Per instructions, only saving this new bug file — not editing that one.)

### Layout: the target "side by side" arrangement doesn't need new CSS

`.charts-grid` (`DashboardPage.css:270-275`) is already `display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr))` — a responsive row. If `AdoptionChart` is removed and `AdoptionSidePanel`'s two cards become direct children of `.charts-grid` instead of being stacked inside their own `.dashboard-side-stack` wrapper, they'll naturally lay out side by side in the same row using the grid that already exists — no new grid needed. Two ways to get there, worth deciding during implementation:
- **Minimal:** change `AdoptionSidePanel`'s root from `<div className="dashboard-side-stack">` to a React Fragment, so its two `.card` elements become direct grid items of `.charts-grid` instead of one wrapped column.
- **Cleaner:** split `AdoptionSidePanel` into two separate components (an adoption-gauge card and a level-leaderboard card), each rendered directly in `DashboardPage.tsx`.

### Help icon — the exact requested copy already exists, just in the wrong place

`AdoptionSidePanel.tsx` lines 42-44, today:

```tsx
<div className="gauge-sub">
  Q1. Any usage other than "Never" counts as an active AI user. Non-respondents are excluded from the denominator.
</div>
```

This is permanently visible text under the gauge — and it's word-for-word the tooltip text requested, minus the "Q1. " prefix. So the fix is straightforward: delete this permanent paragraph, and add a help icon next to the "AI adoption rate" title with that same sentence (prefix dropped) as its tooltip.

The help-icon mechanism itself doesn't need to be built — `frontend/src/components/dashboard/InfoTooltip.tsx` is an existing, already-proven shared component (a small focusable "i" icon with a hover/focus-triggered tooltip bubble), already used by `HeroCards.tsx`, `ComboAnalysisCard.tsx`, and `DistributionPanels.tsx`. `ComboAnalysisCard.tsx` shows the exact pattern to copy for a card header:

```tsx
<div className="combo-card-head">
  <div className="card-title">Productivity payoff analysis</div>
  <InfoTooltip label="Productivity payoff analysis help">{helpText}</InfoTooltip>
</div>
```

`AdoptionSidePanel.tsx` already has an analogous head row (`.gauge-card-head`, wrapping `.gauge-title-block` and a `.gauge-more` "···" placeholder) — adding `<InfoTooltip>` there, next to the title, is a small, well-precedented change, not new infrastructure.

### Tests that reference the chart directly and will need updating

Confirmed several tests read or assert against `AdoptionChart.tsx` by path/content — deleting the component breaks these outright (a file-read failure, not just a failed assertion), not just needing a text tweak:

- `frontend/tests/frontend.test.mjs`, test `"adoption by level chart shows only adoption bars without a nested scroll window"` (lines 339-357) — reads `AdoptionChart.tsx` and `DashboardPage.css` directly and asserts on the chart's content and CSS. This entire test needs removing (or replacing with a test for the new side-by-side layout instead).
- `frontend/tests/frontend.test.mjs`, test `"dashboard removes midpoint-derived weekly hours estimates"` (~line 396 onward) — reads five component files including `AdoptionChart.tsx` and `AdoptionSidePanel.tsx` in one `Promise.all`. The `AdoptionChart.tsx` read needs dropping from that list once the file no longer exists; worth checking what it specifically asserts against that file's content so the equivalent check (if still relevant) moves to wherever that logic ends up.
- `frontend/e2e/survey-dashboard.spec.ts` lines 66-71 — locates `.chart-card` filtered by the text "Adoption by level" and asserts on its legend/bars/overflow. Needs removing; if useful, replace with an assertion that the gauge and leaderboard cards render side by side instead.

### Doc check

No documented spec for this chart exists anywhere in `docs/PRD.md`, `docs/ADR.md`, or `docs/metrics.md` (confirmed when the earlier, now-superseded bug was filed) — it was an implementation choice from the original design source, not a requirement, so removing it doesn't conflict with anything documented.

## Notes

**Files that would need to change:**

1. `frontend/src/components/dashboard/AdoptionChart.tsx` — delete.
2. `frontend/src/components/dashboard/AdoptionSidePanel.tsx` — remove the `.gauge-sub` paragraph; add an `InfoTooltip` next to the "AI adoption rate" title with the requested text (prefix dropped); restructure so its gauge card and leaderboard card render as siblings rather than stacked in `.dashboard-side-stack` (see the two options above).
3. `frontend/src/pages/DashboardPage.tsx` — remove the `AdoptionChart` import and its usage in `.charts-grid`.
4. `frontend/src/pages/DashboardPage.css` — remove now-dead, `AdoptionChart`-only classes (confirmed unused elsewhere): `.chart-card`, `.chart-card-head`, `.chart-legend`, `.legend-dot`, `.bar-chart-area`, `.bar-chart-axis`, `.bar-chart-plot`, `.bar-chart-col`, `.bar-chart-bars`, `.bar-chart-label`, `.chart-hint`; remove or repurpose `.dashboard-side-stack` if nothing ends up using it after the restructure.
5. `frontend/tests/frontend.test.mjs` — remove/replace the `"adoption by level chart..."` test; update the file-read list in the `"dashboard removes midpoint-derived weekly hours estimates"` test to drop `AdoptionChart.tsx`.
6. `frontend/e2e/survey-dashboard.spec.ts` — remove the "Adoption by level" locator and its assertions (lines 66-71); optionally add new assertions for the side-by-side gauge/leaderboard layout.

No backend, database, or docs changes needed — this is a frontend-only removal and layout change; `ai_adoption_rate` and `group_breakdown` (the data both the chart and the leaderboard consume) stay exactly as-is in the API.

## Fix

Removed the redundant "Adoption by level" chart and placed the AI adoption gauge
and Level leaderboard side by side in the existing dashboard grid:

- `frontend/src/components/dashboard/AdoptionChart.tsx`: deleted the redundant
  chart component.
- `frontend/src/pages/DashboardPage.tsx`: removed the `AdoptionChart` import and
  render call.
- `frontend/src/components/dashboard/AdoptionSidePanel.tsx`: changed the
  component to return the gauge card and leaderboard card as sibling grid items.
- `frontend/src/components/dashboard/AdoptionSidePanel.tsx`: moved the AI
  adoption definition into the shared `InfoTooltip` next to the gauge title and
  removed the always-visible explanatory paragraph.
- `frontend/src/pages/DashboardPage.css`: removed dead chart-only styles and the
  old `.dashboard-side-stack`, `.gauge-sub`, and `.gauge-more` styles.
- `frontend/tests/frontend.test.mjs`: replaced the old chart test with coverage
  for the removed chart, side-by-side card structure, and gauge help tooltip.
- `frontend/e2e/survey-dashboard.spec.ts`: updated browser checks to verify the
  chart is absent, the gauge and leaderboard render as direct grid cards, the
  gauge help tooltip opens, and the cards sit side by side on desktop.
- `docs/PRD.md`: replaced chart-oriented adoption/group-breakdown wording with
  gauge, leaderboard, comparison-view, and records wording.

No backend or database change was needed. `AGENTS.md` and `CLAUDE.md` did not
need updates for this frontend-only layout change.

## Verification

Regression coverage was updated first and failed against the old implementation
because `AdoptionChart.tsx` still existed.

Full local verification run on 2026-09-02:

- `uv run --extra dev pytest` — 92 passed
- `npm test` — 21 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Browser-flow verification:

- Playwright submits a survey response and navigates to `/dashboard`.
- The dashboard no longer renders "Adoption by level" or `.chart-card`.
- `.charts-grid` renders exactly two direct cards: the AI adoption gauge and the
  Level leaderboard.
- The gauge card has one shared help icon and no always-visible `Q1.` paragraph.
- Hovering the gauge help icon reveals the tooltip.
- On desktop, the gauge card and leaderboard card render side by side.
