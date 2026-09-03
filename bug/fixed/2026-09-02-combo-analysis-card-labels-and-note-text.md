# Productivity payoff analysis card: drop Q3/Q4/Q5 prefixes from selector labels and simplify the denominator note

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Confirmed: the "Productivity payoff analysis" card's three criteria selectors are labeled "Q3 · Weekly time saved," "Q4 · Work output impact," and "Q5 · Work quality impact," and its footer note reads `Denominator excludes anyone who answered "Not sure" on Q3, Q4, or Q5, or has no answer for any of them.` Requested change: drop the "Q3 ·"/"Q4 ·"/"Q5 ·" prefixes from the selector labels, and change the note to name the questions by their plain-English names instead of question numbers, dropping the "or has no answer for any of them" clause.

## Details

### Confirmed: exact current text

`frontend/src/components/dashboard/ComboAnalysisCard.tsx:17,21-24`:

```tsx
const note = 'Denominator excludes anyone who answered "Not sure" on Q3, Q4, or Q5, or has no answer for any of them.';
...
const selectors = [
  { label: "Q3 · Weekly time saved", options: ANALYSIS_WEEKLY_TIME_SAVED, value: analysis.criteria.weekly_time_saved, key: "weekly_time_saved" as const },
  { label: "Q4 · Work output impact", options: ANALYSIS_WORK_OUTPUT_CHANGE, value: analysis.criteria.work_output_change, key: "work_output_change" as const },
  { label: "Q5 · Work quality impact", options: ANALYSIS_QUALITY_CHANGE, value: analysis.criteria.quality_change, key: "quality_change" as const },
];
```

Both pieces are rendered on the dashboard today exactly as described in the report — confirmed against current source, not a stale assumption.

### No test or doc currently locks in either piece of text

Searched `frontend/tests/frontend.test.mjs`, `frontend/e2e/survey-dashboard.spec.ts`, and every file under `docs/` for the exact label strings (`"Q3 · Weekly time saved"`, etc.) and the note text (`"Denominator excludes..."`) — no matches anywhere outside this component file itself. Changing this text won't break any existing assertion, though nothing currently locks the *new* text in either, so consider adding coverage once changed (see Notes).

### Worth flagging: the requested note wording changes "or" to "and" between the three question names

The current note uses **"or"** (`"Not sure" on Q3, Q4, or Q5`), matching the actual exclusion logic in `backend/app/services/metrics.py`'s `_q3_q5_analysis` — a respondent is excluded from the denominator if they answered `"not_sure"` on **any one** of the three questions (logical OR), not only if they did so on all three. The requested replacement text — `excludes anyone who answered "Not sure" on Weekly time saved, Work output impact, and Work quality impact` — uses **"and"** as the connector.

Read as a natural-language list ("the form asks for your name, address, and phone number"), "and" here would still commonly be understood as "each of these three questions is subject to this exclusion," which matches the real OR-based exclusion behavior. But read literally as a logical connective, "and" could be misread as "only excluded if 'not sure' on all three," which would misstate the actual behavior. This report doesn't resolve which reading is intended — flagging it so whoever implements it makes a deliberate choice (keep "or" for logical precision, or use "and" as intended and accept the natural-language reading) rather than it being an unnoticed side effect of a copy-paste.

### Worth flagging: dropping "or has no answer for any of them" is accurate today, but only today

That clause was added when the "Productivity payoff analysis" denominator fix was implemented, anticipating the separately-filed (and, as of this writing, not implemented) `bug/2026-09-02-never-ai-users-should-skip-q2-q7.md` — the scenario where an employee who selects "Never" for Q1 would have no real answer to Q3/Q4/Q5 at all, not just a "not_sure" one. Since that bug remains unimplemented, no response in the system today can actually have a missing (as opposed to `"not_sure"`) answer to Q3/Q4/Q5, so removing this clause is accurate to the *current* system. If that other bug is implemented later, this note would need the clause added back, or it would go stale again in the other direction (understating what's excluded). Flagging this for future awareness rather than treating it as blocking.

## Notes

**Files that need to change:**

1. `frontend/src/components/dashboard/ComboAnalysisCard.tsx` — remove the `"Q3 · "`/`"Q4 · "`/`"Q5 · "` prefixes from the three `selectors` labels (lines 22-24), leaving just `"Weekly time saved"`, `"Work output impact"`, `"Work quality impact"`; update the `note` constant (line 17) to name the three questions by their plain-English labels instead of Q3/Q4/Q5, and drop the "or has no answer for any of them" clause, per the two considerations flagged above.
2. Optional (not required since nothing currently references the old text, but worth adding to prevent this from silently reverting): a `frontend/tests/frontend.test.mjs` source-text assertion checking the selector labels no longer include `"Q3 ·"`/`"Q4 ·"`/`"Q5 ·"` and that the note reads as intended.

No backend, database, or documentation changes are needed — this is presentation-only copy in one frontend component; nothing in `docs/PRD.md` or `docs/metrics.md` documents this exact wording, and the underlying exclusion logic itself is unaffected.

## Fix

- Removed the `"Q3 · "`/`"Q4 · "`/`"Q5 · "` prefixes from the three selector labels in `ComboAnalysisCard.tsx`; they now read plainly as "Weekly time saved," "Work output impact," and "Work quality impact."
- Changed the note to: `Denominator excludes anyone who answered "Not sure" on Weekly time saved, Work output impact, and Work quality impact.` — implemented as requested, including the "and" connector and dropping the "or has no answer for any of them" clause. Kept the leading "Denominator" word and trailing period (your quoted target text omitted both) since dropping them would leave an ungrammatical sentence fragment as standalone card copy; this is a minor interpretive call on my part, flagged here in case it wasn't what you intended.
- Left the "or"-vs-"and" semantic question and the "missing answer" clause exactly as you specified in the report — no independent judgment call was made on those; if the "and" reading turns out to be a real source of confusion, or the separate `bug/2026-09-02-never-ai-users-should-skip-q2-q7.md` bug is later implemented (making a genuinely missing Q3/Q4/Q5 answer possible again), this note would need revisiting.
- Added a `frontend/tests/frontend.test.mjs` test locking in the new label/note text and the absence of the old `Q3/Q4/Q5 ·` prefixes.
- No backend, database, or documentation changes were needed, matching the original analysis.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 39 tests pass, including the new label/note wording test.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 99 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes.
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
