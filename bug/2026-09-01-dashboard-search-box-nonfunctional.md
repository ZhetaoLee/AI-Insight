# Dashboard "Search metric, team, or person" box does nothing

- **Status:** Active
- **Reported:** 2026-09-01

## Summary

The dashboard toolbar shows a "Search metric, team, or person" box, but it has no wiring behind it — it's static markup with no input, no state, and no filtering logic.

## Details

Confirmed: this is a real bug, not a misunderstanding.

`frontend/src/components/dashboard/DashboardToolbar.tsx:29-32`:

```tsx
<div className="toolbar-search">
  <div className="toolbar-search-dot" />
  <div className="toolbar-search-text">Search metric, team, or person</div>
</div>
```

This is three plain `<div>`s, not an `<input>` — there's no `value`, `onChange`, `useState`, or any handler attached anywhere. It's purely decorative: a leftover from the original visual design mock-up (the Claude Design `.dc.html` file the executive dashboard was implemented from), which also never wired it to anything. It was carried into the implementation as-is and never revisited.

### Where else it shows up

- **Styling**: `frontend/src/pages/DashboardPage.css` has three rules solely for this element — `.toolbar-search` (213-223), `.toolbar-search-dot` (225-231), `.toolbar-search-text` (233-239). Nothing else in the stylesheet uses these class names.
- **Nowhere else in the codebase**: a repo-wide search for `toolbar-search` / `Search metric` turns up only the two files above — no other component, no backend code, and no test references it.

### Documentation and tests

- **Docs**: no mention of a dashboard search feature anywhere in `docs/PRD.md`, `docs/ADR.md`, `docs/metrics.md`, or `docs/implementation_plan.md` — it was never a specified requirement, just something the design mock-up happened to include as a placeholder.
- **Tests**: `frontend/tests/frontend.test.mjs` and `frontend/e2e/survey-dashboard.spec.ts` have zero references to search — nothing currently covers it (correctly, since there's nothing to cover), and nothing would need updating there.

### Layout note for whoever fixes this

`.dashboard-toolbar` (`DashboardPage.css:203-211`) is an unpadded `display:flex` row with no `justify-content`, so today the search box (flex `1 1 200px`, i.e. it grows) sits first, pushing the Organization/Manager/Level toggle group and the scope picker `<select>` to its right. Removing the search `<div>` will leave the toggle group as the first (left-aligned) element instead — worth a quick visual check after the change in case the toolbar should keep the toggle group right-aligned (e.g. via `margin-left: auto` on the toggle group), but that's a layout call for the fix, not something this bug report is prescribing.

## Files that need to change to fix this

1. **`frontend/src/components/dashboard/DashboardToolbar.tsx`** — remove the `.toolbar-search` block (lines 29-32).
2. **`frontend/src/pages/DashboardPage.css`** — remove the now-dead `.toolbar-search`, `.toolbar-search-dot`, and `.toolbar-search-text` rules; optionally adjust `.dashboard-toolbar` layout per the note above.

No backend, docs, or test changes are needed — nothing outside these two files references the search box.
