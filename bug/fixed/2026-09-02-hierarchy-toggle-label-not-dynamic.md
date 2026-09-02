# "Hierarchy" toggle button label is static and doesn't reflect the selected org-tree node

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the top-toolbar toggle button that switches the dashboard into hierarchy mode always reads the static word "Hierarchy," regardless of which node is currently selected in the sidebar's Organization tree. New requirement: the label should instead reflect the currently selected scope — e.g. "Organization Dashboard" when the tree root is selected, or "Senior Director Dashboard" / "Director Dashboard" / "Manager Dashboard" when a node at that level is selected.

## Details

### Confirmed: the label is a hardcoded literal, independent of selection

`frontend/src/components/dashboard/DashboardToolbar.tsx:18-24`:

```tsx
<button
  type="button"
  className={scopeType === "level" ? "toggle-btn" : "toggle-btn active"}
  onClick={() => onScopeTypeChange("org")}
>
  Hierarchy
</button>
```

The button's text is the literal string `"Hierarchy"` — it does not vary with `scopeType` (`"org"` vs `"manager"`) or with which employee is selected. Whether the dashboard is showing org-wide data or a specific Director's subtree, the button always reads "Hierarchy."

### The component doesn't currently have the data needed to compute a per-level label

As of the sidebar-relocation fix earlier today (`bug/fixed/2026-09-02-org-chart-tree-full-hierarchy.md`), `DashboardToolbar`'s props were deliberately simplified to `{ scopeType, level, onScopeTypeChange, onLevelChange }` — it no longer receives `managerId` or `orgEmployees`, so it has no way to look up the selected employee's `level` (`senior_director` | `director` | `manager`) to build a label like "Senior Director Dashboard."

`frontend/src/pages/DashboardPage.tsx:57` already does this lookup for a different purpose (the caption under "Executive overview"):

```tsx
const managerName = scopeType === "manager" ? orgEmployees.find((e) => e.id === managerId)?.name ?? "" : "";
```

`DashboardPage.tsx` has `orgEmployees` and `managerId` available via `useOutletContext<DashboardScopeContext>()` (`AppLayout.tsx`'s shared state), so it could look up the selected employee's `level` the same way and either pass a ready-made label string down to `DashboardToolbar`, or pass `managerId`/`orgEmployees` back down for the toolbar to compute it itself. Both are viable; picking one is an implementation decision, not something this report resolves.

### Existing nearby text does something similar, but not on the button itself

`DashboardPage.tsx:58-63`'s `scopeCaption` (rendered as `.content-caption`, distinct from the toggle button) already varies by scope — e.g. `"Manager scope: David Kim plus all descendants, resolved to individual responses."` — but it names the *person*, not their *level*, and it's separate copy elsewhere on the page, not the toggle button text itself. It does not satisfy this request.

### Documented spec currently treats "Hierarchy" as a fixed mode name, not a dynamic label

`docs/PRD.md` §18 (updated earlier today alongside the sidebar-relocation fix) documents the two control modes by fixed name:

```text
- Hierarchy: one org-chart tree with an Organization root and nested Senior Director, Director, Manager, and Individual Contributor nodes...
- Level: one cross-cutting level selector...
```

This is a genuine spec/behavior mismatch to resolve, not just a code-only tweak: implementing the requested dynamic label means `docs/PRD.md` §18 needs to be updated to describe the button as showing a per-selection label (e.g. "Organization Dashboard" / "Senior Director Dashboard" / "Director Dashboard" / "Manager Dashboard") while still functioning as the toggle back into hierarchy mode, rather than always displaying the literal mode name "Hierarchy."

### Existing tests assert the static "Hierarchy" text and would break

- `frontend/e2e/survey-dashboard.spec.ts:92` — `await expect(page.getByRole("button", { name: "Hierarchy" })).toBeVisible();`
- `frontend/e2e/survey-dashboard.spec.ts:112` — `await page.getByRole("button", { name: "Hierarchy" }).click();`
- `frontend/tests/frontend.test.mjs:268` — `assert.equal(toolbarSource.includes("Hierarchy"), true);`

All three assume the literal, unchanging string "Hierarchy" and would need to be rewritten against whatever selector (e.g. a stable `data-testid`, since the button's accessible name would now vary) replaces name-based lookups, plus new assertions covering the label changing per selected node/level.

### What "Level" mode does when a node is unrelated to this request

The separate "Level" button and its own toggle behavior are unaffected by this report — only the "Hierarchy" toggle button's label is in scope.

## Notes

**Files that need to change:**

1. `frontend/src/components/dashboard/DashboardToolbar.tsx` — replace the static `"Hierarchy"` label with a dynamic label reflecting the current selection; needs either a new prop (e.g. `hierarchyLabel: string`) or the reintroduction of `managerId`/`orgEmployees` props to compute it locally.
2. `frontend/src/pages/DashboardPage.tsx` — most likely place to compute the label (it already looks up the selected employee via `orgEmployees`/`managerId` from `useOutletContext`), passed down to `DashboardToolbar`.
3. `docs/PRD.md` §18 — update the "Hierarchy" control-mode description to reflect that the toggle's visible label now varies by selection (Organization / Senior Director / Director / Manager), not a fixed mode name.
4. `frontend/tests/frontend.test.mjs` — update/replace the assertion on the literal `"Hierarchy"` string; add coverage for the label varying by `scopeType`/selected employee level.
5. `frontend/e2e/survey-dashboard.spec.ts` — update the two `getByRole("button", { name: "Hierarchy" })` locators (lines 92 and 112) to match the new dynamic label or a stable non-text selector.

No backend or database changes are needed — this is presentation-only, over data the frontend already has in scope.

## Fix

- `AppLayout.tsx` now computes `hierarchyLabel` from the existing `hierarchyScope`/`orgEmployees` state it already owns: `"Organization Dashboard"` when the scope is org-wide, or `` `${LEVEL_LABELS[selectedHierarchyEmployee.level]} Dashboard` `` (e.g. "Senior Director Dashboard") when a manager node is selected. Added `hierarchyLabel: string` to `DashboardScopeContext` and the shared outlet context object.
- `DashboardPage.tsx` reads `hierarchyLabel` from `useOutletContext<DashboardScopeContext>()` and passes it down to `DashboardToolbar`.
- `DashboardToolbar.tsx` takes a new `hierarchyLabel: string` prop and renders it in place of the hardcoded `"Hierarchy"` text; the button's click behavior (reset to org-wide hierarchy mode) is unchanged, per the report's explicit note that only the label was in scope.
- `docs/PRD.md` §18 now documents that the toggle's visible text names the currently selected node rather than staying a fixed "Hierarchy" mode label.
- `frontend/tests/frontend.test.mjs` — removed the assertion on the literal `"Hierarchy"` string and added a test verifying `hierarchyLabel` is threaded through `DashboardToolbar.tsx`/`DashboardPage.tsx` and that `AppLayout.tsx` computes both the `"Organization Dashboard"` and per-level `Dashboard` label forms.
- `frontend/e2e/survey-dashboard.spec.ts` — replaced both `getByRole("button", { name: "Hierarchy" })` locators with `"Organization Dashboard"`, and added assertions after each tree-node click confirming the button reads "Senior Director Dashboard" / "Director Dashboard" / "Manager Dashboard" / "Organization Dashboard" as expected.
- No backend or database changes were needed; the local database was confirmed clean (0 survey responses, seeded employees intact) after verification, matching the pre-existing state — no cleanup was required for this change.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 33 tests pass, including the new dynamic-label test.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 95 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes against the full Docker Compose stack, clicking through Priya Nair (Senior Director) → Sarah Lee (Director) → David Kim (Manager) → Organization and asserting the toggle button's text updates to match at each step.
- Local Docker Compose stack (`docker compose up --build -d`) confirmed healthy afterward (`/health` returns `{"status":"ok"}`, frontend responds `200`, `survey_responses` collection empty) for manual browser verification at `http://localhost:5173`.
