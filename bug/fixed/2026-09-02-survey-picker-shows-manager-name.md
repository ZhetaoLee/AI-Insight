# Survey employee picker shows manager name, not just role/level

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: when an employee is selected on the survey, the read-only context line under the name picker shows both their level (correct, wanted) and their manager's name (`Manager: <name>`). Confirmed requirement: the context line should show **only the selected employee's own role/level** — the manager line should be removed outright, with nothing substituted in its place.

## Details

### Confirmed: exact source of the manager display

`frontend/src/components/survey/EmployeePicker.tsx:23,50-55`:

```tsx
const manager = selected?.manager_id ? contextEmployees.find((e) => e.id === selected.manager_id) ?? null : null;
...
{selected ? (
  <div className="employee-context">
    <strong>{LEVEL_LABELS[selected.level]}</strong>
    {manager ? <>{" "}· Manager: {manager.name}</> : null}
  </div>
) : null}
```

So today, selecting e.g. "Alice Chen" renders `Individual Contributor · Manager: David Kim` in the `.employee-context` div beneath the picker. No separate "team members" list exists anywhere in the survey UI — searched `SurveyPage.tsx` and every component under `frontend/src/components/survey/`, and the manager name is the only additional identity beyond level currently shown.

### This is a documented, deliberate design — not an undocumented defect

`docs/PRD.md` §7.1 explicitly specifies this exact behavior, including the manager name, as the intended UI:

```text
Your Name

[Alice Chen ▼]

Individual Contributor
Manager: David Kim
```

> Level and manager are retrieved from the employee record and are not editable.
> This prevents inconsistent organizational data from being submitted through the survey.

So removing the manager line is a **product requirement change**, not a pure code bug fix — `docs/PRD.md` §7.1 would need to be updated (both the example block and the surrounding wording, which currently frames "level and manager" together) to reflect that only level should display. Flagging this distinction explicitly per the established pattern in this repo's bug-tracker conventions (documented spec violations are treated differently from undocumented implementation choices).

### No existing test locks in the manager text specifically

`frontend/e2e/survey-dashboard.spec.ts:49-50` asserts `.employee-context` contains `"Individual Contributor"` and does not contain `"Engineering"` (department) — it does not assert on `"Manager:"` one way or the other, so no existing test would need to flip from pass to fail; a new assertion (`.not.toContainText("Manager:")` or similar) would need to be added to actually enforce the fix going forward. No unit test in `frontend/tests/frontend.test.mjs` references the manager text either.

## Notes

**Files that need to change:**

1. `frontend/src/components/survey/EmployeePicker.tsx` — remove the `manager` lookup (line 23) and the `Manager: {manager.name}` render branch (line 53), leaving `.employee-context` showing only `{LEVEL_LABELS[selected.level]}` — the employee's own role, nothing else. Note: `contextEmployees` (a separate, wider employee list than the dropdown's `employees` prop, passed from `SurveyPage.tsx:222` as `contextEmployees={employees}`) exists specifically so a manager who has already submitted — and is therefore excluded from the dropdown's own `employees` list — can still be resolved by name; once the manager lookup is gone, `selected` could instead be looked up from `employees` directly, making the separate `contextEmployees` prop redundant and worth removing rather than leaving as unused plumbing.
2. `docs/PRD.md` §7.1 — update the example block (drop the `Manager: David Kim` line) and the surrounding wording, which currently frames "level and manager" as a pair, to reflect that only the employee's own level/role is shown.
3. `frontend/e2e/survey-dashboard.spec.ts` — add an assertion that `.employee-context` does not contain `"Manager:"` (paralleling the existing `.not.toContainText("Engineering")` department check at line 50), so the fix is actually locked in by a test rather than just removed from the UI.

No backend or database change is needed — `manager_id` continues to be a real, useful field on the employee record (used elsewhere, e.g. the dashboard's org tree); this is purely about what the survey page's read-only context line displays.

## Fix

- Removed the `manager` lookup and the `Manager: {manager.name}` render branch from `EmployeePicker.tsx`; `.employee-context` now renders only `{LEVEL_LABELS[selected.level]}`.
- Deliberately kept the `contextEmployees` prop as-is rather than removing it, despite the note above speculating it would become fully redundant: it's still used for the `selected` lookup, and removing it in favor of the narrower `employees` (dropdown) prop would reintroduce an edge case — if a background refresh removes the currently-selected employee from the dropdown's own list (e.g. someone else submits on their behalf mid-session) while they're still selected, `selected` would fail to resolve and the level context would silently disappear. Kept the wider lookup to preserve that existing robustness; only the manager-specific code was removed.
- `docs/PRD.md` §7.1 — updated the example block to drop the `Manager: David Kim` line and reworded the surrounding text to describe only the employee's own level being shown.
- `CLAUDE.md` principle 3 — updated, since it previously said the survey shows "level and manager" read-only; now clarifies only the employee's own level is shown in the survey UI, while `manager_id` remains a real Employee-record field used elsewhere (hierarchy scope resolution, the dashboard's org tree).
- `frontend/e2e/survey-dashboard.spec.ts` — added `await expect(page.locator(".employee-context")).not.toContainText("Manager:");` alongside the existing department-exclusion assertion.
- `frontend/tests/frontend.test.mjs` — added a new test asserting `EmployeePicker.tsx`'s source no longer contains `"Manager:"` or `manager_id`.
- No backend or database changes were needed, matching the original analysis.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 36 tests pass, including the new EmployeePicker test.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 95 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes, including the new "Manager:" absence assertion checked live in the browser.
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
