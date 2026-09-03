# Survey page: reword Q3, remove filler copy, enlarge the title, and add a submit confirmation popup

- **Status:** Fixed
- **Reported:** 2026-09-02
- **Fixed:** 2026-09-02

## Summary

Four related, confirmed items on the survey page (`/survey`):

1. Q3's question text should change to "Compared with working without AI, approximately how much work time does AI save you in a typical week?"
2. Four specific copy strings should be removed: the page subtitle and the three question-group subtitles.
3. The page title ("AI productivity survey") renders at a font size noticeably smaller than the equivalent title on the dashboard page — and two more font-size inconsistencies exist beyond just the title, detailed below.
4. Clicking "Submit response" should show a confirmation popup ("are you ready to submit? your answer cannot be changed after you submit your survey") with Cancel/Submit buttons, rather than submitting immediately — no such popup exists today. This is a standard, well-defined UI pattern (an irreversible-action confirmation dialog), not an open-ended requirement — the accessible-dialog best practices it should follow are detailed below.

## Details

### 1. Q3 wording — confirmed current text differs from the request, and from both canonical docs

`frontend/src/pages/SurveyPage.tsx:272`:

```tsx
legend="Q3. In a typical week, approximately how much work time does AI save you?"
```

The requested replacement — *"Compared with working without AI, approximately how much work time does AI save you in a typical week?"* — reorders and adds the "Compared with working without AI" framing (matching how Q4 and Q5 are already phrased: both start with "Compared with working without AI, how has AI affected...").

This isn't just a frontend string change: `docs/PRD.md:261` documents Q3 as `"In a typical week, approximately how much work time does AI save you?"` (matching the current frontend text), and `docs/Questions.md:57` documents it slightly differently again — `"In a typical week, approximately how much work does AI save you?"` (missing the word "time," an existing minor inconsistency between the two docs that predates this report). Per `CLAUDE.md`, `docs/Questions.md` is the canonical source for survey question text and must stay in sync with `docs/PRD.md` §8 and the frontend — so implementing this rewording correctly means updating the frontend **and** both docs to the same new wording, not just the frontend.

### 2. Four copy strings to remove — confirmed exact text and location, no doc/test dependency

- `frontend/src/pages/SurveyPage.tsx:200`: `"Responses are reported in aggregate and used to prioritise AI tooling, training, and investment."` — the page subtitle, rendered alongside the `*required fields` marker (that marker isn't part of the removal request and should stay).
- `frontend/src/pages/SurveyPage.tsx:237`: `"How often you use AI, where it helps most, and time saved."` — subtitle under the "Usage and value" group heading (Q1-Q3).
- `frontend/src/pages/SurveyPage.tsx:285`: `"Output, quality, and how much correction AI output needs."` — subtitle under "Impact on your work" (Q4-Q6).
- `frontend/src/pages/SurveyPage.tsx:324`: `"The single biggest benefit, and what limits effective use."` — subtitle under "Benefits and barriers" (Q7-Q8).

Searched `docs/`, `frontend/tests/`, and `frontend/e2e/` for all four strings — no matches anywhere. Removing them won't break any doc reference or test assertion; the group headings themselves ("Usage and value," "Impact on your work," "Benefits and barriers") aren't part of the removal request and aren't mentioned as needing to change.

### 3. Title font size — confirmed smaller than the dashboard's equivalent heading

`frontend/src/pages/SurveyPage.css:28-34`:

```css
.survey-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--color-heading);
}
```

For comparison, the dashboard's equivalent top-of-page heading ("Executive overview") is defined in `frontend/src/pages/DashboardPage.css:90-94` at **24px**:

```css
.content-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
}
```

So the survey page's own main heading (19px) is noticeably smaller than the dashboard's equivalent (24px) — a real, measurable size mismatch between the two main pages of the app, confirming the report rather than it being purely subjective. What the "proper" size should be isn't specified by the report; matching the dashboard's 24px is one reasonable target, but this is a judgment call for whoever implements it.

**Broader pass, per the request to bring other sizes in line with best practice too** — compared every `font-size` declaration in `frontend/src/pages/SurveyPage.css` against `frontend/src/pages/DashboardPage.css` and against each other. Two more concrete findings, beyond the title itself:

- **Section-title mismatch, smaller but same pattern as the page title.** `.group-title` (`SurveyPage.css:94-96`, e.g. "Usage and value") is **16px**; the dashboard's equivalent section heading, `.card-title` (`DashboardPage.css:290-291`, e.g. "Productivity payoff analysis"), is **17px**. A smaller gap than the page-title mismatch, but the same category of inconsistency — the two pages don't share a heading scale at either level (page title or section title).
- **An inconsistency inside the survey page itself, not just against the dashboard.** Every answer-option style on the survey page uses **14px** for the option label text — `.radio-option` (line 150), `.checkbox-option` (line 200), `.rank-option` (line 287) — except `.radio-option-likert` (line 189), used by Q4, Q5, and Q6's answer choices, which is **12.5px**. There's no stated reason for Q4-Q6's answer text to render smaller than Q1's, Q2's, and Q8's; this looks like an unintentional side effect of squeezing six columns into the likert grid (see the separately-fixed `bug/fixed/2026-09-03-q4-q6-likert-options-wrap-to-second-row.md`) rather than a deliberate type-scale choice.

The rest of the survey page's sizes (13px for field labels/subtitles/captions, 12px for hints/meta text) are already internally consistent with each other and don't call for changes. The general best practice this points toward: a small, deliberate type scale (e.g. page title → section title → body/option text → caption/meta text, each a distinct, consistently-reused size) applied uniformly for elements serving the same role, rather than one-off values per component. Given the dashboard and survey page serve different purposes (a dense data view vs. a long-form questionnaire), full pixel-for-pixel parity between every element isn't necessarily the goal — but the two headings and the likert/non-likert option-text mismatch above are concrete cases where nothing distinguishes the elements' *purpose*, only their *implementation*, which is the strongest signal of an unintentional inconsistency rather than a deliberate design choice.

### 4. Submit confirmation popup — confirmed none exists; this is a new UI pattern for the codebase

`frontend/src/pages/SurveyPage.tsx:159-185` (`handleSubmit`) validates the form and, if valid, calls `submitSurveyResponse(...)` directly — there is no confirmation step of any kind between clicking "Submit response" and the request actually being sent.

Worth being precise about what already exists nearby, since it's easy to conflate: `SurveyPage.tsx` already has a `.confirmation-banner`/`.confirmation-title` ("Your response is recorded") — but that's the **post-submission success banner**, shown after the response has already been saved, not a pre-submission confirmation gate. It doesn't satisfy this request.

Searched the whole frontend for any existing modal/dialog component or usage of `window.confirm` — none exists anywhere in this codebase. Adding this popup is a genuinely new UI pattern, not a matter of reusing an existing component.

**This is a real, standard UI pattern with an established best-practice shape, not just "some modal, details TBD"** — this is specifically an *irreversible-action confirmation*, which has a well-known accessible-dialog pattern (WAI-ARIA's "alert dialog") that whoever implements this should follow rather than inventing from scratch or reaching for `window.confirm()` (which has no styling control and reads as unpolished for a product UI):

- **Custom component, not `window.confirm()`.** A native browser confirm dialog can't match the app's visual style, can't be styled at all, and blocks the whole tab — a custom component (e.g. `frontend/src/components/survey/SubmitConfirmDialog.tsx`) is the right call here, consistent with everything else in this app being custom-styled.
- **`role="alertdialog"` (not the more generic `role="dialog"`), `aria-modal="true"`, and `aria-labelledby`/`aria-describedby`** pointing at the dialog's heading and body text — `alertdialog` is specifically the ARIA pattern for a modal that interrupts the user to demand an immediate decision about a consequential action, which matches "your answer cannot be changed after you submit" exactly.
- **Focus management:** move focus into the dialog when it opens — conventionally onto the safer of the two actions (Cancel), so an accidental Enter keypress doesn't submit — and return focus to the "Submit response" button that triggered it once the dialog closes, however it closes.
- **Keyboard support:** Escape should act as Cancel; Tab/Shift+Tab should stay trapped within the dialog's two buttons while it's open, so keyboard users can't tab into the page behind it.
- **Backdrop behavior is a deliberate choice, not an oversight either way:** many dialogs treat a click on the backdrop as Cancel, but for a genuinely irreversible action some products deliberately disable that, forcing an explicit button click. This report doesn't mandate one or the other — just flags it as something to decide on purpose.
- **Button labeling and order:** use the exact "Cancel" / "Submit" labels from the report (not generic "OK"/"Yes"), and keep Cancel as the visually lower-emphasis or leftmost action, consistent with typical confirmation-dialog convention of not making the consequential action the path of least resistance.

None of this needs new dependencies — it's achievable with plain React state, a fixed-position overlay, and the ARIA attributes above; no modal library is implied as necessary.

### This changes the submit flow tested by the existing Playwright e2e test

`frontend/e2e/survey-dashboard.spec.ts:69` currently does:

```ts
await page.getByRole("button", { name: "Submit response" }).click();
```

...and immediately expects the response to be recorded on the next line. Once a confirmation popup exists, this single click would only open the popup, not submit — the test would need an additional step to click the popup's own "Submit" button before the existing assertions (`"Your response is recorded"`, submitted-employee-id removal, etc.) would hold.

## Notes

**Files that need to change:**

1. `frontend/src/pages/SurveyPage.tsx` — Q3's `legend` text (line 272); remove the four subtitle strings (lines 200, 237, 285, 324); render the new confirmation dialog component and gate the actual `submitSurveyResponse(...)` call in `handleSubmit` behind it (Cancel returns to the form unchanged, Submit proceeds with the existing submit logic); manage focus-return to the "Submit response" button on close.
2. `frontend/src/pages/SurveyPage.css` — increase `.survey-title`'s `font-size` (currently 19px; 24px would match the dashboard's equivalent heading); bring `.group-title` (currently 16px) in line with the dashboard's `.card-title` (17px); fix `.radio-option-likert`'s answer-text size (currently 12.5px) to match the other option styles (14px) used by `.radio-option`/`.checkbox-option`/`.rank-option`.
3. A new component for the confirmation dialog (e.g. `frontend/src/components/survey/SubmitConfirmDialog.tsx`) implementing the `alertdialog` pattern described above (ARIA roles/attributes, focus management, Escape-to-cancel, focus trap), plus accompanying CSS for the overlay/dialog box.
4. `docs/PRD.md` §8 — update Q3's documented question text to match the new wording.
5. `docs/Questions.md` — update Q3's documented question text to match (also fixes the pre-existing, incidental "how much work does AI save you" vs. "how much work time does AI save you" inconsistency between this file and `docs/PRD.md`, noticed during this investigation).
6. `frontend/e2e/survey-dashboard.spec.ts:69` — add a step to click the confirmation popup's "Submit" button after clicking "Submit response," before the existing post-submit assertions.
7. `frontend/tests/frontend.test.mjs` — no existing test currently locks in any of this page's removed copy or the old Q3 wording, but consider adding coverage for the new confirmation dialog's behavior (opens on submit click, Cancel dismisses without submitting, Submit proceeds, correct `role`/`aria-*` attributes present) and for the corrected font sizes.

No backend or database changes are needed — this is entirely frontend presentation and a client-side confirmation step; the actual submitted answer data and API contract are unaffected.

## Fix

- Q3's `legend` reworded to the requested text in `SurveyPage.tsx`, and mirrored in `docs/PRD.md` §8 and `docs/Questions.md` (which also fixes the pre-existing inconsistency between the two docs noted during investigation).
- Removed the page subtitle and the three question-group subtitles; kept the `*required fields` marker and the "Employee context" group's own subtitle ("Select your name to load your level."), neither of which were part of the request.
- Font sizes: `.survey-title` 19px → 24px (matches the dashboard's `.content-title`); `.group-title` 16px → 17px (matches the dashboard's `.card-title`); `.radio-option-likert` 12.5px → 14px (matches every other answer-option style on the page).
- New `frontend/src/components/survey/SubmitConfirmDialog.tsx`, implementing the `alertdialog` pattern specified in the report: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby` pointing at the title/body text, focus moves to the Cancel button on open, Escape acts as Cancel, Tab/Shift+Tab is trapped between the two buttons. Backdrop click does **not** dismiss the dialog (a deliberate choice per the report's own flagged option, since this is a genuinely irreversible action — clicking the backdrop does nothing, forcing an explicit Cancel or Submit).
- `SurveyPage.tsx`: clicking "Submit response" now validates the form (unchanged) and, if valid, opens the dialog instead of submitting immediately; the dialog's Submit button runs the real submission logic (unchanged otherwise); its Cancel button closes the dialog and returns focus to the "Submit response" button via a ref.
- `frontend/e2e/survey-dashboard.spec.ts` — extended the submit flow: clicks "Submit response," asserts the dialog's role/content, clicks Cancel and verifies the dialog closes with nothing submitted and focus returns to the submit button, then re-opens it and clicks its Submit button before the existing post-submission assertions.
- `frontend/tests/frontend.test.mjs` — four new tests: Q3 wording in sync across the frontend and both docs, the four subtitles are gone (with the two survivors confirmed present), the three corrected font sizes, and the dialog's ARIA markup/wiring.
- `CLAUDE.md` principle 8 and `AGENTS.md`'s test-coverage summary updated to mention the new confirmation step and its test coverage.
- No backend or database changes were needed, matching the original analysis.

## Local Verification

- `cd frontend && npm run lint` — passes.
- `cd frontend && npm test` — 43 tests pass, including the four new tests above.
- `cd frontend && npm run build` — production build succeeds.
- `cd backend && uv run --extra dev pytest` — 99 passed (unaffected, frontend-only change).
- `cd frontend && npm run test:e2e` — Playwright smoke test passes, including the full Cancel-then-confirm dialog flow exercised live in a real browser (dialog visibility, ARIA role, Cancel closing it without submitting, focus returning to the trigger button, then a full confirm-and-submit).
- Local Docker Compose stack confirmed healthy afterward; database confirmed clean (0 survey responses, seeded employees intact) — no cleanup was needed since no new data was introduced by this verification.
