# Sidebar nav should be Dashboard + Survey only, and should persist across both routes

- **Status:** Active
- **Reported:** 2026-09-02 (renamed/expanded from `2026-09-02-sidebar-dashboard-nav-not-hierarchical.md`, which only covered the visual-hierarchy problem within the old 7-item sidebar; this supersedes it with a larger scope)

## Summary

Three related changes to the app's navigation, requested together:

1. The dashboard sidebar's "Measure" list should drop "Adoption," "Value areas," "Time saved," "Output & quality," "Barriers," and "Respondents" — since "Dashboard" already shows everything those sections show, keep only "Dashboard."
2. Add a "Survey" item to that same sidebar; clicking it should navigate to `/survey`.
3. Remove the top bar ("AI Productivity Insights" / "Dashboard" / "Submit Survey" links) — with the sidebar covering both destinations, that bar becomes redundant. The sidebar (now just Dashboard + Survey) should persist across both routes, not disappear when switching between them.

## Details

Confirmed: all three are real, and together they're a real architecture change, not a small tweak — the sidebar currently exists only inside the dashboard page, not as shared app-level navigation.

### 1. Sidebar currently has 7 items; 6 are redundant with "Dashboard"

`frontend/src/components/dashboard/navSections.ts:3-11`:

```ts
export const NAV_SECTIONS: NavSection[] = [
  "Dashboard", "Adoption", "Value areas", "Time saved",
  "Output & quality", "Barriers", "Respondents",
];
```

`frontend/src/pages/DashboardPage.tsx:95-104` confirms "Dashboard" already shows the union of what every other item shows individually:

```ts
const all = navSection === "Dashboard";
...
show = {
  heroes: all || heroIndices.length > 0,
  chart: all || navSection === "Adoption" || navSection === "Respondents",
  q2: all || navSection === "Value areas",
  combo: all || navSection === "Time saved" || navSection === "Output & quality",
  table: all || navSection === "Adoption" || navSection === "Respondents" || navSection === "Barriers",
};
```

Every condition is `all || <narrower condition>` — so removing the six narrower items and keeping only "Dashboard" (always `all`) doesn't lose any chart; it removes the *filtering*, which is exactly what was asked. Once that happens, this entire `HERO_PICK`/`PANEL_PICK`/`show`-branching apparatus (`DashboardPage.tsx:21-39` and the `show` object) becomes dead code — there's only one thing to show, always. This is a significant simplification of `DashboardPage.tsx`, not just a nav-list edit. The `barrierBadge` prop/logic (tied specifically to the now-removed "Barriers" item) becomes dead too.

### 2. "Survey" needs to be a real route link, not another in-page filter

The six items being removed were in-page content filters (`useState<NavSection>` + `onClick`, no URL change) — `DashboardSidebar.tsx:23-38` renders every item as a plain `<button>`. "Survey" is categorically different: it must navigate to a different route (`/survey`), so it needs to be an actual link (e.g. React Router's `NavLink`), not a state-setting button. This also affects "Dashboard," which should presumably become a real `/dashboard` link too once it's a peer of "Survey" rather than a default in-page state — worth deciding explicitly during implementation, since right now nothing establishes what happens if a user is on `/survey` and clicks "Dashboard" (there's no route-navigation wired to it today, only `setNavSection`).

### 3. The sidebar only exists inside `DashboardPage` — it doesn't survive route changes today

`frontend/src/App.tsx:8-13` routes both pages under one shared `<AppLayout>`:

```tsx
<Route element={<AppLayout />}>
  <Route index element={<Navigate to="/survey" replace />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/survey" element={<SurveyPage />} />
</Route>
```

`frontend/src/components/layout/AppLayout.tsx:9-37` is the current shared chrome — just a thin `<header>` with the "AI Productivity Insights" brand and `NavLink`s to "Dashboard" / "Submit Survey", then `<Outlet/>`. The sidebar is **not** here.

`frontend/src/pages/DashboardPage.tsx:117-121` (`.dashboard-shell > .dashboard-frame`, a two-column grid) owns the sidebar itself, rendering `<DashboardSidebar>` as the grid's left column and its own toolbar/content as the right column. `frontend/src/pages/SurveyPage.tsx` has no sidebar at all — it renders its own independent `.survey-shell` full-page wrapper.

Net effect, confirmed by reading both: navigating from `/dashboard` to `/survey` swaps out everything below `AppLayout`'s thin header, including the sidebar — it doesn't persist, exactly as reported. To fix this, the sidebar has to move up to something both routes share (most naturally `AppLayout` itself, replacing its current header), with `DashboardPage`/`SurveyPage` becoming the two possible contents of the remaining panel next to it.

### A real design question this surfaces: dashboard and survey use different visual systems

`frontend/src/pages/DashboardPage.css:1-26` (`.dashboard-shell`) defines its own palette/typography — green accent (`#1f9d7c`), "Plus Jakarta Sans" + "IBM Plex Mono", light-gray background. The survey page uses a completely different system — purple accent, "Public Sans" (`frontend/src/styles/global.css`, `frontend/src/pages/SurveyPage.css`). If the dashboard's sidebar becomes a shared, persistent element wrapping both pages, someone needs to decide whether it keeps the dashboard's visual language everywhere (including around the survey page) or the shared shell adopts a neutral style. Flagging this as a decision for implementation, not resolving it here.

### Doc check

`docs/ADR.md` Decision 1 ("Use One React Application for Both Workflows," lines 99-111) says "The application will use a shared layout and navigation" — this change is consistent with that intent (arguably fixes a gap in it, since today the nav isn't fully shared: the sidebar only exists on one route). No PRD/ADR text mandates the specific top-bar-with-two-links design being removed, or the sidebar's exact item list — same as the earlier, narrower version of this bug, there's no product-doc spec for this internal IA to reconcile against.

### Tests that will need updating

`frontend/e2e/survey-dashboard.spec.ts:27` currently navigates via the top bar: `await page.getByRole("link", { name: "Dashboard" }).click();`. This will break once that link moves into the sidebar — worth noting that if the new sidebar items are implemented as real anchor-based links (per point 2 above) rather than buttons, this same `getByRole("link", ...)` selector should still work once pointed at the sidebar; if they're implemented as `<button>`s instead, this test would need a different selector (`getByRole("button", ...)`). No other test references `NAV_SECTIONS`, `nav-item`, or the top bar's text.

## Files that need to change to fix this

1. **`frontend/src/components/layout/AppLayout.tsx`** — remove the current `<header>` (brand text + Dashboard/Submit Survey `NavLink`s); render the persistent sidebar (Dashboard + Survey) here instead, wrapping `<Outlet/>` as the content pane.
2. **`frontend/src/components/dashboard/DashboardSidebar.tsx`** — becomes (or is replaced by) the shared nav component: two real route links, "Dashboard" (`/dashboard`) and "Survey" (`/survey`), with active-route highlighting instead of the current `navSection`/`onClick` state pattern.
3. **`frontend/src/components/dashboard/navSections.ts`** — the six-section `NavSection` type/list is no longer needed in its current form; replace with just the two top-level destinations, or remove entirely if `AppLayout` drives active-state from the route directly.
4. **`frontend/src/pages/DashboardPage.tsx`** — remove `HERO_PICK`, `PANEL_PICK`, the `navSection` state, and the `show.*`/`all` branching now that there's only one view; remove the `.dashboard-shell > .dashboard-frame` sidebar-owning wrapper (sidebar moves to `AppLayout`), keeping only the toolbar + content as this page's own render output. Remove `barrierBadge` computation/prop-passing (only existed for the removed "Barriers" item).
5. **`frontend/src/pages/DashboardPage.css`** — the two-column `.dashboard-frame` grid and `.dashboard-sidebar`/`.nav-item`/`.nav-dot`/`.nav-badge` rules need to move to wherever `AppLayout`'s styling lives (or a new shared layout stylesheet), since they'll no longer be scoped to just the dashboard page.
6. **`frontend/src/pages/SurveyPage.tsx`** / **`frontend/src/pages/SurveyPage.css`** — `.survey-shell`'s current full-page wrapper assumption needs revisiting so the survey page renders correctly as content next to a persistent sidebar rather than as its own full-viewport page.
7. **`frontend/e2e/survey-dashboard.spec.ts`** — update the "Dashboard" link navigation step (line 27) to match wherever/however the new sidebar renders it.

No backend, database, or docs changes needed — this is entirely a frontend routing/layout restructuring.

**Related:** `bug/2026-09-02-sidebar-q3-2026-survey-card.md` (also filed, not yet fixed) touches the same `DashboardSidebar`/`DashboardPage` prop surface (removing the `coverage` prop) — worth sequencing or implementing together rather than in isolation, since both change the same files.
