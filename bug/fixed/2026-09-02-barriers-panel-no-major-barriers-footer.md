# Barriers panel can call "No major barriers" the most cited barrier

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

The "What's limiting AI value" panel footer can report `No major barriers` as the most cited barrier, which is misleading because that option means the respondent reported no barrier.

## Details

`frontend/src/components/dashboard/DistributionPanels.tsx` computes:

```ts
const topBarrier = topRow(metrics.barriers.rows);
```

and then renders:

```ts
foot: mostCitedBarrierFoot(topBarrier)
```

`topRow()` does not exclude `no_major_barriers`, so if `No major barriers` has the highest count, the footer becomes:

```text
No major barriers is the most cited barrier, at X%.
```

That conflicts with the meaning of the option. The backend already handles this distinction in `MetricsAggregator._top_barrier()`, where `NO_MAJOR_BARRIERS` is explicitly skipped for group-level `top_barrier`.

Expected behavior: the barriers chart may still show the `No major barriers` row as a valid distribution option, but the footer that names the "most cited barrier" should consider only actual barrier options. If no actual barriers are selected, it should say no barriers have been selected/reported yet.

## Notes

Likely files to inspect when fixing:

- `frontend/src/components/dashboard/DistributionPanels.tsx`
- `frontend/tests/frontend.test.mjs`
- `frontend/e2e/survey-dashboard.spec.ts`

No backend or database change appears necessary.

## Fix

- Kept `No major barriers` visible in the Q8 barrier distribution chart.
- Added a frontend helper that excludes `no_major_barriers` only when choosing the footer's "most cited barrier" summary.
- Kept the existing empty-state footer for cases where no actual barrier options have counts.
- Updated PRD and metrics documentation to capture this distinction.
- Added frontend regression coverage for a case where `No major barriers` has the highest count but an actual barrier should still be selected for the footer.
- Extended the Playwright dashboard smoke test with real API submissions where `No major barriers` outnumbers actual barriers.

## Local Verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && uv run --extra dev pytest`
- `cd frontend && npm run test:e2e`
