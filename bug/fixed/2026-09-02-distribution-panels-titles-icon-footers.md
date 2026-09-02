# The six distribution panels: better titles, help icons, remove "Q# · N = X", make footers fact-based

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed for all six panels ("Weekly time saved," "Work output impact," "Work quality impact," "AI rework frequency," "Primary benefits," "Barriers"): each shows a "Q# · N = X" eyebrow line to remove, none has a help icon, and two of the six already compute a real statistic for their footer while the other four show generic, non-computed description text that should be replaced with actual facts from the data, the same way the two good ones already do it.

## Details

### All six panels share one component — confirmed current state

`frontend/src/components/dashboard/DistributionPanels.tsx`'s `PanelCard` (lines 23-55) renders every panel identically: `panel.title`, then `panel.source` in the uppercase-styled eyebrow (`.card-eyebrow`, same styling as the other two cards already reported today), then rows, then `panel.foot`. The six `PanelDef` entries (lines 76-131):

| Title (current) | `source` (eyebrow, renders uppercase) | `foot` today |
|---|---|---|
| Weekly time saved | `Q3 · n = {denominator}` | *Methodology note* — "Midpoints 0/0.5/3/8 hours..." |
| Work output impact | `Q4 · n = {denominator}` | **Fact** — `"{pct}% report more output than before AI."` |
| Work quality impact | `Q5 · n = {denominator}` | **Fact** — `"{pct}% report better quality; the rest see..."` |
| AI rework frequency | `Q6 · n = {denominator}` | *Generic description* — "How often respondents correct or rewrite AI output. Red bands are the review burden." |
| Primary benefits | `Q7 · n = {denominator}` | *Generic description* — "Single choice, sorted by count descending. Hover 'Other'..." |
| Barriers | `Q8 · multi-select · n = {denominator}` | *Generic description* — "One respondent may contribute to several barriers..." |

The "Q6 · N = 3" the report quotes is the eyebrow for "AI rework frequency" specifically (rendered uppercase from `Q6 · n = {denominator}` — confirmed the same `.card-eyebrow` uppercase mechanism as the other two cards reported today), but the request is to remove this line from all six, not just that one.

### The "fact-based footer" request — two panels already do exactly this; four don't

Confirmed: "Work output impact" and "Work quality impact" already compute a real statistic for their footer — `moreOutputPct` and `betterQualityPct` (lines 70-74) are derived live from the actual response rows (summing counts for specific answer codes and dividing by respondents). These are good examples of what the other four panels should do instead of their current generic, non-computed text:

- **"AI rework frequency"** — currently just describes what the chart is, generically. A fact-based replacement is straightforward: the same summing pattern already used for `betterQualityPct` (codes `often`/`almost_always`, i.e. the same `FREQUENT_REWORK_CODES` concept already computed per-group in `RecordsTable`/backend `_group_breakdown`, just not yet at the whole-scope level shown here) would give e.g. "{pct}% report frequent rework (often or almost always)." No backend change needed — `metrics.ai_rework_frequency.rows` already has per-option counts to sum client-side, exactly like the two working examples.
- **"Primary benefits"** — `metrics.benefits.rows` is already sorted by count descending (confirmed in the backend aggregator), so `rows[0]` is already the top answer. A fact-based footer could be e.g. "{top benefit label} is the most common answer, at {pct}%." — no new computation needed, just reading the row that's already first.
- **"Barriers"** — same idea: `metrics.barriers.rows[0]` is already the most-selected barrier; footer could read e.g. "{top barrier label} is the most cited barrier, at {pct}%."
- **"Weekly time saved"** — **this one has a dependency**: its current footer text references `avg_weekly_hours_saved.denominator`, and `bug/2026-09-02-remove-average-weekly-time-saved.md` (filed earlier today, still open) removes that field entirely. Whoever picks up either bug should coordinate — once the average is gone, a fact-based replacement here would need a different statistic, e.g. highlighting the dominant bucket ("{top bucket label} is the most common answer, at {pct}%," matching the pattern used for benefits/barriers above) rather than referencing an average that will no longer exist.

### Doc check — none of this is a documented requirement

`docs/metrics.md`'s Q3-Q8 sections only specify the underlying formulas (option percentages, code inclusion/exclusion rules) — nothing about eyebrow text, help icons, or footer wording. The current panel titles already track the docs' own section names reasonably closely (e.g. doc says "Q6. AI Rework Frequency," current title is "AI rework frequency") — unlike the "Dynamic Q3–Q5 analysis" card reported earlier today, these titles aren't especially jargon-heavy already, so this is more a refinement than an overhaul. Candidate lighter-touch alternatives, for you to pick from:

| Current | Candidate |
|---|---|
| Weekly time saved | *(fine as-is; alt: "Time saved per week")* |
| Work output impact | "Output impact" *(shorter, same meaning)* |
| Work quality impact | "Quality impact" *(shorter, same meaning)* |
| AI rework frequency | "Rework burden" *(ties to the "hidden cost" framing already in its current footer)* |
| Primary benefits | "Where AI helps most" |
| Barriers | "What's limiting AI value" |

Not prescribing these — happy to go with whichever set you prefer, including leaving some titles unchanged.

### Help icon — third report today asking for the same thing

Same request as the two cards already reported today (`bug/2026-09-02-combo-analysis-card-title-and-help-icon.md`, `bug/2026-09-02-value-area-ranking-card-ux.md`), now needed on six more cards. This is the strongest signal yet that the `HeroCards.tsx` `.hero-help`/`.hero-tooltip` pattern should be generalized into a reusable piece once (see those two bug files for the detail) rather than solved a third time independently — with 8 total cards now wanting the same interaction (3 Employees/Respondents/Active AI Users cards that already have it, plus these 6 needing it, plus the combo-analysis card), a shared component clearly pays for itself.

### Tests

Confirmed via search: no test references any of these six panels' titles, eyebrow text, or footer text. Two unrelated test hits for the string "Barriers" (`frontend/tests/frontend.test.mjs:322`, `frontend/e2e/survey-dashboard.spec.ts:16`) are about the **sidebar nav** no longer having a "Barriers" item (from an earlier, separate sidebar-simplification fix) — not this panel card. Nothing to update.

## Notes

**Files that would need to change:**

1. `frontend/src/components/dashboard/DistributionPanels.tsx` — remove the `source`/eyebrow field's rendering (or the field entirely) for all six panels; update `title` strings per whichever candidates are chosen; add a help icon with an explanatory tooltip to each panel's header; replace the four generic `foot` strings with fact-based ones computed from existing row data (patterns above), consistent with how the two working panels already do it.
2. `frontend/src/pages/DashboardPage.css` — help-icon styles, ideally the same generalized/shared ones from the other two open help-icon bugs rather than a fourth copy.

**Related, worth sequencing together:**
- `bug/2026-09-02-combo-analysis-card-title-and-help-icon.md` and `bug/2026-09-02-value-area-ranking-card-ux.md` — same help-icon need; good candidates to implement as one shared component alongside this.
- `bug/2026-09-02-remove-average-weekly-time-saved.md` — the "Weekly time saved" panel's footer text directly depends on a field that bug removes; implement together or the footer rewrite will need redoing.

No backend, database, or docs changes needed — every suggested fact-based footer is computable from data already present in the existing `/api/metrics` response.

## Fix

Updated the six distribution panels to remove implementation-oriented chrome and make each panel read as a leadership-facing card:

- `frontend/src/components/dashboard/DistributionPanels.tsx`: removed the `source` field and the `card-eyebrow` rendering from distribution panels.
- `frontend/src/components/dashboard/DistributionPanels.tsx`: added the shared `InfoTooltip` help icon to every panel header.
- `frontend/src/components/dashboard/DistributionPanels.tsx`: updated panel titles to `Time saved per week`, `Output impact`, `Quality impact`, `Rework burden`, `Where AI helps most`, and `What's limiting AI value`.
- `frontend/src/components/dashboard/DistributionPanels.tsx`: replaced generic default footer text with facts computed from current metric rows:
  - top weekly time-saved bucket,
  - percent reporting more output,
  - percent reporting better quality,
  - percent reporting frequent rework,
  - top primary benefit,
  - top cited barrier.
- `frontend/src/pages/DashboardPage.css`: updated `.panel-head` so titles and help icons align cleanly.
- `frontend/tests/frontend.test.mjs`: added source-level regression coverage for clear titles, no eyebrow/source field, shared tooltip usage, and fact-based footer copy.
- `frontend/e2e/survey-dashboard.spec.ts`: added browser checks for all six panel titles, no `Q# · n` eyebrow text, six help icons, fact-based footer text, and tooltip hover behavior.

The existing `Other` hover behavior remains: when an `Other` row with submitted text is hovered, the panel footer temporarily shows the submitted free-text summary.

No backend, database, docs, `AGENTS.md`, or `CLAUDE.md` change was needed.

## Verification

Initial regression coverage failed before the implementation:

- `npm test`

Full local verification run on 2026-09-02:

- `uv run pytest` — 91 passed
- `npm test` — 19 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Live-flow verification:

- Playwright submits a survey response and navigates to `/dashboard`.
- The distribution grid renders exactly six panel cards.
- Each distribution panel has one help icon.
- Distribution panel eyebrow lines are absent.
- The six leadership-facing titles render.
- Generic footer strings are absent.
- Fact-based footer text renders for common answer, frequent rework, and top barrier.
- Hovering a distribution panel help icon reveals the tooltip.
