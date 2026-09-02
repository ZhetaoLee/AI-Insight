# Dashboard "Search metric, team, or person" box does nothing

- **Status:** Fixed
- **Reported:** 2026-09-01
- **Fixed:** 2026-09-02

## Summary

The dashboard toolbar showed a "Search metric, team, or person" box, but it had no wiring behind it: static markup with no input, no state, and no filtering logic.

## Details

Confirmed: this was a real bug, not a misunderstanding.

`frontend/src/components/dashboard/DashboardToolbar.tsx:29-32`:

```tsx
<div className="toolbar-search">
  <div className="toolbar-search-dot" />
  <div className="toolbar-search-text">Search metric, team, or person</div>
</div>
```

This was three plain `<div>`s, not an `<input>`: no `value`, `onChange`, `useState`, or handler attached anywhere. It was purely decorative: a leftover from the original visual design mock-up (the Claude Design `.dc.html` file the executive dashboard was implemented from), which also never wired it to anything. It was carried into the implementation as-is and never revisited.

### Where else it shows up

- **Styling**: `frontend/src/pages/DashboardPage.css` had three rules solely for this element: `.toolbar-search` (213-223), `.toolbar-search-dot` (225-231), `.toolbar-search-text` (233-239). Nothing else in the stylesheet used these class names.
- **Nowhere else in the codebase**: the original repo-wide search for `toolbar-search` / `Search metric` turned up only the two files above. No other component, backend code, or test referenced it.

### Documentation and tests

- **Docs**: no mention of a dashboard search feature anywhere in `docs/PRD.md`, `docs/ADR.md`, `docs/metrics.md`, or `docs/implementation_plan.md`. It was never a specified requirement, just something the design mock-up happened to include as a placeholder.
- **Tests**: no existing test referenced dashboard search. A targeted frontend regression test was added with the fix.

### Layout note for whoever fixes this

`.dashboard-toolbar` (`DashboardPage.css:203-211`) is a `display:flex` row with no `justify-content`. Before the fix, the search box (flex `1 1 200px`, i.e. it grew) sat first, pushing the Organization/Manager/Level toggle group and the scope picker `<select>` to its right. Removing the search `<div>` leaves the toggle group as the first left-aligned element.

## Files changed to fix this

1. **`frontend/src/components/dashboard/DashboardToolbar.tsx`**: removed the `.toolbar-search` block.
2. **`frontend/src/pages/DashboardPage.css`**: removed the now-dead `.toolbar-search`, `.toolbar-search-dot`, and `.toolbar-search-text` rules.

## Fix

Removed the static dashboard search placeholder instead of implementing a new search feature that is not specified in the product docs.

- `frontend/src/components/dashboard/DashboardToolbar.tsx`: removed the `.toolbar-search` markup.
- `frontend/src/pages/DashboardPage.css`: removed the dead `.toolbar-search`, `.toolbar-search-dot`, and `.toolbar-search-text` rules.
- `frontend/tests/frontend.test.mjs`: added a regression test that verifies the toolbar source and dashboard CSS no longer contain the placeholder.

No backend or database changes were needed because the bug was presentation-only and no dashboard search API exists in the documented implementation scope.

## Verification

- Confirmed `docs/`, `AGENTS.md`, and `CLAUDE.md` do not define a dashboard search requirement, so no documentation change was needed outside this fixed bug note.
- Confirmed the placeholder text and `toolbar-search` classes no longer exist in the dashboard component or stylesheet. The only remaining code references are in the regression test that guards this fix.
