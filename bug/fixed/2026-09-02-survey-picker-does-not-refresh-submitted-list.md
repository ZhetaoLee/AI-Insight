# Survey picker can still show already-submitted employees — refresh-on-focus exists but doesn't fully close the gap

- **Status:** Fixed
- **Reported:** 2026-09-02 (re-reviewed 2026-09-02: a partial fix has since landed — refetch on focus/reset — but a concrete gap remains)
- **Fixed:** 2026-09-02

## Summary

Confirmed again: a person who has already submitted a response can still appear in the "Your name" dropdown. Since this bug was first filed, a fix has landed — `SurveyPage.tsx` now refetches the submitted-employee list on `<select>` focus and on form reset, which is a real improvement over the original "fetch once on mount, never again" behavior. But it doesn't fully close the gap: the refresh is async, while the browser opens the native `<select>`'s option list synchronously on that same click — so the very first time someone opens the dropdown, they can still see the stale list for a moment (or, depending on the browser, until they close and reopen it), which matches what's being reported.

## Details

### What's implemented now, confirmed by reading the current code

`frontend/src/pages/SurveyPage.tsx`:

```tsx
async function refreshSubmittedEmployeeIds() {
  try {
    const submittedIds = await fetchSubmittedEmployeeIds();
    setSubmittedEmployeeIds(new Set(submittedIds));
    setEmployeeLoadError(null);
  } catch (error) {
    setEmployeeLoadError(error instanceof Error ? error.message : "Unable to refresh submitted employees.");
  }
}
```

Called in two places: inside `resetForm()` (line 109, `void refreshSubmittedEmployeeIds();`) and wired to the picker itself (line 196, `onFocus={refreshSubmittedEmployeeIds}`). `frontend/src/components/survey/EmployeePicker.tsx` was updated to accept and forward an `onFocus` prop for exactly this. This is precisely the fix direction the earlier version of this bug recommended, and it's correctly wired — confirmed via the running stack that the served frontend has this code (not a stale build) and that the API it calls (`GET /api/survey-responses/submitted-employee-ids`) returns fresh, uncached data with no `Cache-Control`/`ETag` headers that could cause the browser to serve a stale cached response.

### The remaining gap: async fetch vs. a synchronous native dropdown

`onFocus` fires when the `<select>` gains focus — in most browsers, that's the same moment the user clicks it to open the dropdown, and the browser renders that native dropdown's option list **synchronously, immediately**, using whatever `<option>` elements exist in the DOM *right then*. `refreshSubmittedEmployeeIds()` is asynchronous (it awaits a network call) — it cannot possibly finish before the browser has already drawn the currently-open dropdown. So on the *first* open after a stale mount, the visible list can still include someone who's already submitted; the underlying React state does update once the fetch resolves, but many browsers don't live-redraw an already-open native `<select>` popup — the corrected list may only become visible on the *next* open (close and reopen), not the one where the fetch was triggered. This is a real, verifiable timing/browser-behavior gap, not a wiring mistake — the code is calling the right thing at the right trigger, it's just racing something that can't be beaten by triggering *later* (on focus); it needs a head start instead.

### What a more complete fix looks like

Since the core problem is "the refresh needs to have already happened by the time the dropdown opens," triggering on the same event that opens it isn't enough by itself. Two approaches worth combining, not deciding between here:

- **Poll periodically** while the survey page is open (e.g. every 15-30 seconds) so the data is very likely already fresh by the time anyone clicks the dropdown, regardless of when they do it.
- **Refresh on window/tab focus** (`document.visibilitychange` or `window.addEventListener("focus", ...)`), not just the specific `<select>` element's focus — catches "left the tab, came back" without requiring the user to click the field first.

The existing `onFocus`/`resetForm` triggers are still worth keeping as a cheap best-effort top-up; they just aren't sufficient alone.

### Doc and test check

`docs/PRD.md`/`docs/ADR.md` document that the picker should hide already-submitted employees (confirmed in the earlier review of this bug) but say nothing about refresh timing — this is purely an implementation completeness gap, not a spec conflict. No test covers the refresh-on-focus behavior or the race condition described here (confirmed via search) — worth adding coverage for whichever refresh mechanism is chosen, not just the existing "does the feature exist" checks.

## Notes

**Files that would need to change:**

1. `frontend/src/pages/SurveyPage.tsx` — add a polling interval and/or a `window`/`document.visibilitychange` listener that calls the existing `refreshSubmittedEmployeeIds()`, in addition to (not instead of) the current `onFocus`/`resetForm` triggers.
2. `frontend/src/components/survey/EmployeePicker.tsx` — no change likely needed; its `onFocus` passthrough stays useful as a supplementary trigger.
3. New tests — none exist for refresh timing; would need coverage for whichever additional trigger(s) are added (e.g. a fake timer test for polling, or a mocked visibility-change event).

No backend changes needed — confirmed again that `GET /api/survey-responses/submitted-employee-ids` returns correct, uncached data on every call; this is entirely about how often/when the frontend asks for it.

## Fix

- Removed the exception that kept the currently selected employee in `availableEmployees`; already-submitted employees are no longer rendered as picker options.
- Cleared the selected employee immediately after a successful submission, so the submitter's name disappears from the dropdown in the same tab.
- Added periodic submitted-list refresh while the survey page is open.
- Added submitted-list refresh when the window regains focus and when the document becomes visible again.
- Kept the existing picker-focus and "Start another" refreshes as supplementary triggers.
- Kept the clearer `409 Conflict` frontend error: "This employee has already submitted a response for this cycle."
- Added frontend regression coverage for proactive refresh wiring and immediate submitter removal.
- Extended the Playwright smoke test to verify that the submitter is removed from the dropdown immediately after submitting.

## Local Verification

- `cd backend && uv run --extra dev pytest`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`
