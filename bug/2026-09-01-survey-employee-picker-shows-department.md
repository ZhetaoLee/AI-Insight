# Survey employee picker still shows department

- **Status:** Active
- **Reported:** 2026-09-01

## Summary

After selecting a name in the survey's "Your name" picker, the department is displayed alongside level and manager, even though department is not considered part of the first version of the project.

## Details

Confirmed: this is a real bug, not a misunderstanding.

`frontend/src/components/survey/EmployeePicker.tsx:38-43` renders:

```tsx
{selected ? (
  <div className="employee-context">
    <strong>{selected.department}</strong> · {LEVEL_LABELS[selected.level]}
    {manager ? <>{" "}· Manager: {manager.name}</> : null}
  </div>
) : null}
```

So the moment an employee is selected, the context line reads e.g. **"Engineering · IC · Manager: David Kim"** — department is the first, bolded thing shown.

### What the docs actually specify

- `docs/PRD.md` §7.1 "Employee Selection" gives the canonical worked example for this exact UI:

  ```text
  Your Name

  [Alice Chen ▼]

  IC
  Manager: David Kim
  ```

  Only level ("IC") and manager are shown — no department. The accompanying text says "Level and manager are retrieved from the employee record and are not editable," calling out only those two fields.

- `docs/ADR.md` Decision 4 (line 292) says "The frontend **may** display department, level, and manager as read-only context" — permissive, not a requirement, and it's the source of the drift: an earlier implementation took "may" as license to show all three, when PRD §7.1's own concrete example only shows two.

- `CLAUDE.md` architecture principle 3 similarly lumps department in with level/manager as things "looked up and shown read-only," which reads the same way ADR.md does.

- This is the same category of issue as the dashboard `group_by=department` bug fixed earlier today: department is a legitimate `Employee` attribute (correctly *stored* and *looked up*), but is not supposed to be surfaced anywhere in the initial version's UI beyond being available on the record. The dashboard fix already established that precedent for the executive dashboard; this bug is the survey side of the same gap.

### Scope check — other places department could leak into the survey flow

- **Backend**: `backend/app/routers/survey_responses.py` and `backend/app/models/survey_response.py` have no department references — submission validation never touches department. No backend change needed for this bug.
- **`/api/employees` response**: still legitimately includes `department` on each employee record (used elsewhere, e.g. the dashboard's manager-scope picker shows department as context there — out of scope for this bug, not being reported as wrong). No change needed to the employee list endpoint or the `Employee` type/model.
- **Tests**: `frontend/tests/frontend.test.mjs` references `department` only in seed employee fixture data (legitimate field until the broader department-removal bug is fixed). Nothing there asserts what the survey's employee picker displays, so there's no existing test to update, only a coverage gap (see below).
- **`frontend/e2e/survey-dashboard.spec.ts`**: no department-related assertions.
- **`docs/Questions.md`**: no department mention at all — consistent with department not being a survey concern.

## Files that need to change to fix this

1. **`frontend/src/components/survey/EmployeePicker.tsx`** — remove `<strong>{selected.department}</strong> · ` from the context line so it reads just `{LEVEL_LABELS[selected.level]}` (+ `· Manager: {manager.name}` when present), matching PRD §7.1's example exactly.
2. **`frontend/src/pages/SurveyPage.css`** — check the `.employee-context strong` rule; once nothing in that div is wrapped in `<strong>`, confirm whether that selector is still used elsewhere (`AdoptionSidePanel`/dashboard CSS is a separate file, so likely not) and remove it if it becomes dead.
3. **`docs/ADR.md`** (line 292) — reword "The frontend may display department, level, and manager as read-only context" so it no longer implies department is shown in the survey UI; align it with PRD §7.1 (level and manager only).
4. **`CLAUDE.md`** architecture principle 3 — clarify that department is *stored and looked up* on the Employee record but, for the initial version, only level and manager are *displayed* to the employee during survey submission.
5. **Test coverage gap (optional but recommended alongside the fix)** — there is currently no frontend test asserting what the employee picker's context line shows. Worth adding a small test/assertion (in `frontend/tests/frontend.test.mjs` or a new EmployeePicker-focused test) that the rendered context excludes department and includes level/manager, so this doesn't regress again silently.

## Notes

The stale frontend test calls with a `groupBy` positional argument were fixed before this bug tracker was made public. `frontend/tests/frontend.test.mjs` now calls `fetchDashboardMetrics(scope, q3Q5Criteria)`.
