# Employees who select "Never" for Q1 are still forced to answer Q2-Q7, which pollutes several metrics

- **Status:** Active
- **Reported:** 2026-09-02

## Summary

Confirmed: today, selecting "Never" for Q1 (AI usage frequency) has no effect on the rest of the survey — every other question (Q2-Q7) is still required by both the frontend validation and the backend API, and the UI always renders all 8 questions regardless of the Q1 answer. Requested behavior: an employee who answers "Never" should only need to answer Q1 and Q8 (barriers to use); Q2-Q7 should be skipped, with the UI updated to reflect that. This is not purely a UI change — implementing it requires the backend schema and several metric calculations to change as well, and a few of those calculations would currently either crash or silently misreport if fed a null answer without corresponding changes, detailed below.

## Details

### Confirmed: no skip logic exists today, anywhere

- `frontend/src/lib/surveyForm.ts:54-68` (`validateSurveyForm`) unconditionally requires `top_value_areas`, `weekly_time_saved`, `work_output_change`, `quality_change`, `correction_frequency`, and `biggest_benefit` regardless of `aiUsageFrequency`'s value.
- `frontend/src/pages/SurveyPage.tsx:235-370` always renders all three question groups ("Usage and value" [Q2-Q3], "Impact on your work" [Q4-Q6], "Benefits and barriers" [Q7-Q8]) unconditionally — nothing branches on `aiUsageFrequency === "never"`. This is the concrete UI gap behind the "please update the UI" part of the report.
- `backend/app/models/survey_response.py:90-100` (`SurveyAnswers`) declares `top_value_areas`, `weekly_time_saved`, `work_output_change`, `quality_change`, `correction_frequency`, and `biggest_benefit` as required (non-`Optional`) Pydantic fields. Even if the frontend were changed alone, the backend would reject a submission that omits them with a `422`.

### What "Never" skipping Q2-Q7 but still answering Q8 means, and why Q8 fits

Q8 ("What barriers limit your effective use of AI at work?", `docs/Questions.md` line 112) is phrased generically enough to already make sense for a non-user — it's naturally read as "what stops you from using AI at all," not only "what stops you from using AI *more*." So keeping Q8 required for "Never" respondents is consistent with its existing framing; no wording change to Q8 itself appears necessary.

### Backend aggregation: concrete crash risks if Q2-Q7 become nullable without matching aggregator changes

`backend/app/services/metrics.py`'s `MetricsAggregator.aggregate()` and its helpers access every Q2-Q7 answer as a guaranteed-present value, with no null handling anywhere. If the `SurveyAnswers` model is loosened to make these fields `Optional` (necessary for the frontend/backend schema change), the following would break as soon as one "Never" response with null answers exists in the database:

1. **`_option_distribution` (metrics.py:187-197)** — used for `weekly_time_saved`, `work_output`, `work_quality`, `ai_rework_frequency`. `counts[answer_code(response)] += 1` (line 195) indexes a dict keyed only by known option codes; `None` is not a key, so this raises `KeyError`.
2. **`_selection_distribution` for Q7 benefits (metrics.py:169)** — `response.answers.biggest_benefit.option` dereferences `.option` on `biggest_benefit`, which would itself be `None`, raising `AttributeError`.
3. **`_value_area_ranking` for Q2 (metrics.py:225-228)** — `for area in response.answers.top_value_areas` iterates the field directly; iterating `None` raises `TypeError`.

None of this is theoretical — these are direct attribute/dict accesses in the current implementation, unconditional on any null check.

### Backend aggregation: silent (non-crashing) correctness risks

Two calculations wouldn't crash but would produce misleading numbers once "Never" respondents have null Q2-Q7 answers, because their denominator is `len(respondents)` (all respondents in scope) rather than a per-question "answered" count:

1. **`reports_more_output` / `more_output_rate`** (metrics.py:120,136; also per-group at the group-breakdown level) — computed as `work_output_change in MORE_OUTPUT_CODES`, which safely evaluates to `False` for `None`, but the denominator stays every respondent in scope, including "Never" users who can never contribute to the numerator. This silently dilutes the rate rather than excluding them, as `docs/metrics.md`'s own `reports_more_output_rate = reports_more_output / respondents_who_answered_Q4` formula calls for.
2. **`frequent_rework_rate`** (metrics.py:283 and group-breakdown equivalent) — same issue via `correction_frequency in FREQUENT_REWORK_CODES`.
3. **Dynamic Q3-Q5 analysis (`_q3_q5_analysis`, metrics.py:249-260)** — `weekly_time_saved != "not_sure"` (line 254) is used to build the "valid" population for the combo analysis; `None != "not_sure"` evaluates `True`, so a "Never" respondent with no real Q3/Q4/Q5 answers would be incorrectly counted in `analysis_denominator`, even though they'd never match any Q3/Q4/Q5 criteria combination.

### An existing, unenforced denominator concept already anticipates this

`docs/metrics.md` already defines every Q2-Q7 rate/distribution using a `respondents_who_answered_QN` denominator (e.g. `option_percentage = option_count / respondents_who_answered_Q3`), distinct from the blanket `respondents` count used elsewhere. Today this distinction is moot because every respondent answers every question by construction, so `respondents_who_answered_QN` always equals `len(respondents)` — which is exactly why the current implementation (correctly, for today's constraints) just uses `len(respondents)` everywhere rather than actually computing a per-question answered count. Implementing this report is the first scenario where that distinction becomes real, and the aggregator would need to be rewritten to actually compute it (filter to non-null answers, both for the numerator population and the denominator) rather than reusing `len(respondents)`.

### An open product question this report doesn't resolve

Should a "Never" respondent's Q3-Q6 metrics be (a) excluded entirely from those distributions/denominators (what a literal "skip these questions" implementation would produce), or (b) implicitly counted as the "no impact" answer (e.g. `no_noticeable_time_saved` for Q3, `same` for Q4, `no_meaningful_change` for Q5, `never` for Q6) since a non-user trivially has no time saved, output change, quality change, or rework? Option (a) is simpler and matches "skip the questions" literally, but silently shrinks these charts' population to exclude non-adopters entirely, which is itself a leadership-relevant signal (e.g. "40% of the org never uses AI and therefore reports zero productivity impact" vs. "these charts only describe the AI-using subset of the org"). This is a real product decision to make explicitly before implementing, not something this report decides.

## Notes

**Files that need to change:**

1. `frontend/src/lib/surveyForm.ts` — make `validateSurveyForm` conditionally skip requiring `top_value_areas`, `weekly_time_saved`, `work_output_change`, `quality_change`, `correction_frequency`, and `biggest_benefit` (plus their `other_text` companions) when `aiUsageFrequency === "never"`; `buildSurveyResponseSubmission` needs to omit those fields (or submit them as `null`) in that case.
2. `frontend/src/pages/SurveyPage.tsx` — conditionally hide/skip the Q2-Q7 question groups when `aiUsageFrequency === "never"` is selected, jumping to Q8; update the static `"8 questions"` meta label to reflect the shorter path when applicable.
3. `frontend/src/types/survey.ts` — update `SurveyResponseSubmission`'s answer shape so Q2-Q7 fields are typed as nullable/optional, matching the new backend contract.
4. `backend/app/models/survey_response.py` — make `top_value_areas`, `weekly_time_saved`, `work_output_change`, `quality_change`, `correction_frequency`, and `biggest_benefit` `Optional`, with a model validator enforcing they're required when `ai_usage_frequency != "never"` and must be absent/null when it is `"never"` (so a submission can't mix a "Never" answer with fabricated Q2-Q7 data, nor omit them for an active user).
5. `backend/app/services/metrics.py` — rewrite `_option_distribution`, `_selection_distribution`, `_value_area_ranking`, the `reports_more_output`/`frequent_rework` computations (headline and per-group), and `_q3_q5_analysis` to filter out `None` answers before counting and to use the count of non-null answers as each question's denominator, per the resolution of the open product question above.
6. `docs/PRD.md` §7 (Survey Submission Experience) and §8 (Survey Questions) — document the conditional flow: Q2-Q7 skipped when Q1 is "Never," only Q1 and Q8 required in that case.
7. `docs/metrics.md` — clarify, for each Q2-Q7 metric, how a "Never" respondent's absent answer is handled (excluded vs. implicitly zero-valued, per the open product question above), since the existing `respondents_who_answered_QN` phrasing needs to now be read literally rather than as a currently-always-equal simplification.
8. `backend/tests/` — new coverage for: submitting with `ai_usage_frequency = "never"` and Q2-Q7 omitted (should succeed); submitting `"never"` with Q2-Q7 present (should be rejected, or clarify if silently ignored); submitting a non-`"never"` frequency with Q2-Q7 omitted (should still be rejected); metrics aggregation with a mix of "Never" and active respondents in scope, asserting denominators/rates match the resolved product decision.
9. `frontend/tests/frontend.test.mjs` and `frontend/e2e/survey-dashboard.spec.ts` — coverage for the conditional UI (Q2-Q7 hidden/not required when "Never" is selected) and for a full "Never" respondent submit-to-dashboard flow.

No destructive database change is needed — `survey_responses` isn't pre-seeded with any data (seeding only covers `employees`), so there's no existing "Never" response to migrate.
