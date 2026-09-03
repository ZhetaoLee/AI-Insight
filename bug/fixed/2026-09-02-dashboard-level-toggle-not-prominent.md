# Dashboard's "Dashboard"/"Level" scope toggle is styled as a minor control despite driving every metric on the page

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the two-button toggle at the very top of the dashboard — the hierarchy toggle (now labeled dynamically, e.g. "Organization Dashboard" / "Senior Director Dashboard," per `bug/fixed/2026-09-02-hierarchy-toggle-label-not-dynamic.md`) and "Level" — is styled at the same small, subdued visual weight as a secondary utility control, even though it's the single control that determines the scope of every metric shown on the entire page below it.

## Details

### Confirmed: current styling and exact location

`frontend/src/components/dashboard/DashboardToolbar.tsx:14-33` renders both buttons inside `.toggle-group`, the very first thing in `.dashboard-toolbar`, which is itself the first element rendered on the dashboard — above "Executive overview," the hero cards, and every chart.

`frontend/src/pages/DashboardPage.css:26-53`:

```css
.toggle-group {
  display: flex;
  gap: 3px;
  background: var(--db-border-2);
  border-radius: 10px;
  padding: 3px;
  flex: none;
}

.toggle-btn {
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--db-muted-2);
  border: none;
  box-shadow: none;
  font-family: inherit;
}

.toggle-btn.active {
  background: #fff;
  color: var(--db-text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(31, 42, 55, 0.12);
}
```

Both buttons render at **12.5px**, with the inactive one in a muted gray (`--db-muted-2`) and only a subtle white-pill/shadow difference marking the active one — no larger text, no accent color, no distinguishing visual weight beyond that.

### Why this is a real, not purely subjective, finding

This toggle isn't a minor utility action — selecting between "Dashboard" (hierarchy scope) and "Level" scope changes what population every single number on the page describes: the hero cards, adoption rate, all six distribution panels, the group breakdown table, and the productivity payoff analysis all recompute based on this choice. For comparison, `frontend/src/pages/DashboardPage.css:103-113` (`.reset-scope-btn`, a genuinely minor, occasional-use action — "Reset scope") is styled at the same 12.5px size as this toggle. So today, the control that decides what the entire dashboard means and a one-off convenience button carry the same visual weight — nothing distinguishes the toggle as the primary, page-defining control it actually is.

### No test or doc dependency on the current styling

Searched `frontend/tests/frontend.test.mjs`, `frontend/e2e/survey-dashboard.spec.ts`, and every file under `docs/` for `toggle-btn`/`toggle-group` — no matches anywhere. Changing this styling is safe; nothing locks in the current visual weight, only the toggle's text/behavior (already covered by existing tests, which are selector-by-role/text and don't assert on size or color).

### "More prominent" is a real but open design direction

The report doesn't specify a target size, weight, or color — reasonable levers include a larger font size, stronger color contrast for the active state (e.g. an accent color rather than plain white/gray), bolder default weight, or larger padding — any combination that visually signals this is the primary scope control rather than a secondary toggle. Picking the specific values is an implementation decision this report doesn't resolve.

## Notes

**Files that need to change:**

1. `frontend/src/pages/DashboardPage.css` — increase the visual prominence of `.toggle-group`/`.toggle-btn`/`.toggle-btn.active` (size, weight, and/or color), per the open design direction above.

No frontend component logic, backend, or database changes are needed — this is a pure CSS/visual-weight change to an existing, already-functional control.

## Fix

Picked concrete values for the open design direction, reusing the app's existing "selected/active" visual language rather than inventing a new one-off style:

- `.toggle-group`: `border-radius` 10px → 12px, `padding`/`gap` 3px → 4px (slightly larger container to match the bigger buttons inside it).
- `.toggle-btn`: `font-size` 12.5px → 14px, `font-weight` 500 → 600, `padding` 7px 13px → 9px 16px, `border-radius` 8px → 10px.
- `.toggle-btn.active`: replaced the plain white background + gray text + subtle shadow with the same accent-tinted treatment already used elsewhere in the app for a "selected" state (`.nav-item.active` in the sidebar, the org tree's selected node) — `background: #eef8f4`, `color: var(--db-accent-dark)`, `font-weight: 700`, and an inset accent-tinted border instead of a plain drop shadow.

Left `.reset-scope-btn` and `.toolbar-picker` at their original 12.5px size deliberately, so the scope toggle now visibly outranks them, consistent with it being the primary control rather than a secondary one.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 44 tests pass, including a new test asserting the toggle's font size and accent-color active state, and that `.reset-scope-btn` stays at the old smaller size for contrast.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 99 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes (this toggle's text/role-based selectors are unaffected by the styling change).
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
