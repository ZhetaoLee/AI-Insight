# Q4/Q5/Q6 have no "Not sure" option, and the Productivity payoff analysis denominator only excludes it for Q3

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02
- **Rechecked:** 2026-09-02 — re-verified every cited file (`docs/Questions.md`, `docs/PRD.md`, `frontend/src/types/survey.ts`, `backend/app/models/survey_response.py`, `backend/app/models/metrics.py`, `frontend/src/components/dashboard/ComboAnalysisCard.tsx`, `backend/app/services/metrics.py`); nothing has changed, all findings below still hold exactly as described.

## Summary

Three related, confirmed gaps:

1. Q4 (Work Output Impact), Q5 (Work Quality Impact), and Q6 (AI Rework Frequency) have no "Not sure" answer option anywhere — not in the docs, not in the frontend option lists, not in the backend's allowed values. Only Q3 (Weekly Time Saved) currently has one.
2. The "Productivity payoff analysis" card (the Dynamic Q3-Q5 combo analysis) is supposed to exclude "Not sure" from its denominator for Q3, Q4, *or* Q5 — and its own UI copy already claims to do exactly that — but the backend calculation only actually excludes "Not sure" for Q3. Since Q4/Q5 don't have a "Not sure" option today (per gap 1), this is currently unreachable/moot for them, but the code doesn't implement it even structurally, and the UI text is already making a claim the implementation doesn't back up.
3. **Confirmed in scope** (elevated from an earlier "unresolved consideration" in this file to a required part of the fix, per direct instruction): the three standalone dashboard distribution cards fed by Q4/Q5/Q6 — **"Output impact," "Quality impact," and "Rework burden"** — need updating too. Their row-coloring logic and footer percentages currently have no concept of a `"not_sure"` answer, and would misrender/miscalculate once one becomes possible, detailed below.

## Details

### Confirmed: no "Not sure" option exists for Q4, Q5, or Q6 today

- `docs/Questions.md` — Q4 (lines 65-74), Q5 (76-85), Q6 (86-95) each list exactly 5 options; none include "Not sure." Only Q3 (line 63) has `not_sure`.
- `docs/PRD.md` §8 — Q5 (line 295-305) and Q6 (line 313-323) option lists match `Questions.md` exactly; no "Not sure."
- `frontend/src/types/survey.ts` — `WORK_OUTPUT_CHANGE`, `QUALITY_CHANGE`, `CORRECTION_FREQUENCY` arrays contain only their five documented options, no `not_sure` entry.
- `backend/app/models/survey_response.py:21-23` — the `WorkOutputChange`, `QualityChange`, `CorrectionFrequency` `Literal` type aliases each enumerate exactly five values; `"not_sure"` is not one of them, so the API would reject it outright today even if the frontend somehow submitted it.

### Confirmed: the combo-analysis UI already claims a Q3/Q4/Q5 exclusion the backend doesn't implement

`frontend/src/components/dashboard/ComboAnalysisCard.tsx:15`:

```tsx
const note = 'Denominator excludes "Not sure" on Q3 and anyone missing an answer to Q3, Q4, or Q5.';
```

This footer text is shown on the dashboard today. But `backend/app/services/metrics.py:249-267` (`_q3_q5_analysis`) only does this:

```python
valid = [response for _, response in respondents if response.answers.weekly_time_saved != "not_sure"]
```

This checks **Q3 only**. There is no equivalent check against `work_output_change` or `quality_change` for a `"not_sure"` value, and (relevant to the separately-filed `bug/2026-09-02-never-ai-users-should-skip-q2-q7.md`) no check for a missing/`None` answer either. Since Q4/Q5 can't currently hold `"not_sure"` at all, this mismatch is presently unreachable — but it confirms the UI copy was written ahead of (or independent from) the backend implementation, and both need to change together once Q4/Q5 gain the option.

### Confirmed: docs currently document the exclusion as Q3-specific, not Q3/Q4/Q5

- `docs/PRD.md` §12.4 (line 530): *"If Q3 is part of the analysis, exclude `Not sure` from the denominator."* — scoped to Q3 only.
- `docs/metrics.md` (Dynamic Q3-Q5 Analysis section, line 164): *"Exclude Q3 `not_sure` from the denominator."* — also Q3-only.
- `CLAUDE.md` principle 4: *"Exclude `not_sure` from Dynamic Q3-Q5 analysis rather than treating it as no time saved."* — written in the context of Q3 weekly time saved specifically.

All three would need rewording to cover Q4 and Q5 once those questions can hold `"not_sure"`.

### Scope clarification: Q6 is not part of the combo analysis at all

The Dynamic Q3-Q5 analysis (`Q3Q5Criteria`, `_q3_q5_analysis`) only ever combines Q3 (time saved), Q4 (output), and Q5 (quality) — Q6 (rework frequency) is a separate, standalone metric (`ai_rework_frequency`) and was never part of this combo analysis. So the request's two parts have different scope: adding "Not sure" to Q6 is only about Q6's own answer options and its own distribution chart ("Rework burden"); it has no bearing on the Productivity payoff analysis denominator, which only ever concerned Q3/Q4/Q5.

### Backend model change needed for the combo-analysis criteria themselves

`backend/app/models/metrics.py:97-107` (`Q3Q5Criteria`) already has this exact pattern for Q3 — its `weekly_time_saved` field uses a separate `AnalysisWeeklyTimeSaved` type (the normal `WeeklyTimeSaved` Literal minus `"not_sure"`) plus a `reject_not_sure` validator, specifically because `"not_sure"` isn't a sensible *target value* for leadership to filter by (you can't ask "show me everyone who selected Not sure for Q3" as a meaningful productivity-payoff criterion in the same way as the other bands). Once `"not_sure"` is added to `WorkOutputChange`/`QualityChange`, `Q3Q5Criteria.work_output_change`/`.quality_change` (currently typed directly as the raw `WorkOutputChange`/`QualityChange` types) would need the same treatment: an `AnalysisWorkOutputChange`/`AnalysisQualityChange` type variant excluding `"not_sure"`, with matching validators — otherwise leadership could select "Not sure" as a Q4 or Q5 filter criterion, which shouldn't be possible per the existing Q3 precedent.

### Frontend: the combo selector needs the same "not_sure" filtering as Q3 already has

`ComboAnalysisCard.tsx:5` already filters `not_sure` out of the Q3 picker's own option list: `ANALYSIS_WEEKLY_TIME_SAVED = WEEKLY_TIME_SAVED.filter((option) => option.code !== "not_sure")`. The Q4 and Q5 selectors (lines 21-22) currently use the raw `WORK_OUTPUT_CHANGE`/`QUALITY_CHANGE` arrays directly — once `"not_sure"` is added to those arrays (for the survey form's own Q4/Q5 questions), the combo picker would need equivalent `ANALYSIS_WORK_OUTPUT_CHANGE`/`ANALYSIS_QUALITY_CHANGE` filtered constants, mirroring the Q3 pattern, so "Not sure" doesn't appear as a selectable target criterion there either.

### Confirmed in scope: "Output impact," "Quality impact," and "Rework burden" cards need updating

`frontend/src/components/dashboard/DistributionPanels.tsx` defines these three panels (titles at lines 113, 121, 129), fed directly by the backend's `work_output`, `work_quality`, and `ai_rework_frequency` distributions. Two concrete problems once `"not_sure"` becomes a valid answer to Q4/Q5/Q6:

1. **Row coloring would miscategorize "Not sure" as a value judgment.** Each panel colors rows purely by array position, with no awareness of a `"not_sure"` code:
   - "Output impact" (line 116): `color: idx <= 1 ? RED : GREEN` — a `"not_sure"` row appended after the existing five would land at `idx === 5`, coloring it **GREEN** (implying positive output impact, which is wrong — "not sure" isn't a positive signal).
   - "Quality impact" (line 124): same `idx <= 1 ? RED : GREEN` pattern — same wrong-GREEN risk.
   - "Rework burden" (line 132): `color: idx >= 3 ? RED : GREEN` — a `"not_sure"` row at `idx === 5` would satisfy `idx >= 3` and render **RED** (implying frequent rework, which is also wrong — "not sure" isn't a negative signal either).

   Contrast with the existing **"Time saved per week"** panel (Q3, line 107), which already handles this correctly: `color: r.code === "not_sure" ? GRAY : idx <= 1 ? AMBER : GREEN` — it explicitly special-cases `"not_sure"` to a neutral gray *before* falling back to position-based coloring. The fix for all three Q4/Q5/Q6 panels is the same pattern: check `r.code === "not_sure"` first and render it gray, consistent with the Q3 panel already in this same file.

2. **Footer percentages would be silently diluted, not correctly excluded.** Each panel's footer stat is computed via `pctForCodes(rows, denominator, [...])` (line 71-74), where `denominator` is `metrics.work_output.denominator` / `metrics.work_quality.denominator` / `metrics.ai_rework_frequency.denominator` — passed straight through from the backend's `_option_distribution`, which (per the earlier finding in this file) returns `denominator=len(respondents)`, every respondent in scope, with no `"not_sure"` exclusion. So `moreOutputPct`, `betterQualityPct`, and `frequentReworkPct` would each get quietly diluted by "Not sure" answers rather than excluding them — the exact same denominator problem already identified for the Productivity payoff analysis, just for these three standalone cards' own footer text instead of the combo analysis. Fixing the backend's `_option_distribution` denominator (or an equivalent per-question "answered" count) to exclude `"not_sure"` fixes both this and the panels' percentages together, since they share the same underlying `QuestionDistribution` data.

This confirms and resolves what the "related, unresolved consideration" in an earlier version of this file left open: yes, this is in scope, and it reaches beyond just `reports_more_output_rate`/`frequent_rework_rate` (headline and group-breakdown metrics) to these three dashboard cards' own coloring and footer text as well, since all of it is downstream of the same `_option_distribution` denominator.

### Reconfirmed: the Productivity payoff analysis fix is unchanged from above

To remove any ambiguity: the fix already described in this file for `backend/app/services/metrics.py`'s `_q3_q5_analysis` — extending the `valid` filter to exclude `"not_sure"` on `weekly_time_saved` (Q3), `work_output_change` (Q4), *or* `quality_change` (Q5), not just Q3 — remains exactly the required behavior for the "Productivity payoff analysis" card's `analysis_denominator`. This is a separate calculation from the three distribution panels above (the combo analysis has its own denominator, distinct from each question's individual distribution denominator), so both need the fix, not just one.

## Notes

**Files that need to change:**

1. `docs/Questions.md` — add a `not_sure`/"Not sure" option to Q4, Q5, and Q6's option lists.
2. `docs/PRD.md` §8 (Q5 and Q6 option lists) and §12.4 (reword "If Q3 is part of the analysis..." to cover Q3, Q4, and Q5).
3. `docs/metrics.md` — add `not_sure` to the Q4/Q5/Q6 sections' option lists, and reword the Dynamic Q3-Q5 Analysis section's exclusion rule to cover all three questions, not just Q3.
4. `CLAUDE.md` principle 4 — reword to reflect that the Missing Data Rule now applies to Q4, Q5, and Q6 wherever they feed a rate or distribution (individual question distributions, the three dashboard cards, and the combo analysis alike), not only the Dynamic Q3-Q5 analysis.
5. `frontend/src/types/survey.ts` — add a `not_sure` option to `WORK_OUTPUT_CHANGE`, `QUALITY_CHANGE`, and `CORRECTION_FREQUENCY`.
6. `frontend/src/components/dashboard/ComboAnalysisCard.tsx` — add `ANALYSIS_WORK_OUTPUT_CHANGE`/`ANALYSIS_QUALITY_CHANGE` filtered constants (excluding `not_sure`) for the Q4/Q5 selectors, mirroring `ANALYSIS_WEEKLY_TIME_SAVED`; the footer `note` text is already accurate to the *target* behavior and shouldn't need wording changes once the backend actually implements it.
7. `frontend/src/components/dashboard/DistributionPanels.tsx` — add a `r.code === "not_sure" ? GRAY : ...` first-check to the "Output impact" (line 116), "Quality impact" (line 124), and "Rework burden" (line 132) row-coloring, mirroring the existing "Time saved per week" panel's `not_sure` handling (line 107); their footer percentages (`moreOutputPct`, `betterQualityPct`, `frequentReworkPct`) will self-correct once the backend denominator fix (item 9 below) lands, since they consume the same `QuestionDistribution.denominator`.
8. `backend/app/models/survey_response.py:21-23` — add `"not_sure"` to the `WorkOutputChange`, `QualityChange`, and `CorrectionFrequency` `Literal` type aliases.
9. `backend/app/models/metrics.py:97-107` — add `AnalysisWorkOutputChange`/`AnalysisQualityChange` type variants (excluding `not_sure`) and matching `reject_not_sure`-style validators to `Q3Q5Criteria`, alongside the existing one for `weekly_time_saved`.
10. `backend/app/services/metrics.py` — (a) `_q3_q5_analysis` (line 254): extend the `valid` filter to also exclude responses where `work_output_change == "not_sure"` or `quality_change == "not_sure"`, not just `weekly_time_saved`, fixing the Productivity payoff analysis denominator; (b) `_option_distribution` and its `denominator=len(respondents)` (line 197): change to exclude `"not_sure"` answers from both the count and the denominator for `work_output`, `work_quality`, and `ai_rework_frequency`, fixing the three dashboard cards' own percentages; (c) the headline `reports_more_output` and per-group `more_output_rate`/`frequent_rework_rate` computations (lines 120, 136, 282-283 and group-breakdown equivalent) need the same `"not_sure"` exclusion for consistency, since they're derived from the same answers.
11. Backend and frontend tests — coverage for: submitting Q4/Q5/Q6 as `"not_sure"`; the combo-analysis denominator correctly excluding a respondent who answered `"not_sure"` on Q4 or Q5 (not just Q3); the "Output impact"/"Quality impact"/"Rework burden" cards correctly excluding `"not_sure"` from their own percentages and coloring it gray; the combo-analysis criteria selectors rejecting/not offering `"not_sure"` as a target value for Q4/Q5.

No destructive database change is needed — this only widens the set of allowed answer values and changes how several existing metrics filter existing/future responses.

## Fix

- Added `not_sure` to Q4/Q5/Q6's option lists in `docs/Questions.md`, `docs/PRD.md` §8, `frontend/src/types/survey.ts` (`WORK_OUTPUT_CHANGE`, `QUALITY_CHANGE`, `CORRECTION_FREQUENCY`), the backend `Literal` type aliases in `backend/app/models/survey_response.py`, and — critically, a gap this bug file's original investigation missed — the backend service's own `WORK_OUTPUT_CHANGE`/`QUALITY_CHANGE`/`CORRECTION_FREQUENCY` option tuples in `backend/app/services/metrics.py` (used to build each distribution's row set). Without that last one, `_option_distribution`'s `counts[answer_code(response)] += 1` would have raised a `KeyError` the moment any respondent answered `"not_sure"` on Q4/Q5/Q6 — the same class of crash risk already identified for the "Never" bug, just newly discovered here during implementation.
- `Q3Q5Criteria` (`backend/app/models/metrics.py`) now has `AnalysisWorkOutputChange`/`AnalysisQualityChange` type variants and matching `reject_not_sure`-style validators for `work_output_change`/`quality_change`, mirroring the existing `weekly_time_saved` pattern exactly.
- `_q3_q5_analysis` (`backend/app/services/metrics.py`) now excludes any respondent who answered `not_sure` on Q3, Q4, *or* Q5 from `analysis_denominator`, matching what the `ComboAnalysisCard` UI copy already claimed.
- `ComboAnalysisCard.tsx` — added `ANALYSIS_WORK_OUTPUT_CHANGE`/`ANALYSIS_QUALITY_CHANGE` filtered constants for the Q4/Q5 selectors, and reworded the footer note (it previously only named Q3's `not_sure` explicitly, burying Q4/Q5 under an ambiguous "missing an answer" phrase) to plainly state it excludes `"not_sure"` on Q3, Q4, *or* Q5, or a missing answer for any of them.
- `DistributionPanels.tsx` — added the `r.code === "not_sure" ? GRAY : ...` first-check to "Output impact," "Quality impact," and "Rework burden," mirroring the existing "Time saved per week" pattern.
- **Correction to this bug file's own original analysis** — items 10(b) and 10(c) in the Notes above (excluding `not_sure` from `_option_distribution`'s own denominator and from `reports_more_output`/`frequent_rework_rate`) turned out to be **wrong** on closer implementation and were deliberately **not** done. Re-reading `CLAUDE.md` principle 4 and the existing Q3 precedent during implementation: `"not_sure"` is a real, given answer — CLAUDE.md explicitly says Q3's own distribution "remains a categorical distribution" including `not_sure` as a normal bucket, and the Missing Data Rule excludes `not_sure` *only* from the cross-question Dynamic Q3-Q5 analysis, not from any single question's own distribution or rate. So `work_output`/`work_quality`/`ai_rework_frequency`'s own denominators, and `reports_more_output_rate`/`frequent_rework_rate`, correctly *include* `not_sure` respondents in their denominator (just never in the positive-signal numerator) — exactly like `active_ai_users`/`ai_adoption_rate` already includes "Never" respondents in their denominator. Verified live: submitting a response with `not_sure` on Q4/Q5/Q6 produces `work_output.denominator == 1` (includes the respondent) with a `not_sure` row of `count: 1, pct: 100`, while `q3_q5_analysis.analysis_denominator == 0` (excludes them) — the two denominators behave differently, by design.
- Reworded `docs/PRD.md` §12.4, `docs/metrics.md` (Q4/Q5/Q6 sections, Dynamic Q3-Q5 Analysis, and Missing Data Rule), `CLAUDE.md` principle 4, and `AGENTS.md`'s test-coverage summary to state this distinction explicitly, so the two different denominator behaviors don't get conflated again.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 37 tests pass, including new coverage for `not_sure` option presence, gray coloring, and the extended combo-analysis criteria rejection.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 99 passed (95 original + 4 new: `Q3Q5Criteria` rejecting `not_sure` for `work_output_change`/`quality_change`, the combo analysis excluding `not_sure` on Q4/Q5, and `not_sure` correctly counting toward each question's own denominator without diluting `reports_more_output`).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes against the full Docker Compose stack.
- Live manual smoke test against the running stack: submitted a response with `not_sure` on Q4/Q5/Q6 via `POST /api/survey-responses` (201, no crash), then confirmed via `GET /api/metrics` that each question's own distribution correctly included the `not_sure` row while `q3_q5_analysis.analysis_denominator` correctly excluded it. Cleaned up the test submission afterward (`db.survey_responses.deleteMany({})`).
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact).
