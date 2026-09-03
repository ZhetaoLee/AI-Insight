# Q4-Q6 answer choices wrap to a second row instead of staying on one row

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: Q4 (Work Output Impact), Q5 (Work Quality Impact), and Q6 (AI Rework Frequency) each render their answer choices in a CSS grid hardcoded to exactly 5 columns. Since a "Not sure" option was added to all three questions in the most recently fixed bug (`bug/fixed/2026-09-02-q4-q5-q6-missing-not-sure-and-combo-denominator.md`), each of these questions now has 6 options, and the 6th ("Not sure") wraps onto its own second row instead of staying on the same row as the other five.

## Details

### Confirmed: the layout is a hardcoded 5-column grid

`frontend/src/pages/SurveyPage.css:176-183`:

```css
.option-likert {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  border-top: 1px solid var(--color-border-3);
  border-bottom: 1px solid var(--color-border-3);
  padding: 12px 0;
}
```

`grid-template-columns: repeat(5, 1fr)` always creates exactly 5 equal-width columns, regardless of how many option buttons are actually rendered into it. With 6 options now present, the CSS grid places the first 5 in row one and the 6th wraps into a new row two.

### Confirmed: this class is used by exactly Q4, Q5, and Q6

`frontend/src/pages/SurveyPage.tsx` passes `layout="likert"` to the `SingleSelectQuestion` for Q4 (line 296), Q5 (line 307), and Q6 (line 318) — each with its respective option list. `frontend/src/components/survey/SingleSelectQuestion.tsx:23-24` maps `layout === "likert"` to the `option-likert` class shown above. No other question in the survey uses this layout or class.

### This is a regression introduced as a side effect of the recently-fixed `not_sure` bug

Before `bug/fixed/2026-09-02-q4-q5-q6-missing-not-sure-and-combo-denominator.md` was implemented, `WORK_OUTPUT_CHANGE`, `QUALITY_CHANGE`, and `CORRECTION_FREQUENCY` (`frontend/src/types/survey.ts`) each had exactly 5 options, matching the grid's hardcoded column count exactly — so the wrapping bug wasn't visible. That fix added a 6th `not_sure` option to all three lists, which is what makes the 5-column hardcoding a live, visible problem now. The underlying fragility (a layout hardcoded to a specific option count rather than adapting to however many options are actually passed in) already existed; this is the first change that exposed it.

### Contrast with the survey's other two option layouts, which don't have this problem

`frontend/src/pages/SurveyPage.css:132-142` — the other two layout modes used elsewhere in the survey don't hardcode a column/item count:

```css
.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2px 24px;
}
```

`.option-row` is a wrapping flex row (sized to content); `.option-grid` uses `repeat(auto-fit, minmax(250px, 1fr))`, which adapts its column count to however many items fit rather than a fixed number. `.option-likert` is the only one of the three that hardcodes a specific count, which is the root cause here.

### No responsive/mobile handling exists either

Searched `frontend/src/pages/SurveyPage.css` for any `@media` query touching `.option-likert` or `.radio-option-likert` — none exists. The 5-column (soon to be 6-column) grid is static at every viewport width. Worth deciding, when implementing, whether "same row" should hold at every screen width (potentially cramped on narrow viewports with 6 columns) or whether a narrow-viewport fallback is acceptable — this report only confirms the desktop-width wrapping bug and doesn't resolve that question.

### No test or doc coverage exists for this layout

Searched `frontend/tests/`, `frontend/e2e/`, and `docs/` for `option-likert`, `grid-template-columns`, `layout="likert"`, and `repeat(5` — no matches anywhere. This is an untested, undocumented CSS presentation detail; nothing currently locks in either the old (broken) 5-column behavior or a fixed version.

## Notes

**Files that need to change:**

1. `frontend/src/pages/SurveyPage.css` — change `.option-likert`'s `grid-template-columns: repeat(5, 1fr)` to accommodate 6 columns. Two reasonable approaches: hardcode `repeat(6, 1fr)` (simplest, since Q4-Q6 always have exactly 6 options as of the `not_sure` fix), or switch to a `repeat(auto-fit, minmax(...))` pattern like `.option-grid` already uses, so the layout doesn't silently break again if an option count changes in the future. Deciding between these is an implementation choice this report doesn't resolve.
2. `frontend/tests/frontend.test.mjs` or `frontend/e2e/survey-dashboard.spec.ts` — no existing coverage of this layout exists at all; consider adding a check (e.g. asserting the CSS declares enough grid columns for the actual option count, or a Playwright bounding-box check that all Q4-Q6 buttons share the same row) so this doesn't regress silently again the next time an option is added to Q4, Q5, or Q6.

No backend, database, or documentation changes are needed — this is a pure frontend CSS presentation issue, unrelated to survey data, validation, or metrics.

## Fix

- `frontend/src/pages/SurveyPage.css` — changed `.option-likert`'s `grid-template-columns` from `repeat(5, 1fr)` to `repeat(6, 1fr)`. Went with the simpler hardcoded approach (option 1 from the two flagged above) rather than switching to an `auto-fit`/`minmax` pattern, since Q4-Q6 always have exactly 6 options by design and a fixed 6-column grid keeps the Likert-scale columns evenly aligned, which is the visual point of this layout.
- Left the "should this hold at every viewport width" question unresolved, as flagged in the original report — no `@media` breakpoint was added, matching the pre-existing (also breakpoint-free) behavior; this fix only addresses the confirmed desktop-width wrapping bug.
- `frontend/tests/frontend.test.mjs` — added a source-text test asserting `.option-likert` declares `repeat(6, 1fr)` and not `repeat(5, 1fr)`.
- `frontend/e2e/survey-dashboard.spec.ts` — added a live bounding-box check: locates all 6 Q4 option buttons and asserts they share the same rendered Y position (i.e. genuinely one row in an actual browser), not just a source-text check.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 38 tests pass, including the new `.option-likert` column-count test.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 99 passed (unaffected, pure frontend CSS change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes, including the new live bounding-box assertion confirming all 6 Q4 buttons render on one row.
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
