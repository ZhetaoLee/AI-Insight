# Records table mislabels unavailable top barriers as "No major barriers"

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

The Level records table renders `top_barrier: null` as `No major barriers`, which conflates unavailable/no-response data with an actual survey answer.

## Details

`docs/metrics.md` defines `top_barrier` as the highest-count Q8 barrier for the group, or `null` when unavailable.

`frontend/src/components/dashboard/RecordsTable.tsx` currently renders:

```tsx
{r.top_barrier ? r.top_barrier.label : "No major barriers"}
```

This means a group with zero respondents, or a group where no actual barrier can be computed, appears to have positively reported "No major barriers." That is not the same state. It can make leadership think there is no issue in a group when the real condition is missing or unavailable data.

Expected behavior: `top_barrier: null` should render as an unavailable state such as `-` or `No barrier data`, while an actual `No major barriers` response should only appear if the backend explicitly returns that label.

## Notes

Likely files to inspect when fixing:

- `frontend/src/components/dashboard/RecordsTable.tsx`
- `frontend/tests/frontend.test.mjs`
- `frontend/e2e/survey-dashboard.spec.ts`

No backend or database change appears necessary.

## Fix

Found already implemented at the time this bug was picked up for fixing — confirmed and verified rather than re-implemented:

- `frontend/src/components/dashboard/RecordsTable.tsx` exports `topBarrierLabel(topBarrier)`, which maps `null` → `"No barrier data"` and only renders the literal `"No major barriers"` label when the backend explicitly returns that as `top_barrier.label` (i.e. a real Q8 answer), matching `docs/metrics.md`'s definition exactly.
- `backend/app/services/metrics.py`'s `_top_barrier()` explicitly excludes `NO_MAJOR_BARRIERS` from the count and returns `None` when no actual barrier can be computed for the group — confirmed by `backend/tests/test_metrics_aggregator.py` (`rows["director"].top_barrier is None` when unavailable, non-`None` with the correct label otherwise).
- Covered by `frontend/tests/frontend.test.mjs` ("records table labels null top barrier as unavailable data") and `frontend/e2e/survey-dashboard.spec.ts` (asserts `"No barrier data"` appears and `"No major barriers"` does not appear in the records table).

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 35 tests pass, including the dedicated `topBarrierLabel` test.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 95 passed.
- `cd frontend && npm run test:e2e` — Playwright smoke test passes, including the records-table barrier-label assertions.
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
