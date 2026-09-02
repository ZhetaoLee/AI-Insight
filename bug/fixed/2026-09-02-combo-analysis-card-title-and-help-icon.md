# "Dynamic Q3–Q5 analysis" card: needs a better title, drop the subtitle, add a help icon

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the combo-analysis card (`ComboAnalysisCard.tsx`) is titled "Dynamic Q3–Q5 analysis" with a "Combine one option from each question" subtitle and no explanation icon — three requested changes: a clearer, leadership-facing title; drop the subtitle; add a hover help icon like the one already on the Employees/Respondents/Active AI Users cards.

## Details

### Current state, confirmed

`frontend/src/components/dashboard/ComboAnalysisCard.tsx:24-27`:

```tsx
<div>
  <div className="card-title">Dynamic Q3–Q5 analysis</div>
  <div className="card-eyebrow">Combine one option from each question</div>
</div>
```

`.card-eyebrow` (`DashboardPage.css:574-581`) is styled `text-transform: uppercase`, which is why the subtitle appears on screen as "COMBINE ONE OPTION FROM EACH QUESTION" even though the source string is normal case — same text, just rendered in caps.

There's no help icon anywhere on this card today.

### What the card actually does (for grounding a better title)

It lets leadership pick one target answer each for Q3 (weekly time saved), Q4 (work output impact), and Q5 (work quality impact), then shows what percentage of respondents match all three simultaneously. In plain terms: it answers "of the people who saved real time, how many *also* produced more output *and* better quality" — i.e., whether time savings are actually converting into a compounded productivity win, not just an isolated time-saved number. "Q3–Q5" is survey-question numbering, meaningful to whoever built the survey, not obviously meaningful to a leadership audience reading the dashboard.

**Candidate replacement titles** (for you to pick from, not decided here):
- **"Productivity payoff analysis"** — direct read on "does time saved translate into real output/quality gains."
- "Time savings & output impact match"
- "Compounded productivity analysis"
- "Does time saved translate to results?" (question-style, matches how some of the other cards frame things)

Leaning toward the first as the clearest fit, but this is a naming call — happy to go with whichever you prefer once you've seen the options.

### Doc check — "Dynamic Q3-Q5 Analysis" is the documented technical name; the UI title doesn't have to match it

`docs/metrics.md:167`, `docs/PRD.md:534,619`, and `docs/ADR.md:633,1011,1109` all use "Dynamic Q3-Q5 Analysis" as the feature's technical/spec name, including a formal numbered Acceptance Criterion (`docs/PRD.md:1347`, #14: "Dynamic Q3-Q5 analysis returns matching count, denominator, and matching rate."). That's the backend computation's documented name and doesn't need to change — same for the API field `q3_q5_analysis`. Only the **dashboard card's user-facing title** is in scope here; the underlying feature can keep its documented name in code/docs while showing a friendlier label in the UI, the same way other cards already do (e.g. the API's `group_breakdown` powers a card titled "Level records," not "Group breakdown").

### The help-icon pattern already exists — just not on this card

`frontend/src/components/dashboard/HeroCards.tsx` already has exactly the interaction requested, on the Employees/Respondents/Active AI Users cards:

```tsx
<span className="hero-help" tabIndex={0} aria-label={hero.help}>
  i
  <span className="hero-tooltip" role="tooltip">
    {hero.help}
  </span>
</span>
```

Backed by `.hero-help`/`.hero-tooltip` in `DashboardPage.css:202-251` — a small circular "i" icon, keyboard-focusable, that reveals a dark tooltip bubble on hover or focus. This is a real, working pattern to extend to `ComboAnalysisCard`, not something to build from scratch. One thing worth deciding during implementation: those classes are named with a `hero-` prefix, implying they were written HeroCards-specific. Reusing them as-is on `ComboAnalysisCard` works fine visually, but the naming would be a little misleading outside `HeroCards`; cleaner to generalize the class names (e.g. `.info-help`/`.info-tooltip`) and update `HeroCards.tsx`'s usage to match, rather than leaving a "hero-" prefixed class used by two unrelated components, or duplicating near-identical CSS under a second name.

### Tests

No test references this card's title, subtitle, or any help-icon text (confirmed via search) — the only related test import (`frontend/tests/frontend.test.mjs:13`) just pulls `ANALYSIS_WEEKLY_TIME_SAVED`, a data constant, for unrelated option-filtering logic. Nothing to update there.

## Notes

**Files that would need to change:**

1. `frontend/src/components/dashboard/ComboAnalysisCard.tsx` — replace the title text with whichever of the candidates above (or another) is chosen; remove the `card-eyebrow` subtitle div entirely; add a help icon (mirroring `HeroCards`' pattern) next to the title with an explanatory tooltip string describing what the card does.
2. `frontend/src/pages/DashboardPage.css` — either reuse `.hero-help`/`.hero-tooltip` as-is, or (recommended) generalize them to non-component-specific names and update both consumers.
3. `frontend/src/components/dashboard/HeroCards.tsx` — only touched if the class-generalization approach above is chosen, to update its `className` references to match the renamed shared classes.

No backend, database, docs, or test changes needed — "Dynamic Q3-Q5 Analysis" stays the documented/technical name for the underlying computation; only the dashboard card's user-facing presentation changes.

## Fix

Updated the dashboard card presentation while keeping the underlying `q3_q5_analysis` API and metric definition unchanged:

- `frontend/src/components/dashboard/ComboAnalysisCard.tsx`: changed the user-facing card title to `Productivity payoff analysis`.
- `frontend/src/components/dashboard/ComboAnalysisCard.tsx`: removed the `Combine one option from each question` subtitle/eyebrow.
- `frontend/src/components/dashboard/ComboAnalysisCard.tsx`: added a help icon explaining that the card compares selected time-saved, output, and quality outcomes.
- `frontend/src/components/dashboard/InfoTooltip.tsx`: added a shared dashboard help-tooltip component.
- `frontend/src/components/dashboard/HeroCards.tsx`: switched the existing hero help icons to the shared `InfoTooltip`.
- `frontend/src/pages/DashboardPage.css`: generalized the help icon CSS from `hero-help`/`hero-tooltip` to `info-help`/`info-tooltip`, and added `combo-card-head`.
- `frontend/tests/frontend.test.mjs`: added source-level regression coverage for the new title, removed subtitle, and shared tooltip usage.
- `frontend/e2e/survey-dashboard.spec.ts`: added browser assertions for the new title, removed old title/subtitle, and hover-visible help tooltip.

No backend, database, docs, `AGENTS.md`, or `CLAUDE.md` change was needed.

## Verification

Initial regression coverage failed before the implementation:

- `npm test`

Full local verification run on 2026-09-02:

- `uv run pytest` — 91 passed
- `npm test` — 18 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Live-flow verification:

- Playwright submits a survey response and navigates to `/dashboard`.
- The combo card shows `Productivity payoff analysis`.
- The old `Dynamic Q3–Q5 analysis` title and `Combine one option from each question` subtitle are absent.
- Hovering the combo card help icon reveals the tooltip.
