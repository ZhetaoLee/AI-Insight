# Q8 "No major barriers" renders as a peer checkbox instead of being visually set apart

- **Status:** Active
- **Reported:** 2026-09-02

## Summary

Confirmed: on the survey, Q8's "No major barriers" option renders in the exact same grid, with the exact same checkbox styling, as every other barrier choice ("Tool access," "Lack of training," etc.) — nothing visually signals that it's a different kind of choice (a mutually-exclusive "none of the above," not a peer barrier). Confirmed separately: the underlying mutual-exclusivity behavior the report describes — selecting "No major barriers" clears any other selected barriers, and selecting any other barrier while "No major barriers" is active removes it — is already fully implemented and working; this report is UI-only, no behavior change needed.

## Details

### Confirmed: identical rendering for every Q8 option, no visual grouping

`frontend/src/components/survey/MultiSelectQuestion.tsx:31-53` renders every option in `options` (Q8's full list, including `no_major_barriers`) inside one shared `.option-grid`, each as an identical `.checkbox-option` button — same size, same checkbox style, same spacing, no conditional styling based on the option's code.

`frontend/src/types/survey.ts:119-129` (`BARRIERS`) confirms `no_major_barriers` sits at position 8 of 9, sandwiched between "Poor workflow fit" and "Other" — in the middle of the flow, not set apart:

```ts
export const BARRIERS: SurveyOption[] = [
  { code: "tool_access", label: "Tool access" },
  { code: "lack_of_training", label: "Lack of training" },
  { code: "reliability_concerns", label: "Reliability concerns" },
  { code: "review_effort", label: "Review effort" },
  { code: "security_privacy_concerns", label: "Security and privacy concerns" },
  { code: "lack_of_internal_context", label: "Lack of internal context" },
  { code: "poor_workflow_fit", label: "Poor workflow fit" },
  { code: NO_MAJOR_BARRIERS_CODE, label: "No major barriers" },
  { code: OTHER_CODE, label: "Other" },
];
```

`frontend/src/pages/SurveyPage.css:138-142` (`.option-grid`) is a plain auto-fit grid with no per-option distinction: `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2px 24px;`.

### Confirmed: the mutual-exclusivity behavior already works exactly as described, no functional gap

`frontend/src/lib/surveyForm.ts:40-44` (`toggleBarrierSelection`):

```ts
export function toggleBarrierSelection(current: string[], code: string): string[] {
  if (current.includes(code)) return current.filter((c) => c !== code);
  if (code === NO_MAJOR_BARRIERS_CODE) return [code];
  return [...current.filter((c) => c !== NO_MAJOR_BARRIERS_CODE), code];
}
```

Both directions the report describes already work: selecting "No major barriers" clears everything else (`return [code]`), and selecting any other barrier while "No major barriers" is active removes it (`current.filter((c) => c !== NO_MAJOR_BARRIERS_CODE)`). This is covered by an existing passing test, `frontend/tests/frontend.test.mjs:126-129` ("Q8 no_major_barriers is mutually exclusive in toggle behavior and validation"). Confirms the report's own statement — "no need to change functionality" — is accurate; this is purely a rendering/layout gap.

### A relevant precedent already exists on the dashboard side

`frontend/src/components/dashboard/DistributionPanels.tsx:148-151` already treats `no_major_barriers` as visually distinct from real barriers in the "What's limiting AI value" chart — it gets its own neutral gray color (`BARRIER_GRAY`) instead of the green shades used for actual barriers:

```tsx
rows: metrics.barriers.rows.map((r, idx) => ({
  ...r,
  color: r.code === NO_MAJOR_BARRIERS_CODE ? BARRIER_GRAY : idx === 0 ? DARK_GREEN : GREEN,
})),
```

So the app already has a working precedent of treating this specific option as visually different from the rest of the barrier list — just not yet on the survey form's own input side, which is what this report is about.

### No test or doc dependency on the current flat rendering

`docs/Questions.md:129-130` documents the mutual-exclusivity *behavior* ("`no_major_barriers` is mutually exclusive with every other barrier option") but says nothing about visual presentation or grouping — there's no documented layout to preserve or violate. Searched `frontend/tests/frontend.test.mjs` and `frontend/e2e/survey-dashboard.spec.ts` for `option-grid`/`checkbox-option` — no assertions reference this grid's layout or per-option styling, only the mutual-exclusivity behavior and the dashboard's separate treatment (both already covered and unaffected by a UI-only change here).

### What "different hierarchy" could concretely mean — an open design decision

The report says "No major barriers" shouldn't share the same hierarchy as the other options but doesn't specify the exact treatment. Reasonable directions, none mandated by this report: a visual divider or "or" separator setting it apart from the checkbox grid; a distinct background/border/muted style (echoing the dashboard's gray treatment above); or moving it out of `.option-grid` into its own row below the other 7 real barriers, with "Other" (not mutually exclusive with anything, so a true peer option) remaining in the regular grid alongside the 7 real barriers. Picking the specific treatment is an implementation decision this report doesn't resolve.

## Notes

**Files that need to change:**

1. `frontend/src/components/survey/MultiSelectQuestion.tsx` — render `no_major_barriers` with distinct markup/styling from the regular option list (exact treatment per the design decision above); no change to the `onToggle` wiring or any other prop, since the underlying behavior is already correct.
2. `frontend/src/pages/SurveyPage.css` — new styles for whatever visual separation is chosen (e.g. a divider, a muted/bordered variant of `.checkbox-option`, or a separate layout row).

No backend, database, or documentation changes are needed — this is frontend presentation only; the mutual-exclusivity behavior, validation, and submitted data shape are all unaffected and already correct.
