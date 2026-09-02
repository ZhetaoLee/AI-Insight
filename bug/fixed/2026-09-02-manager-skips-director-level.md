# One management branch skips the Director level (a Manager reports directly to the Senior Director)

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: there's exactly one Senior Director, which is correct per spec — but one of the three Managers reports directly to that Senior Director instead of to a Director, breaking the intended IC → Manager → Director → Senior Director chain for that one branch, in both copies of the seed data.

## Details

### The single Senior Director is correct, not a bug

`docs/PRD.md` §19 "Hierarchy Requirements" gives the canonical seeded-org composition explicitly:

```text
1 Senior Director
2 Directors
3 Managers
4 Individual Contributors
```

...and a worked example tree with exactly that shape (Michael Wang as the one SD, with two Directors under him, three Managers under those, four ICs under those). `backend/tests/test_foundation.py`'s `EXPECTED_LEVEL_COUNTS` (lines 8-13) asserts precisely `{senior_director: 1, director: 2, manager: 3, ic: 4}`, and `test_seed_employees_have_required_plan_one_shape` checks the live seed data matches it — currently passing. So one Senior Director is intentional and documented, not something to change.

### The actual bug: one Manager's chain skips Director

`backend/app/repositories/seed.py:22-33` (identical structure duplicated in `frontend/src/api/employees.ts:7-18`):

```python
employee("emp_101", "Priya Nair",   "senior_director"),
employee("emp_102", "Sarah Lee",    "director",  "emp_101"),
employee("emp_103", "David Kim",    "manager",   "emp_102"),
employee("emp_104", "Alice Chen",   "ic",        "emp_103"),
employee("emp_105", "Marcus Webb",  "ic",        "emp_103"),
employee("emp_106", "Elena Ruiz",   "director",  "emp_101"),
employee("emp_107", "Noah Patel",   "manager",   "emp_106"),
employee("emp_108", "Jade Thompson","ic",        "emp_107"),
employee("emp_109", "Omar Farouk",  "manager",   "emp_101"),   # <- reports to the SD directly
employee("emp_110", "Grace Liu",    "ic",        "emp_109"),
```

As a tree:

```text
Priya Nair — Senior Director
├── Sarah Lee — Director
│   └── David Kim — Manager
│       ├── Alice Chen — IC
│       └── Marcus Webb — IC
├── Elena Ruiz — Director
│   └── Noah Patel — Manager
│       └── Jade Thompson — IC
└── Omar Farouk — Manager        ← reports directly to Priya Nair (SD), no Director in between
    └── Grace Liu — IC
```

Two of the three branches (Sarah Lee's and Elena Ruiz's) correctly show the full IC → Manager → Director → Senior Director chain. The third (Omar Farouk's) goes IC → Manager → **Senior Director**, skipping Director entirely — Omar Farouk's `manager_id` is `emp_101` (the Senior Director) instead of one of the two Directors' ids (`emp_102` or `emp_106`).

This directly deviates from PRD §19's own canonical example, where every one of the three Managers (David Kim, Emily Zhang, Noah Patel in the example) nests under a Director — none reports to the Senior Director directly. It's also a narrower reading of `docs/ADR.md:34`: "The seeded dataset ... must still include every level and enough branching to verify Individual Contributor → Manager → Director → Senior Director → org-wide aggregation" — satisfied by the other two branches, but not by this one.

### This is a data/test-coverage issue, not a computation bug

Scope resolution (`backend/app/services/hierarchy.py`'s `descendant_ids`, `backend/app/services/scope_resolver.py`) walks `manager_id` links generically via BFS — it doesn't care whether a parent is level-adjacent, so metrics for Omar Farouk's manager-scope still compute correctly (verified earlier today live: `scope=manager&scope_id=emp_103` etc. all work). This isn't a metrics-correctness bug; it's that the seed data itself doesn't cleanly demonstrate the documented 4-level chain on every branch, and looks structurally inconsistent (two Directors exist, but one Manager bypasses both of them).

### Why existing tests didn't catch this

`test_seed_employees_have_required_plan_one_shape` (`backend/tests/test_foundation.py:24-34`) checks: total count is 10, all `manager_id`s point to real employees, no one manages themselves, and the level *counts* match `{senior_director: 1, director: 2, manager: 3, ic: 4}`. It never checks that each employee's manager is at the correct *adjacent* level (a Manager's manager should be a Director; a Director's manager should be the Senior Director) — so a Manager wired directly under the Senior Director passes every current assertion silently.

## Notes

**Files that would need to change:**

1. `backend/app/repositories/seed.py` — change `emp_109`'s `manager_id` from `"emp_101"` to a Director's id (`"emp_102"` or `"emp_106"`) so every branch demonstrates the full chain.
2. `frontend/src/api/employees.ts` — apply the identical fix, since this is a second, independently-maintained copy of the same org data and must stay in sync with the backend seed.
3. `backend/tests/test_foundation.py` — worth strengthening `test_seed_employees_have_required_plan_one_shape` (or adding a new test) to assert level-adjacency along the manager chain, not just level counts and valid ids — e.g., every `ic`'s manager is a `manager`, every `manager`'s manager is a `director`, every `director`'s manager is the `senior_director`, and the `senior_director` has `manager_id: None`. That's the exact invariant that would have caught this and would prevent it recurring.

No changes needed to `docs/PRD.md` or `docs/ADR.md` — the spec is already correct (1 SD / 2 Directors / 3 Managers / 4 ICs, every branch running the full chain); it's the seed data that deviates from it, not the documentation. No application/service-layer code needs to change either — hierarchy traversal is already level-agnostic and computes correctly regardless of this data issue.

## Fix

Corrected Omar Farouk's manager assignment in both seed-data copies so the
branch no longer skips the Director level:

- `backend/app/repositories/seed.py`: changed `emp_109` from reporting to the
  Senior Director (`emp_101`) to reporting to Director Elena Ruiz (`emp_106`).
- `frontend/src/api/employees.ts`: applied the same fallback seed-data change.
- `backend/tests/test_foundation.py`: added a seed invariant test requiring
  adjacent hierarchy levels: Senior Director -> Director -> Manager ->
  Individual Contributor.
- `frontend/tests/frontend.test.mjs`: added matching frontend fallback seed
  coverage for adjacent management levels.
- `docs/implementation_plan.md`: noted that Plan 2 coverage includes adjacent
  seeded-management levels.

No PRD, ADR, `AGENTS.md`, `CLAUDE.md`, backend service-layer, frontend UI, or
database migration change was needed. Existing MongoDB employee seed records are
updated on app startup through the existing idempotent seed process.

## Verification

Regression tests were added first and failed against the old seed data:

- `uv run --extra dev pytest tests/test_foundation.py` failed because
  `emp_109`'s manager had level `senior_director` instead of `director`.
- `npm test` failed because the frontend fallback seed had the same invalid
  relationship.

Targeted local verification after the fix:

- `uv run --extra dev pytest tests/test_foundation.py tests/test_scope_resolver.py tests/test_seed.py` — 17 passed
- `npm test` — 21 passed
- `npm run lint`

Full local verification run on 2026-09-02:

- `uv run --extra dev pytest` — 92 passed
- `npm test` — 21 passed
- `npm run lint`
- `npm run build`
- `npm run test:e2e` — 1 Playwright test passed
- `git diff --check`
- `docker compose up --build -d`
- `curl -I http://127.0.0.1:5173/dashboard` — 200 OK
- `curl -I http://127.0.0.1:5173/survey` — 200 OK
- `curl http://127.0.0.1:8000/api/employees` — `emp_109` now returns `manager_id: "emp_106"`.
- `curl "http://127.0.0.1:8000/api/metrics?scope=manager&scope_id=emp_106"` — Elena Ruiz's manager scope resolves to 5 eligible employees.
