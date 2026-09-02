# Dashboard shows an undocumented "small sample" warning banner

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

When a scope has fewer than 8 respondents, the dashboard shows a banner: "Small sample: N respondents in this scope. Rates are directional only." Requested: remove it.

## Details

Confirmed: the banner exists as reported, and it's not a documented requirement anywhere — worth removing.

### Current implementation

`frontend/src/pages/DashboardPage.tsx`:

```ts
const SMALL_SAMPLE_THRESHOLD = 8;                                          // line 19
...
const tooFew = metrics.population.respondents > 0 && metrics.population.respondents < SMALL_SAMPLE_THRESHOLD;  // line 114
...
{tooFew && (                                                               // lines 148-152
  <div className="small-sample-banner">
    Small sample: {metrics.population.respondents} respondents in this scope. Rates are directional only.
  </div>
)}
```

Styled by `.small-sample-banner` in `frontend/src/pages/DashboardPage.css:334-341`.

### What the docs actually say

There is no requirement anywhere in `docs/PRD.md`, `docs/ADR.md`, `docs/metrics.md`, or `docs/implementation_plan.md` for a small-sample warning banner, an 8-respondent threshold, or "directional only" wording — searched all four and found nothing matching.

The one related concept that does exist is a **different** idea, and it's explicitly marked out of scope. `docs/ADR.md` §29 "Privacy Considerations" (lines 1296-1311):

```text
A production version should consider suppressing small groups.

Example:
  Do not display aggregate survey results
  when respondent count < 3

This reduces the likelihood that an individual response can be inferred.

This threshold is not required for the take-home implementation but
should be documented as a production consideration.
```

That's about *suppressing data entirely* below n=3 for **privacy** (so individual responses can't be inferred from a tiny group), not showing a *reliability caveat* on rates below n=8. The implemented banner is a different feature, with a different threshold and a different justification, that was invented during implementation — and even the closest documented relative of this idea says plainly it "is not required for the take-home implementation."

`docs/PRD.md:581` ("Coverage should remain visible so leadership can judge metric reliability") is sometimes the nearest-sounding text, but it's satisfied already by the always-visible response-coverage numbers (`DashboardSidebar.tsx`'s coverage card, and the `Coverage`/`Population` objects on every metrics response) — it doesn't call for a separate warning banner.

### Tests

No test references `tooFew`, `SMALL_SAMPLE_THRESHOLD`, `small-sample-banner`, or "directional" anywhere in `frontend/tests/`, `frontend/e2e/`, or `backend/tests/` — there's no coverage to update when this is removed.

### One thing to watch when implementing the fix

`.small-sample-banner` (the CSS class) is **not** exclusive to this warning — `DashboardPage.tsx:154` reuses the exact same class for the unrelated `metricsError` banner (shown when `/api/metrics` fails to load):

```tsx
{metricsError && <div className="small-sample-banner">{metricsError}</div>}
```

That error banner is a legitimate, separate feature and should stay. So the fix is to remove the `tooFew` block (lines 148-152) and its supporting `SMALL_SAMPLE_THRESHOLD`/`tooFew` logic (lines 19, 114), **not** to delete the `.small-sample-banner` CSS class itself — it's still needed for the error banner. Worth considering renaming the class to something more generic (e.g. `.dashboard-banner` or `.metrics-error-banner`) while touching this code, since "small-sample" will no longer describe its only use, but that's a naming cleanup, not a functional requirement.

## Files that need to change to fix this

1. **`frontend/src/pages/DashboardPage.tsx`** — remove the `SMALL_SAMPLE_THRESHOLD` constant (line 19), the `tooFew` computation (line 114), and the conditional banner block (lines 148-152). Leave the `metricsError` banner (line 154) and its `.small-sample-banner` class usage intact.
2. **`frontend/src/pages/DashboardPage.css`** — no removal needed (the class stays in use for the error banner); optional rename of `.small-sample-banner` for clarity now that it's error-only, purely cosmetic to the codebase.

## Fix

Removed the unsupported dashboard small-sample warning instead of adding a new dashboard reliability feature that is not specified in the public product docs.

- `frontend/src/pages/DashboardPage.tsx`: removed `SMALL_SAMPLE_THRESHOLD`, the `tooFew` calculation, and the conditional small-sample warning block.
- `frontend/src/pages/DashboardPage.tsx`: kept the real metrics error banner.
- `frontend/src/pages/DashboardPage.css`: renamed the remaining banner class from `.small-sample-banner` to `.dashboard-banner` so the styling no longer describes a removed feature.
- `frontend/tests/frontend.test.mjs`: added a regression test that rejects the old small-sample warning constant, copy, state variable, and CSS class in dashboard source.
- `frontend/e2e/survey-dashboard.spec.ts`: added runtime assertions that the dashboard does not show `Small sample:` or `Rates are directional only` during the smoke flow.

No backend or database change was needed because this was a frontend-only display issue. No `/docs`, `AGENTS.md`, or `CLAUDE.md` content change was needed because none of them require or describe the removed warning.

## Verification

Initial regression test failed before the implementation:

- `npm test`

After the implementation, local frontend regression testing passed.

Full local verification run on 2026-09-02:

- `uv run pytest`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `git diff --check`

Live stack verification:

- Docker Compose stack started successfully with MongoDB, backend, and frontend healthy.
- Playwright verified the dashboard does not show `Small sample:` or `Rates are directional only` in the survey-to-dashboard smoke flow.
- The app is available for manual verification at `http://localhost:5173`.
