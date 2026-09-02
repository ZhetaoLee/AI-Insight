# Org-chart tree is placed at the top of the dashboard and doesn't visually read as a tree

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Reopened:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: `OrgChartTree.tsx` is implemented and functionally correct (renders the full Organization → Senior Director → Director → Manager → IC hierarchy, clicking a node sets dashboard scope), but it is rendered inside `DashboardToolbar`, which sits at the very top of the dashboard content — above "Executive overview," the hero cards, and every chart. New requirement: move the tree into a new section in the left sidebar instead, leave the rest of the dashboard's top unchanged, and restyle the tree so it visually reads as a tree (branch/connector lines), not a stack of flat boxes.

## Details

### Confirmed: the tree is at the top of the dashboard, not the sidebar

`frontend/src/pages/DashboardPage.tsx:77-89` renders `<DashboardToolbar ... />` as the first child of `.dashboard-page`, before `.dashboard-content` (which holds the "Executive overview" heading, `HeroCards`, coverage summary, and every chart grid below it):

```tsx
return (
  <div className="dashboard-page">
    <DashboardToolbar ... />
    <div className="dashboard-content">
      ...
```

`DashboardToolbar.tsx:69-71` renders `OrgChartTree` directly beneath the Hierarchy/Level toggle row, inside that same top toolbar:

```tsx
{scopeType !== "level" && (
  <OrgChartTree employees={orgEmployees} selectedScope={hierarchyScope} onSelect={selectHierarchyScope} />
)}
```

So today the full 10-node tree renders full-width across the top of the page, pushing all dashboard content down — confirmed, this matches the "you should not put at the top" complaint.

### Confirmed: current styling doesn't read as a tree

`frontend/src/pages/DashboardPage.css:67-174` (`.org-tree*` rules) — every node (`org-tree-root`, `org-tree-node`, `org-tree-button`, `org-tree-leaf`) is an independent white, bordered, rounded rectangle stacked vertically via `flex-direction: column; gap: 8px`. The only signal of hierarchy is:
- `paddingLeft: 12 + depth * 16` inline style in `OrgChartTree.tsx:22` — a modest 16px indent per level.
- A static 7×7px circular dot (`.org-tree-connector`, `OrgChartTree.tsx:28/41`) placed inside each box.

There are no actual connector/branch lines — no vertical trunk line running down the left edge of a branch, no horizontal elbow line joining a parent to its children. Visually this is an indented list of pill-shaped buttons with a colored dot, not a tree diagram. This confirms the "so ugly... make looks like a tree" complaint as a real, describable gap, not just a subjective one.

### Target: new left-sidebar section, current sidebar structure confirmed

`frontend/src/components/dashboard/DashboardSidebar.tsx` (shared across `/survey` and `/dashboard` via `AppLayout.tsx`) currently renders only a brand block and one "Workspace" nav section (`Dashboard` / `Survey` links). It has no existing section for hierarchy content — a new section needs to be added here for the tree.

### This is a state-lifting change, not just a move — worth flagging

`DashboardSidebar` is rendered by `AppLayout.tsx` (shared shell for both routes), while `scopeType`/`managerId`/`orgEmployees` — the state the tree needs (`hierarchyScope`, `onSelect`) — currently lives locally inside `DashboardPage.tsx` (`useState` at lines 17-18, `orgEmployees` fetched at line 29) and is only otherwise available via props passed down into `DashboardToolbar`. Moving `OrgChartTree` into the sidebar means this scope-selection state needs to be lifted out of `DashboardPage` into something `AppLayout`/`DashboardSidebar` can also read and write (e.g. lifted to `AppLayout` and passed to both `Outlet` context and the sidebar, or a small shared context/store) — a real architectural change, not a drop-in relocation of the JSX. It also needs to only actually affect metrics scope while on `/dashboard` (the sidebar renders on `/survey` too, where scope selection is meaningless).

### "Don't change the top for the dashboard" — scoped to mean the rest of the toolbar/content stays as-is

The Hierarchy/Level toggle row (`DashboardToolbar.tsx:41-56`) and everything in `.dashboard-content` (Executive overview heading, hero cards, coverage summary, charts, records table) are unaffected by this request and must not change — only the tree itself relocates out of the toolbar and into the new sidebar section. Whether the toggle row's "Hierarchy" button remains meaningful once the tree lives in the sidebar (vs. being removed/merged into the sidebar section too) is an open design question for whoever implements this, not decided by this bug report.

### No documented spec constrains placement or styling

`docs/PRD.md`/`docs/ADR.md` cover scope *resolution* only, not this control's visual presentation or location — confirmed via search, unchanged from the original investigation. No PRD/ADR update is required to move or restyle the tree, though `docs/PRD.md`/`docs/ADR.md` should still be checked for any incidental references to the toolbar-hosted tree if this is implemented.

### Existing tests reference the current placement

`frontend/tests/frontend.test.mjs` and `frontend/e2e/survey-dashboard.spec.ts` both exercise the hierarchy tree/toolbar (added when the original version of this bug was implemented) — these assert against the tree's current location and would need updating to reflect the sidebar placement once this moves.

## Notes

**Files that need to change:**

1. `frontend/src/components/dashboard/DashboardSidebar.tsx` — add a new section (e.g. below "Workspace") that renders the org-chart tree.
2. `frontend/src/components/dashboard/OrgChartTree.tsx` — visual rework to add real branch/connector lines (vertical trunk + horizontal elbow per node) instead of the current flat boxes-with-a-dot look; likely also needs prop/data adjustments if it now lives outside `DashboardToolbar`.
3. `frontend/src/components/dashboard/DashboardToolbar.tsx` — remove the `<OrgChartTree>` render call (lines 69-71); keep the Hierarchy/Level toggle row.
4. `frontend/src/components/layout/AppLayout.tsx` — lift/thread the hierarchy scope-selection state (or equivalent) so `DashboardSidebar` can render the tree and `DashboardPage` can still consume the selected scope; needs to be inert on `/survey`.
5. `frontend/src/pages/DashboardPage.tsx` — adjust how `scopeType`/`managerId`/`orgEmployees` state is owned/consumed now that the tree lives outside this component's own tree of JSX.
6. `frontend/src/components/layout/AppLayout.css` — new styles for the sidebar's tree section (spacing, section label, scroll behavior if the list gets long).
7. `frontend/src/pages/DashboardPage.css` — rework `.org-tree*` rules for genuine tree-line visuals; some/all of these rules may move into `AppLayout.css` alongside the relocated markup.
8. `frontend/tests/frontend.test.mjs` and `frontend/e2e/survey-dashboard.spec.ts` — update assertions to match the tree's new sidebar location.

No backend or database changes are needed — this remains a frontend presentation/placement change over the existing hierarchy data and existing `scope=org|manager|level` API contract.

## Fix

- Moved the org-chart tree out of `DashboardToolbar`/the dashboard top and into a new "Organization" section in the persistent left sidebar (`DashboardSidebar.tsx`), rendered only while on `/dashboard` (inert/absent on `/survey`).
- Lifted `scopeType`/`managerId`/`level`/`orgEmployees` hierarchy-selection state out of `DashboardPage.tsx` into `AppLayout.tsx`, shared with the sidebar directly and with `DashboardPage.tsx` via `useOutletContext` (`DashboardScopeContext`), so both stay in sync as a single source of truth.
- `DashboardToolbar.tsx` now only renders the Hierarchy/Level toggle row and the level `<select>`; the dashboard's top content (`Executive overview`, hero cards, coverage summary, charts, records table) is otherwise unchanged.
- Reworked `OrgChartTree.tsx`/its CSS (moved from `DashboardPage.css` into `AppLayout.css`, alongside the sidebar markup) to render real branch/connector lines — a vertical trunk segment plus a horizontal elbow per node via CSS pseudo-elements — instead of a flat, per-node indented list of boxes with a static dot.
- Updated `frontend/tests/frontend.test.mjs` to assert the tree is absent from the toolbar/`DashboardPage.tsx`/`DashboardPage.css` and present in `DashboardSidebar.tsx`/`AppLayout.css`, including the new connector-line CSS rules; `frontend/e2e/survey-dashboard.spec.ts` needed no changes since its locators aren't scoped to the toolbar and still find the relocated tree.
- Updated `docs/PRD.md` §6 and §18 and `CLAUDE.md` to document that the hierarchy tree lives in the persistent sidebar (not the dashboard toolbar) and only renders on `/dashboard`.
- No backend or database changes were needed.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 33 tests pass.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 95 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright submit-to-dashboard smoke test passes against the full Docker Compose stack, including clicking hierarchy nodes now rendered in the sidebar and verifying scope-caption changes.
- Local Docker Compose stack (`docker compose up --build -d`) confirmed healthy afterward (`/health` returns `{"status":"ok"}`, frontend responds `200`) for manual browser verification at `http://localhost:5173`.
