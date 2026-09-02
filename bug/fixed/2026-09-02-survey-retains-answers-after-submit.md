# Survey form retains previous answers after a successful submit

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

After a survey response is submitted, the form clears the employee selection but keeps all previous answer selections visible and editable, allowing the next employee to accidentally submit the prior employee's answers.

## Details

`frontend/src/pages/SurveyPage.tsx` handles a successful submit by adding the employee to `submittedEmployeeIds`, clearing `employeeId`, and showing the confirmation banner:

```tsx
setSubmittedEmployeeIds((prev) => new Set(prev).add(submittedEmployeeId));
setEmployeeId(null);
setSubmitted(true);
```

The other answer state values are not cleared there:

- `aiUsageFrequency`
- `topValueAreaCodes`
- `weeklyTimeSaved`
- `workOutputChange`
- `qualityChange`
- `correctionFrequency`
- `biggestBenefit`
- `barrierCodes`
- all `Other` text fields

The "Start another" button does reset the full form, but the form remains visible and enabled before that button is clicked. A user can select a different employee and press "Submit response" again, reusing the previous answer set.

Expected behavior: after a successful submit, either the completed form should be disabled/hidden until "Start another" is clicked, or the full answer state should be reset immediately so another employee cannot inherit prior answers.

## Notes

Likely files to inspect when fixing:

- `frontend/src/pages/SurveyPage.tsx`
- `frontend/tests/frontend.test.mjs`
- `frontend/e2e/survey-dashboard.spec.ts`

No backend or database change appears necessary because backend duplicate protection works; this is a frontend state/workflow issue.

## Fix

- Added shared survey-page answer clearing so successful submission resets Q1-Q8
  selections and all `Other` text fields immediately.
- Kept the confirmation banner visible after submit while leaving the form ready
  for a different employee without inherited answers.
- Reused the same answer clearing behavior for the existing "Start another"
  reset path.
- Updated product and implementation docs to make answer-state clearing part of
  the survey workflow contract.
- Extended the Playwright survey smoke test to verify the previously selected
  answers are no longer pressed immediately after a successful submit.

## Local Verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`
