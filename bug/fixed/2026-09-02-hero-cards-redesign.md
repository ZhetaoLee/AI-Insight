# Dashboard hero cards: wrong set of metrics, too much per-card clutter

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

The dashboard's top KPI row shows four rate/average cards ("Response rate", "AI adoption rate", "Avg weekly time saved", "Reports more output"), each with a fraction pill, a sparkline, and explanatory text. Requested: three plain-count cards ("Employees", "Respondents", "Active AI Users"), each just a number with a hover-triggered help icon instead of the pill/sparkline/explanation.

## Details

Confirmed: current state matches what was reported, and the requested change is well-grounded in the project's own docs.

### Current implementation

`frontend/src/components/dashboard/HeroCards.tsx:41-94` defines exactly four cards:

| # | `label` | value shown | extra elements |
|---|---|---|---|
| 0 | "Response rate" | `%` of coverage.response_rate | pill `respondents/eligible`, sparkline by group, hover-swapped sub-text |
| 1 | "AI adoption rate" | `%` of headline.ai_adoption_rate | pill `count/denominator`, sparkline, hover-swapped sub-text |
| 2 | "Avg weekly time saved" | hrs, headline.avg_weekly_hours_saved | pill `n = denominator`, sparkline, hover-swapped sub-text |
| 3 | "Reports more output" | `%` of headline.reports_more_output | pill `count/denominator`, sparkline, hover-swapped sub-text |

Each card (`hero-card` in the same file, lines 104-135) renders: label + pill (`.hero-pill`), value + unit, a per-group sparkline (`.hero-spark` / `.spark-bar`), and a sub-text line (`.hero-sub`) that swaps between a default explanation and a hover explanation via local `hovered` state.

### What the docs actually specify

`docs/PRD.md` §13.1 "Header Metrics" (lines 550-568) lists the intended primary KPI cards:

```text
Eligible Employees
Respondents
Response Rate
Active AI Users
AI Adoption Rate
Average Weekly Time Saved
```

The current implementation only ever surfaces 3 of these 6 as standalone cards (Response Rate, AI Adoption Rate, Average Weekly Time Saved) and adds a fourth metric, **"Reports more output," that isn't in this list at all** — it was invented during implementation, not spec'd. Meanwhile "Eligible Employees," "Respondents," and "Active AI Users" — three metrics PRD §13.1 explicitly names — are never shown as their own cards; their values only exist buried inside other cards' pills (e.g., `Respondents`/`Eligible Employees` inside the "Response rate" pill, `Active AI Users` count inside the "AI adoption rate" pill).

So the requested 3-card redesign ("Employees," "Respondents," "Active AI Users" as plain numbers) is **closer to the documented spec than the current implementation**, not a deviation from it — it picks up three named-but-missing metrics and drops the one that was never spec'd.

On dropping the `X / Y` pill specifically: PRD §13.1 also says "Each metric should also display the number of valid respondents when useful" — but that guidance exists to give *rate* metrics a credibility denominator (e.g., "83% — but only n=6"). It doesn't apply the same way to metrics that are already raw counts. It's also not a source of lost information: `frontend/src/components/dashboard/DashboardSidebar.tsx`'s coverage card already shows `{respondents} of {eligible_employees} responses collected · {rate}% response rate` with a progress bar, elsewhere on the same screen — so removing the pill from the hero cards doesn't remove that context from the dashboard, it removes a duplicate of it.

### Data availability — no backend or type changes needed

All three requested numbers already exist in the metrics response, both frontend and backend:

- `metrics.population.eligible_employees` (or `coverage.eligible_employees`, same value)
- `metrics.population.respondents`
- `metrics.population.active_ai_users`

Confirmed present in `frontend/src/types/metrics.ts`'s `Population`/`Coverage` interfaces and the matching `backend/app/models/metrics.py` Pydantic models — this is a purely frontend/presentational change; no API, backend, or database work is needed.

### What breaks and needs a design decision: per-section hero visibility

`frontend/src/pages/DashboardPage.tsx:21-29` (`HERO_PICK`) currently maps sidebar nav sections to *indices* into the 4-card array, tied to the current cards' meanings:

```ts
const HERO_PICK: Record<NavSection, number[]> = {
  Dashboard: [],
  Adoption: [1],              // "AI adoption rate"
  "Value areas": [1, 2],      // "AI adoption rate" + "Avg weekly time saved"
  "Time saved": [2],          // "Avg weekly time saved"
  "Output & quality": [3],    // "Reports more output"
  Barriers: [1, 3],           // "AI adoption rate" + "Reports more output"
  Respondents: [0],           // "Response rate"
};
```

With only 3 cards, and cards 2-3's *metrics* (time saved, more-output) gone entirely, this mapping can't just be re-indexed — the semantics changed. "Employees/Respondents/Active AI Users" are general population context, not per-topic metrics, so it's a real open question whether they should still vary by nav section at all, or just always show all three regardless of section (simpler, and arguably more correct now that they're not topic-specific). Flagging this as a decision needed during implementation, not resolving it here.

### Tests that will break

`frontend/e2e/survey-dashboard.spec.ts:30-31` asserts the old labels are visible after navigating to the dashboard:

```ts
await expect(page.getByText("Response rate", { exact: true })).toBeVisible();
await expect(page.getByText("AI adoption rate", { exact: true }).first()).toBeVisible();
```

These will fail once the cards are renamed and need updating to assert "Employees" / "Respondents" / "Active AI Users" instead. `frontend/tests/frontend.test.mjs` has no direct HeroCards assertions (it only tests pure logic, not rendered components), so nothing there needs to change.

### No existing help-icon/tooltip pattern to reuse

Searched the dashboard component tree and CSS for any existing tooltip or info-icon convention — there isn't one. The closest existing pattern is unrelated: several charts (`ValueAreaRankingCard`, `DistributionPanels`) reveal "Other" free-text detail by hovering an entire row and swapping a footer line, not a dedicated icon with a floating tooltip bubble. Implementing "a small icon top-right of each card, hover reveals an explanation" is a net-new UI element — likely a small reusable piece (e.g., a `title`-attribute-based native tooltip, or a purpose-built absolutely-positioned tooltip bubble triggered by icon hover state) plus new CSS, not a matter of reusing something that already exists.

### Dead code once this lands

Once the pill/sparkline/sub-text are removed, `.hero-pill`, `.hero-spark`, `.spark-bar`, and `.hero-sub` (`frontend/src/pages/DashboardPage.css:374-422` approx.) become dead — confirmed via search that none of the four classes are referenced anywhere outside `HeroCards.tsx`.

## Files that need to change to fix this

1. **`frontend/src/components/dashboard/HeroCards.tsx`** — replace the 4 rate/average card definitions with 3 plain-count cards (Employees / Respondents / Active AI Users) sourced from `metrics.population`; drop the pill, sparkline, and hover-swapped sub-text rendering; add a help/info icon (top-right of each card) with hover-triggered explanatory text per card.
2. **`frontend/src/pages/DashboardPage.tsx`** — update (or reconsider entirely, per the open question above) `HERO_PICK`'s per-nav-section index mapping now that there are 3 cards with different meanings than before.
3. **`frontend/src/pages/DashboardPage.css`** — remove the now-dead `.hero-pill`, `.hero-spark`, `.spark-bar`, `.hero-sub` rules; add new rules for the help icon and its tooltip.
4. **`frontend/e2e/survey-dashboard.spec.ts`** — update the two label assertions (lines 30-31) to the new card titles.
5. **Optional / worth considering alongside**: `docs/PRD.md` §13.1 doesn't need factual correction (the new design fits it better than the old one already does), but could be tightened to explicitly say which of the six listed metrics get standalone cards vs. which live inside others, so this doesn't drift again.

## Fix

Replaced the cluttered four-card KPI row with three plain population count cards:

- `Employees`
- `Respondents`
- `Active AI Users`

Each card now shows only the count for the selected dashboard scope plus a hover/focus help icon with explanatory text. The old fraction pills, sparklines, card subtext, and topic-specific hero-card index mapping were removed.

Implementation notes:

- `frontend/src/components/dashboard/HeroCards.tsx`: replaced the old rate/average cards with three count cards sourced from `metrics.population`.
- `frontend/src/pages/DashboardPage.tsx`: removed `HERO_PICK`; the three population cards now stay visible across dashboard sections because they describe the active scope, not a topic-specific metric.
- `frontend/src/pages/DashboardPage.css`: removed dead `.hero-pill`, `.hero-spark`, `.spark-bar`, and `.hero-sub` rules; added `.hero-help` and `.hero-tooltip`.
- `frontend/tests/frontend.test.mjs`: added source-level regression coverage for the new card set and removal of old clutter.
- `frontend/e2e/survey-dashboard.spec.ts`: updated dashboard assertions to expect the three new card labels, verify exactly three hero cards/help icons, and verify tooltip hover behavior.
- `docs/PRD.md`: clarified §13.1 so the initial dashboard's standalone header cards are the three plain population counts, while rate/average metrics remain in the existing coverage, chart, analysis, and records sections.

No backend or database changes were needed because `eligible_employees`, `respondents`, and `active_ai_users` already exist in the `/api/metrics` response.

No `AGENTS.md` or `CLAUDE.md` change was needed because this fix did not alter implementation workflow or architecture guidance.

## Verification

Initial regression test failed before the implementation:

- `npm test`

After implementation, frontend regression testing passed.

Full local verification run on 2026-09-02:

- `uv run pytest`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `git diff --check`

Live-flow verification:

- Playwright verifies the dashboard shows `Employees`, `Respondents`, and `Active AI Users`.
- Playwright verifies exactly three hero cards and three help icons render.
- Playwright verifies hovering a help icon reveals the tooltip.
