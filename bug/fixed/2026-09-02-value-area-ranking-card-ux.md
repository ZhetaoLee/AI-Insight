# "AI value area ranking" card: remove eyebrow text, add help icon, popup instead of bottom hint, rework rank-count display

- **Status:** Fixed
- **Reported:** 2026-09-02

## Summary

Confirmed all four: the card shows a "Q2 · RANKED TOP THREE · N = 3" eyebrow line to remove, has no help icon, shows per-row hover detail as static text at the card's bottom instead of a popup near the hovered row, and formats the rank breakdown as repetitive "rank 1: 0 · rank 2: 1 · rank 3: 0" text that should be redesigned.

## Details

### Current state, confirmed

`frontend/src/components/dashboard/ValueAreaRankingCard.tsx`:

- Line 25 — eyebrow text: `<div className="card-eyebrow">Q2 · ranked top three · n = {ranking.denominator}</div>`. `.card-eyebrow` is `text-transform: uppercase` (`DashboardPage.css:574-581`), which is why it renders as "Q2 · RANKED TOP THREE · N = 3" on screen even though the source string is lowercase.
- No help icon anywhere on this card.
- Line 64 — `<div className="card-hint">{hint}</div>`: a single div fixed at the bottom of the card. `hint` (lines 14-18) is a string that changes based on `hoverIdx` state — hovering any row shows that row's rank split there; hovering "Other" (if it has submitted free text) shows the free-text detail there instead; hovering nothing shows a static instructional sentence. All three cases funnel through this one bottom-anchored div, which means the actual information appears far from what the cursor is pointing at.
- Line 17 — the rank-split format: `` `${hovered.label} · rank 1: ${hovered.rank1} · rank 2: ${hovered.rank2} · rank 3: ${hovered.rank3}` ``, e.g. "Rank 1: 0 · Rank 2: 1 · Rank 3: 0" — repeats the word "rank" three times and gives no visual tie-back to the bar's own color coding (dark/medium/light blue for rank 1/2/3), even though that color coding already exists right above it in the card's legend and in each bar itself.

### Doc check — none of this is a documented requirement

`docs/metrics.md`'s "Q2. AI Value Area Ranking" section only specifies: display as a horizontal stacked bar chart, the three rank counts and total, the three segment colors (dark/medium/light blue — already correctly used in the bars), the sort order, and that "Other" should show its submitted free text on hover. It says nothing about an eyebrow line, a help icon, where hover text should appear, or how the rank counts should be formatted — all four are implementation choices from the original Claude Design source, same situation as the just-filed `bug/2026-09-02-combo-analysis-card-title-and-help-icon.md`. No test references this card's eyebrow text, hint text, or hover behavior either (confirmed via search) — nothing to update there.

### Requested changes, one at a time

**1. Remove the "Q2 · ranked top three · n = X" eyebrow.** Straightforward — delete line 25.

**2. Add a help/info icon.** Same reusable pattern already flagged in the `ComboAnalysisCard` bug: `HeroCards.tsx`'s `.hero-help`/`.hero-tooltip` (small circular "i", keyboard-focusable, dark tooltip bubble on hover/focus — `DashboardPage.css:202-251`). This card is the **second** place that pattern needs extending to, which strengthens the case (in that other bug file) for generalizing those classes once rather than copy-pasting hero-specific CSS a second time — worth implementing both help-icon requests (this card and the combo-analysis card) together, or at least the CSS generalization once, rather than twice independently.

**3. Popup near the hovered row instead of a fixed bottom line.** This needs a different anchor point than the help-icon tooltip above: the icon tooltip anchors to a small fixed-size trigger, but here the trigger is each `.value-area-row`, which varies in vertical position down a list of up to 11 rows. Each row (or the row list) would need `position: relative` with an absolutely-positioned tooltip bubble that appears near whichever row is hovered, similar in spirit to the icon tooltip's opacity/transform transition but anchored per-row instead of to one fixed icon.

One thing worth deciding while implementing: today the bottom slot does triple duty — permanent instructional text when nothing is hovered, the rank-split on hovering a normal row, and the "Other" free-text detail on hovering that specific row. Moving the hover-driven content into a popup raises the question of what (if anything) stays as a permanent caption at the bottom once hover state has its own popup — likely just keep the default instructional sentence as a static caption always, and have the popup handle only the two hover cases.

**4. Rework the rank-count display.** Recommended: replace the "rank 1: X · rank 2: Y · rank 3: Z" text with small color-coded indicators reusing the exact three colors already established by the legend and bar segments (dark blue `#1d3f8f`, medium blue `#4d7fd6`, light blue `#adc7ef`) — e.g. three small colored dots/chips each immediately followed by their count, so the word "rank" isn't repeated three times and the popup visually ties back to the bar and legend the user is already looking at. A simpler fallback, if a purely textual option is preferred, is ordinal labels ("1st: 0 · 2nd: 1 · 3rd: 0") instead of "rank 1/2/3" — still text-only but a little less repetitive. This is ultimately a visual-design call; flagging the color-chip approach as the stronger option given the color coding already exists elsewhere on the same card.

## Notes

**Files that would need to change:**

1. `frontend/src/components/dashboard/ValueAreaRankingCard.tsx` — remove the eyebrow div; add a help icon with an explanatory tooltip next to "AI value area ranking"; replace the bottom-fixed `card-hint` hover mechanism with a per-row popup; rework the rank-count formatting (color-coded chips recommended, reusing the existing rank-color constants already defined in this file for the bar segments).
2. `frontend/src/pages/DashboardPage.css` — new styles for a per-row popup (position/anchor/transition, distinct from but similar to `.hero-help`/`.hero-tooltip`); if the help-icon CSS is generalized per the cross-reference above, this card consumes those generalized classes instead of new hero-specific ones.

**Related:** `bug/2026-09-02-combo-analysis-card-title-and-help-icon.md` — also needs a help icon added via the same `HeroCards` pattern; worth generalizing that pattern's CSS once and reusing it here rather than solving the same "need a reusable info-icon component" problem twice.

No backend, database, docs, or test changes needed — this is entirely a frontend presentation change to one card, and nothing in `docs/metrics.md`'s Q2 spec is affected (the underlying rank1/rank2/rank3/total data and its three-color convention stay exactly as documented).

## Fix

- Removed the Q2 eyebrow from the value-area ranking card.
- Added the shared dashboard info tooltip next to the card title.
- Replaced the bottom hover hint with row-anchored tooltip popups.
- Reworked the rank split into compact color-coded count chips that match the stacked bar legend.
- Kept `Other` submitted free-text details available inside the hovered/focused row popup.

## Local Verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && uv run --extra dev pytest`
- `cd frontend && npm run test:e2e`
