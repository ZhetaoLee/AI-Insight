# Level mode still highlights the Organization root in the sidebar tree

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

When the dashboard is in Level mode, the sidebar hierarchy tree still marks the Organization root as selected, even though the active metrics scope is a level such as Individual Contributor.

## Details

`frontend/src/components/layout/AppLayout.tsx` derives the sidebar tree selection as:

```ts
const hierarchyScope: HierarchyScope = scopeType === "manager" ? { type: "manager", id: managerId } : { type: "org" };
```

That means every non-manager scope, including `scopeType === "level"`, is represented to `OrgChartTree` as `{ type: "org" }`.

The result is a mixed UI state:

- The toolbar can show Level mode as active.
- The metrics request uses `scope=level&scope_id=<level>`.
- The sidebar tree simultaneously shows the Organization root as selected.

Expected behavior: while Level mode is active, the hierarchy tree should not visually select the Organization root as the active metrics scope. It should either show no selected hierarchy node, clearly show the tree as inactive, or hide the hierarchy selection state until the user returns to hierarchy mode.

## Notes

Likely files to inspect when fixing:

- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/dashboard/OrgChartTree.tsx`
- `frontend/src/components/dashboard/DashboardSidebar.tsx`
- `frontend/tests/frontend.test.mjs`
- `frontend/e2e/survey-dashboard.spec.ts`

No backend or database change appears necessary.

## Fix

- Changed the sidebar hierarchy selection model to allow an explicit `null`
  selected state.
- Passed `null` to the org-chart tree while Level mode is active, so neither
  the Organization root nor any manager node renders with the selected style.
- Kept the tree visible on `/dashboard` and preserved Organization/manager tree
  clicks as the way to switch back into hierarchy-scoped metrics.
- Updated product and implementation docs to state that Level mode must not
  visually select a hierarchy tree node.
- Added Playwright regression coverage for Level mode requiring zero selected
  hierarchy nodes.

## Local Verification

- Confirmed the new Playwright assertion fails before the fix:
  `.org-tree-root.selected` had count `1` after switching to Level mode.
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && uv run --extra dev pytest`
- `cd frontend && npm run test:e2e`
