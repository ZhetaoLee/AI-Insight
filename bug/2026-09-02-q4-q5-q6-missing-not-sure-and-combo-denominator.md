# Q4/Q5/Q6 have no "Not sure" option, and the Productivity payoff analysis denominator only excludes it for Q3

- **Status:** Active
- **Reported:** 2026-09-02
- **Rechecked:** 2026-09-02 — re-verified every cited file (`docs/Questions.md`, `docs/PRD.md`, `frontend/src/types/survey.ts`, `backend/app/models/survey_response.py`, `backend/app/models/metrics.py`, `frontend/src/components/dashboard/ComboAnalysisCard.tsx`, `backend/app/services/metrics.py`); nothing has changed, all findings below still hold exactly as described.

## Summary

Two related, confirmed gaps:

1. Q4 (Work Output Impact), Q5 (Work Quality Impact), and Q6 (AI Rework Frequency) have no "Not sure" answer option anywhere — not in the docs, not in the frontend option lists, not in the backend's allowed values. Only Q3 (Weekly Time Saved) currently has one.
2. The "Productivity payoff analysis" card (the Dynamic Q3-Q5 combo analysis) is supposed to exclude "Not sure" from its denominator for Q3, Q4, *or* Q5 — and its own UI copy already claims to do exactly that — but the backend calculation only actually excludes "Not sure" for Q3. Since Q4/Q5 don't have a "Not sure" option today (per gap 1), this is currently unreachable/moot for them, but the code doesn't implement it even structurally, and the UI text is already making a claim the implementation doesn't back up.

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

### Related, unresolved consideration: does this affect other Q4/Q6-derived rates?

Not explicitly asked for by this report, but worth flagging since it's the same class of issue: once `"not_sure"` becomes a valid Q4 answer, `reports_more_output_rate` (headline metric) and `more_output_rate` (per-group breakdown) currently compute their denominator as every respondent in scope (`metrics.py:120,136,282` and the per-group equivalent), with no `"not_sure"` exclusion — so a wave of "Not sure" Q4 answers would dilute those rates rather than being excluded, similarly to the Missing Data Rule already applied to Q3. Same reasoning applies to `frequent_rework_rate` once Q6 gains `"not_sure"`. This report doesn't resolve whether that exclusion should also be added there — flagging it as a related decision for whoever implements this, since it wasn't explicitly requested.

## Notes

**Files that need to change:**

1. `docs/Questions.md` — add a `not_sure`/"Not sure" option to Q4, Q5, and Q6's option lists.
2. `docs/PRD.md` §8 (Q5 and Q6 option lists) and §12.4 (reword "If Q3 is part of the analysis..." to cover Q3, Q4, and Q5).
3. `docs/metrics.md` — add `not_sure` to the Q4/Q5/Q6 sections' option lists, and reword the Dynamic Q3-Q5 Analysis section's exclusion rule to cover all three questions, not just Q3.
4. `CLAUDE.md` principle 4 — reword to reflect that the Missing Data Rule now applies to Q4 and Q5 (and, per the open consideration above, decide whether it also applies elsewhere Q4/Q6 feed a rate).
5. `frontend/src/types/survey.ts` — add a `not_sure` option to `WORK_OUTPUT_CHANGE`, `QUALITY_CHANGE`, and `CORRECTION_FREQUENCY`.
6. `frontend/src/components/dashboard/ComboAnalysisCard.tsx` — add `ANALYSIS_WORK_OUTPUT_CHANGE`/`ANALYSIS_QUALITY_CHANGE` filtered constants (excluding `not_sure`) for the Q4/Q5 selectors, mirroring `ANALYSIS_WEEKLY_TIME_SAVED`; the footer `note` text is already accurate to the *target* behavior and shouldn't need wording changes once the backend actually implements it.
7. `backend/app/models/survey_response.py:21-23` — add `"not_sure"` to the `WorkOutputChange`, `QualityChange`, and `CorrectionFrequency` `Literal` type aliases.
8. `backend/app/models/metrics.py:97-107` — add `AnalysisWorkOutputChange`/`AnalysisQualityChange` type variants (excluding `not_sure`) and matching `reject_not_sure`-style validators to `Q3Q5Criteria`, alongside the existing one for `weekly_time_saved`.
9. `backend/app/services/metrics.py:254` (`_q3_q5_analysis`) — extend the `valid` filter to also exclude responses where `work_output_change == "not_sure"` or `quality_change == "not_sure"`, not just `weekly_time_saved`.
10. Backend and frontend tests — coverage for: submitting Q4/Q5/Q6 as `"not_sure"`; the combo-analysis denominator correctly excluding a respondent who answered `"not_sure"` on Q4 or Q5 (not just Q3); the combo-analysis criteria selectors rejecting/not offering `"not_sure"` as a target value for Q4/Q5.

No destructive database change is needed — this only widens the set of allowed answer values and changes how the Dynamic Q3-Q5 analysis filters existing/future responses.
