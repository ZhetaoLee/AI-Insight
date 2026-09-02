# Remove the "Level records" card's footer disclaimer text

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the "Level records" card ends with a two-line footer — "Seeded demonstration data · N eligible employees · fielded Q3 2026" and "'Not sure' excluded from Q3-Q5 analysis · denominators shown per metric" — requested for removal.

## Details

### Current state, confirmed

`frontend/src/components/dashboard/RecordsTable.tsx:113-116`:

```tsx
<div className="table-footer">
  <div>Seeded demonstration data · {eligibleTotal} eligible employees · fielded Q3 2026</div>
  <div>"Not sure" excluded from Q3-Q5 analysis · denominators shown per metric</div>
</div>
```

Matches the report exactly (the report's "4 eligible employees" reflects whatever scope was selected at the time — `eligibleTotal` is `metrics.population.eligible_employees` for the current scope, passed in from `DashboardPage.tsx`).

### The "fielded Q3 2026" date is a repeat of an already-identified, already-fixed problem elsewhere

This is the same category of issue already found and fixed in the sidebar's old "Q3 2026 survey" card (removed in an earlier bug fix): "Q3 2026" is a hardcoded string, not derived from any config, and it doesn't match the backend's actual active survey cycle default (`"2026-h2"`, per `backend/app/config.py`). That fix apparently didn't catch this second, separate occurrence of the same hardcoded/incorrect date in `RecordsTable`'s footer. Independent supporting evidence that this line should go rather than be corrected in place.

### The underlying "Not sure" / denominators principle is real and documented — but stays upheld without this specific sentence

`docs/metrics.md`'s "Missing Data Rule" (lines 211-214) does require the underlying behavior: "`not_sure` is missing data, not zero... return the denominator used for each metric." That's a real, documented rule — but it's a rule about what the **data/computation** must do, not a requirement that the UI display this specific reminder sentence. Confirmed the actual behavior stays intact without this footer line: denominators are still surfaced elsewhere in the dashboard today — `AdoptionSidePanel` ("{count} of {denominator} respondents"), `ComboAnalysisCard` ("{matching_count} matching of {analysis_denominator}"), `DistributionPanels` (reveals "{count} / {denominator}" on hovering a row), and `ValueAreaRankingCard`'s eyebrow ("n = {denominator}"). So removing this one restatement in `RecordsTable` doesn't remove denominator visibility from the dashboard, just this particular repeated reminder of it.

### Tests

Confirmed via search: no test in `frontend/tests/` or `frontend/e2e/` references this footer text, "Seeded demonstration data," or "fielded Q3 2026" — nothing to update.

### Cleanup this enables

- `eligibleTotal` (`RecordsTable.tsx` line 7, destructured line 21) is used **only** by this footer line — confirmed no other reference in the file. Removing the footer makes this prop entirely unused; worth removing it from `RecordsTableProps` and dropping `eligibleTotal={metrics.population.eligible_employees}` from the call site in `DashboardPage.tsx`.
- `.table-footer` (`DashboardPage.css`) is used only by `RecordsTable.tsx` (confirmed via search) — safe to remove once this block is gone.

## Notes

**Files that would need to change:**

1. `frontend/src/components/dashboard/RecordsTable.tsx` — remove the `.table-footer` block (lines 113-116); remove the now-unused `eligibleTotal` prop from `RecordsTableProps` and the function signature.
2. `frontend/src/pages/DashboardPage.tsx` — stop passing `eligibleTotal={metrics.population.eligible_employees}` to `<RecordsTable>`.
3. `frontend/src/pages/DashboardPage.css` — remove the now-dead `.table-footer` rule.

No backend, database, docs, or test changes needed — the documented "Not sure is missing data" rule stays satisfied by the data/computation layer and by the other denominator displays already elsewhere on the dashboard; only this one redundant UI sentence goes away.

## Fix

Removed the redundant footer disclaimer from the Level records card:

- `frontend/src/components/dashboard/RecordsTable.tsx`: removed the
  `.table-footer` markup and the now-unused `eligibleTotal` prop.
- `frontend/src/pages/DashboardPage.tsx`: stopped passing
  `eligibleTotal={metrics.population.eligible_employees}` to `RecordsTable`.
- `frontend/src/pages/DashboardPage.css`: removed the dead `.table-footer`
  style rule.
- `frontend/tests/frontend.test.mjs`: added regression coverage that the footer
  wrapper, hardcoded `fielded Q3 2026` text, seeded-data disclaimer, denominator
  disclaimer, and `eligibleTotal` prop stay removed.
- `frontend/e2e/survey-dashboard.spec.ts`: added browser coverage that the Level
  records card renders without `.table-footer` and without the removed text.

No backend, database, `/docs`, `AGENTS.md`, or `CLAUDE.md` change was needed
for this bug. The dashboard stylesheet also had touched dashboard-only negative
letter-spacing values normalized to `0`.

## Verification

Regression coverage was added first and failed against the old implementation
because `eligibleTotal` and `table-footer` were still present.

Full local verification run on 2026-09-02:

- `uv run --extra dev pytest` — 92 passed
- `npm test` — 22 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`

Browser-flow verification:

- Playwright submits a survey response and navigates to `/dashboard`.
- The Level records card still renders.
- `.table-footer` no longer exists in the Level records card.
- `Seeded demonstration data`, `fielded Q3 2026`, and `denominators shown per
  metric` no longer render in the Level records card.
