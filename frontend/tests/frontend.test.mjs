import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildSurveyResponseSubmission,
  hasSurveyErrors,
  toggleBarrierSelection,
  validateSurveyForm,
} from "../src/lib/surveyForm.ts";
import { SEED_EMPLOYEES, fetchEmployees } from "../src/api/employees.ts";
import { fetchDashboardMetrics, fetchOrgDirectory } from "../src/api/metrics.ts";
import { fetchSubmittedEmployeeIds, submitSurveyResponse } from "../src/api/survey.ts";
import { ANALYSIS_WEEKLY_TIME_SAVED } from "../src/components/dashboard/ComboAnalysisCard.tsx";
import { topActualBarrierRow } from "../src/components/dashboard/DistributionPanels.tsx";
import { topBarrierLabel } from "../src/components/dashboard/RecordsTable.tsx";
import { buildChildrenMap, resolveDashboardManagerId, subtreeOf } from "../src/lib/dashboardScope.ts";

const validSurveyState = (overrides = {}) => ({
  employeeId: "emp_104",
  aiUsageFrequency: "daily",
  topValueAreaCodes: ["implementation", "research", "testing"],
  topValueAreaOtherText: "",
  weeklyTimeSaved: "more_than_5_hours",
  workOutputChange: "slightly_more",
  qualityChange: "slightly_better",
  correctionFrequency: "sometimes",
  biggestBenefit: "saves_time",
  biggestBenefitOtherText: "",
  barrierCodes: ["lack_of_training"],
  barriersOtherText: "",
  ...overrides,
});

const dashboardEmployees = [
  { id: "emp_101", name: "Priya Nair", level: "senior_director", manager_id: null },
  { id: "emp_102", name: "Sarah Lee", level: "director", manager_id: "emp_101" },
  { id: "emp_104", name: "Alice Chen", level: "ic", manager_id: "emp_102" },
];

test("survey validation requires every required field", () => {
  const errors = validateSurveyForm(
    validSurveyState({
      employeeId: null,
      aiUsageFrequency: null,
      topValueAreaCodes: [],
      weeklyTimeSaved: null,
      workOutputChange: null,
      qualityChange: null,
      correctionFrequency: null,
      biggestBenefit: null,
      barrierCodes: [],
    })
  );

  assert.equal(hasSurveyErrors(errors), true);
  assert.equal(errors.employee, true);
  assert.equal(errors.ai_usage_frequency, true);
  assert.equal(errors.top_value_areas, true);
  assert.equal(errors.weekly_time_saved, true);
  assert.equal(errors.work_output_change, true);
  assert.equal(errors.quality_change, true);
  assert.equal(errors.correction_frequency, true);
  assert.equal(errors.biggest_benefit, true);
  assert.equal(errors.barriers, true);
});

test("survey validation requires exactly three ranked Q2 areas and builds ranks from selection order", () => {
  assert.equal(validateSurveyForm(validSurveyState({ topValueAreaCodes: ["implementation", "research"] })).top_value_areas, true);
  assert.equal(validateSurveyForm(validSurveyState({ topValueAreaCodes: ["implementation", "implementation", "research"] })).top_value_areas, true);

  const submission = buildSurveyResponseSubmission(
    validSurveyState({ topValueAreaCodes: ["testing", "implementation", "research"] })
  );

  assert.deepEqual(submission.answers.top_value_areas, [
    { area: "testing", rank: 1, other_text: null },
    { area: "implementation", rank: 2, other_text: null },
    { area: "research", rank: 3, other_text: null },
  ]);
});

test("survey validation requires Other text for Q2 Q7 and Q8", () => {
  const errors = validateSurveyForm(
    validSurveyState({
      topValueAreaCodes: ["implementation", "research", "other"],
      topValueAreaOtherText: " ",
      biggestBenefit: "other",
      biggestBenefitOtherText: "",
      barrierCodes: ["other"],
      barriersOtherText: " ",
    })
  );

  assert.equal(errors.top_value_area_other, true);
  assert.equal(errors.biggest_benefit_other, true);
  assert.equal(errors.barriers_other, true);

  const submission = buildSurveyResponseSubmission(
    validSurveyState({
      topValueAreaCodes: ["implementation", "research", "other"],
      topValueAreaOtherText: "Release notes",
      biggestBenefit: "other",
      biggestBenefitOtherText: "Faster analysis",
      barrierCodes: ["other"],
      barriersOtherText: "Procurement",
    })
  );

  assert.deepEqual(submission.answers.top_value_areas[2], {
    area: "other",
    rank: 3,
    other_text: "Release notes",
  });
  assert.deepEqual(submission.answers.biggest_benefit, {
    option: "other",
    other_text: "Faster analysis",
  });
  assert.deepEqual(submission.answers.barriers, [{ option: "other", other_text: "Procurement" }]);
});

test("Q8 no_major_barriers is mutually exclusive in toggle behavior and validation", () => {
  assert.deepEqual(toggleBarrierSelection(["lack_of_training"], "no_major_barriers"), ["no_major_barriers"]);
  assert.deepEqual(toggleBarrierSelection(["no_major_barriers"], "tool_access"), ["tool_access"]);
  assert.deepEqual(toggleBarrierSelection(["tool_access"], "tool_access"), []);

  const errors = validateSurveyForm(
    validSurveyState({ barrierCodes: ["no_major_barriers", "lack_of_training"] })
  );
  assert.equal(errors.barriers, true);
  assert.equal(validateSurveyForm(validSurveyState({ barrierCodes: ["tool_access", "tool_access"] })).barriers, true);
});

test("dashboard metrics requests include scope scope_id and Q3-Q5 criteria", async () => {
  let requestedUrl = "";
  await withMockFetch(
    async (url) => {
      requestedUrl = String(url);
      return jsonResponse({ ok: true });
    },
    () =>
      fetchDashboardMetrics(
        { type: "manager", id: "emp_103" },
        {
          weekly_time_saved: "less_than_1_hour",
          work_output_change: "same",
          quality_change: "no_meaningful_change",
        }
      )
  );

  const params = new URL(requestedUrl, "http://localhost").searchParams;
  assert.equal(params.get("scope"), "manager");
  assert.equal(params.get("scope_id"), "emp_103");
  assert.equal(params.has("group_by"), false);
  assert.equal(params.get("q3"), "less_than_1_hour");
  assert.equal(params.get("q4"), "same");
  assert.equal(params.get("q5"), "no_meaningful_change");
});

test("dashboard metrics omits scope_id for org requests", async () => {
  let requestedUrl = "";
  await withMockFetch(
    async (url) => {
      requestedUrl = String(url);
      return jsonResponse({ ok: true });
    },
    () =>
      fetchDashboardMetrics(
        { type: "org" },
        {
          weekly_time_saved: "more_than_5_hours",
          work_output_change: "slightly_more",
          quality_change: "slightly_better",
        }
      )
  );

  const params = new URL(requestedUrl, "http://localhost").searchParams;
  assert.equal(params.get("scope"), "org");
  assert.equal(params.has("scope_id"), false);
});

test("dashboard Q3-Q5 analysis excludes not_sure from selectable Q3 criteria", () => {
  const q3CriteriaCodes = ANALYSIS_WEEKLY_TIME_SAVED.map((option) => option.code);

  assert.deepEqual(q3CriteriaCodes, [
    "no_noticeable_time_saved",
    "less_than_1_hour",
    "1_5_hours",
    "more_than_5_hours",
  ]);
  assert.equal(q3CriteriaCodes.includes("not_sure"), false);
});

test("dashboard metrics does not use local fallback for backend errors", async () => {
  await withMockFetch(
    async () => new Response("invalid scope", { status: 422 }),
    () =>
      assert.rejects(
        () =>
          fetchDashboardMetrics(
            { type: "org" },
            {
              weekly_time_saved: "more_than_5_hours",
              work_output_change: "slightly_more",
              quality_change: "slightly_better",
            }
          ),
        /GET \/api\/metrics failed: 422/
      )
  );

  await withMockFetch(
    async () => {
      throw new TypeError("network unavailable");
    },
    () =>
      assert.rejects(
        () =>
          fetchDashboardMetrics(
            { type: "org" },
            {
              weekly_time_saved: "more_than_5_hours",
              work_output_change: "slightly_more",
              quality_change: "slightly_better",
            }
          ),
        /network unavailable/
      )
  );
});

test("dashboard manager selection keeps leaders and replaces stale individual contributor ids", () => {
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "emp_102"), "emp_102");
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "emp_104"), "emp_101");
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "d1"), "emp_101");
  assert.equal(resolveDashboardManagerId([], "d1"), "d1");
});

test("dashboard hierarchy helper covers org root through IC leaves", () => {
  const children = buildChildrenMap(SEED_EMPLOYEES);

  assert.deepEqual(children.get("emp_101")?.map((employee) => employee.id), ["emp_102", "emp_106"]);
  assert.deepEqual(children.get("emp_102")?.map((employee) => employee.id), ["emp_103"]);
  assert.deepEqual(children.get("emp_103")?.map((employee) => employee.id), ["emp_104", "emp_105"]);
  assert.deepEqual(children.get("emp_106")?.map((employee) => employee.id), ["emp_107", "emp_109"]);
  assert.deepEqual(children.get("emp_107")?.map((employee) => employee.id), ["emp_108"]);
  assert.deepEqual(children.get("emp_109")?.map((employee) => employee.id), ["emp_110"]);
  assert.deepEqual(subtreeOf(SEED_EMPLOYEES, "emp_101").map((employee) => employee.id), [
    "emp_101",
    "emp_102",
    "emp_103",
    "emp_104",
    "emp_105",
    "emp_106",
    "emp_107",
    "emp_108",
    "emp_109",
    "emp_110",
  ]);
});

test("dashboard toolbar uses a full org hierarchy tree for org and manager scope", async () => {
  const [toolbarSource, orgTreeSource] = await Promise.all([
    readFile(new URL("../src/components/dashboard/DashboardToolbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/OrgChartTree.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(toolbarSource.includes('t === "org"'), false);
  assert.equal(toolbarSource.includes('t === "manager"'), false);
  assert.equal(toolbarSource.includes('className="toolbar-picker" value={managerId}'), false);
  assert.equal(orgTreeSource.includes('aria-label="Organization hierarchy"'), true);
  assert.equal(orgTreeSource.includes("Organization"), true);
  assert.equal(orgTreeSource.includes('employee.level === "ic"'), true);
  assert.equal(orgTreeSource.includes("org-tree-leaf"), true);
  assert.equal(orgTreeSource.includes("LEVEL_LABELS[employee.level]"), true);
});

test("hierarchy toggle button label names the currently selected scope instead of a static word", async () => {
  const [toolbarSource, dashboardPageSource, layoutSource] = await Promise.all([
    readFile(new URL("../src/components/dashboard/DashboardToolbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/layout/AppLayout.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(toolbarSource.includes("hierarchyLabel"), true);
  assert.equal(toolbarSource.includes("Hierarchy"), false);
  assert.equal(dashboardPageSource.includes("hierarchyLabel"), true);
  assert.equal(layoutSource.includes('"Organization Dashboard"'), true);
  assert.equal(layoutSource.includes("${LEVEL_LABELS[selectedHierarchyEmployee.level]} Dashboard"), true);
});

test("org hierarchy tree lives in the persistent sidebar, not the dashboard toolbar", async () => {
  const [toolbarSource, dashboardPageSource, sidebarSource, layoutSource, layoutStyles, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/DashboardToolbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardSidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/layout/AppLayout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/layout/AppLayout.css", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(toolbarSource.includes("OrgChartTree"), false);
  assert.equal(dashboardPageSource.includes("OrgChartTree"), false);
  assert.equal(sidebarSource.includes("OrgChartTree"), true);
  assert.equal(sidebarSource.includes("Organization"), true);
  assert.equal(layoutSource.includes("HierarchyScope"), true);
  assert.equal(layoutStyles.includes(".org-tree"), true);
  assert.equal(layoutStyles.includes(".org-tree-leaf"), true);
  assert.equal(dashboardStyles.includes(".org-tree"), false);
  // real branch/connector lines, not just an indented list of flat boxes
  assert.equal(layoutStyles.includes(".org-tree-branch > .org-tree-item::before"), true);
  assert.equal(layoutStyles.includes(".org-tree-branch > .org-tree-item::after"), true);
});

test("dashboard toolbar does not render a nonfunctional search placeholder", async () => {
  const [toolbarSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/DashboardToolbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(toolbarSource.includes("Search metric, team, or person"), false);
  assert.equal(toolbarSource.includes("toolbar-search"), false);
  assert.equal(dashboardStyles.includes("toolbar-search"), false);
});

test("employee data and selectors omit unsupported department context", async () => {
  const [employeePickerSource, dashboardToolbarSource] = await Promise.all([
    readFile(new URL("../src/components/survey/EmployeePicker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardToolbar.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(SEED_EMPLOYEES.some((employee) => Object.hasOwn(employee, "department")), false);
  assert.equal(employeePickerSource.includes(".department"), false);
  assert.equal(dashboardToolbarSource.includes(".department"), false);
});

test("survey page filters employees who already submitted this cycle", async () => {
  const [surveyPageSource, employeePickerSource] = await Promise.all([
    readFile(new URL("../src/pages/SurveyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/survey/EmployeePicker.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(surveyPageSource.includes("fetchSubmittedEmployeeIds"), true);
  assert.equal(surveyPageSource.includes("submittedEmployeeIds"), true);
  assert.equal(surveyPageSource.includes("availableEmployees"), true);
  assert.equal(surveyPageSource.includes("employees={availableEmployees}"), true);
  assert.equal(employeePickerSource.includes("No employees remaining"), true);
});

test("survey page refreshes submitted employees before another selection", async () => {
  const [surveyPageSource, employeePickerSource] = await Promise.all([
    readFile(new URL("../src/pages/SurveyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/survey/EmployeePicker.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(surveyPageSource.includes("refreshSubmittedEmployeeIds"), true);
  assert.equal(surveyPageSource.includes("void refreshSubmittedEmployeeIds();"), true);
  assert.equal(surveyPageSource.includes("onFocus={refreshSubmittedEmployeeIds}"), true);
  assert.equal(surveyPageSource.includes("SUBMITTED_EMPLOYEE_REFRESH_MS"), true);
  assert.equal(surveyPageSource.includes("window.setInterval"), true);
  assert.equal(surveyPageSource.includes('window.addEventListener("focus"'), true);
  assert.equal(surveyPageSource.includes('document.addEventListener("visibilitychange"'), true);
  assert.equal(employeePickerSource.includes("onFocus?: () => void"), true);
  assert.equal(employeePickerSource.includes("onFocus={onFocus}"), true);
});

test("survey page removes the current submitter from the picker immediately", async () => {
  const surveyPageSource = await readFile(new URL("../src/pages/SurveyPage.tsx", import.meta.url), "utf8");

  assert.equal(surveyPageSource.includes("setEmployeeId(null);"), true);
  assert.equal(surveyPageSource.includes("employee.id === employeeId"), false);
});

test("survey submitted employee status uses backend data and local fallback", async () => {
  await withMockFetch(
    async (url) => {
      assert.equal(url, "/api/survey-responses/submitted-employee-ids");
      return jsonResponse({ employee_ids: ["emp_104", "emp_105"] });
    },
    async () => assert.deepEqual(await fetchSubmittedEmployeeIds(), ["emp_104", "emp_105"])
  );

  await withLocalStorage(
    {
      demo_survey_responses: JSON.stringify({
        emp_104: { submitted_at: "2026-09-02T12:00:00.000Z" },
        emp_105: { submitted_at: "2026-09-02T12:01:00.000Z" },
      }),
    },
    async () =>
      withMockFetch(
        async () => {
          throw new TypeError("network unavailable");
        },
        async () => assert.deepEqual(await fetchSubmittedEmployeeIds(), ["emp_104", "emp_105"])
      )
  );

  await withMockFetch(
    async () => new Response("server error", { status: 500 }),
    () => assert.rejects(() => fetchSubmittedEmployeeIds(), /GET \/api\/survey-responses\/submitted-employee-ids failed: 500/)
  );
});

test("server duplicate survey submissions get a clear user-facing error", async () => {
  await withMockFetch(
    async (url) => {
      assert.equal(url, "/api/survey-responses");
      return jsonResponse({ detail: "survey response already submitted" }, 409);
    },
    async () =>
      assert.rejects(
        () => submitSurveyResponse(buildSurveyResponseSubmission(validSurveyState())),
        /This employee has already submitted a response for this cycle/
      )
  );
});

test("local survey fallback rejects duplicate employee submissions", async () => {
  await withLocalStorage({}, async (storage) => {
    await withMockFetch(
      async () => {
        throw new TypeError("network unavailable");
      },
      async () => {
        await submitSurveyResponse(buildSurveyResponseSubmission(validSurveyState()));
        await assert.rejects(
          () => submitSurveyResponse(buildSurveyResponseSubmission(validSurveyState())),
          /already submitted/
        );
      }
    );

    assert.deepEqual(Object.keys(JSON.parse(storage.demo_survey_responses)), ["emp_104"]);
  });
});

test("frontend employee fallback uses adjacent management levels", () => {
  const expectedManagerLevelByLevel = {
    senior_director: null,
    director: "senior_director",
    manager: "director",
    ic: "manager",
  };
  const employeesById = new Map(SEED_EMPLOYEES.map((employee) => [employee.id, employee]));

  for (const employee of SEED_EMPLOYEES) {
    const expectedManagerLevel = expectedManagerLevelByLevel[employee.level];
    if (expectedManagerLevel === null) {
      assert.equal(employee.manager_id, null);
      continue;
    }

    assert.notEqual(employee.manager_id, null);
    assert.equal(employeesById.get(employee.manager_id)?.level, expectedManagerLevel);
  }
});

test("dashboard does not render an unsupported small-sample warning", async () => {
  const [dashboardPageSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(dashboardPageSource.includes("SMALL_SAMPLE_THRESHOLD"), false);
  assert.equal(dashboardPageSource.includes("tooFew"), false);
  assert.equal(dashboardPageSource.includes("Small sample:"), false);
  assert.equal(dashboardPageSource.includes("Rates are directional only"), false);
  assert.equal(dashboardStyles.includes("small-sample-banner"), false);
});

test("dashboard hero cards show plain population counts without old card clutter", async () => {
  const [heroCardsSource, dashboardPageSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/HeroCards.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(heroCardsSource.includes('label: "Employees"'), true);
  assert.equal(heroCardsSource.includes('label: "Respondents"'), true);
  assert.equal(heroCardsSource.includes('label: "Active AI Users"'), true);
  assert.equal(heroCardsSource.includes('label: "Reports more output"'), false);
  assert.equal(heroCardsSource.includes('label: "Response rate"'), false);
  assert.equal(heroCardsSource.includes('label: "AI adoption rate"'), false);
  assert.equal(heroCardsSource.includes('label: "Avg weekly time saved"'), false);
  assert.equal(heroCardsSource.includes("InfoTooltip"), true);
  assert.equal(heroCardsSource.includes("hero-pill"), false);
  assert.equal(heroCardsSource.includes("hero-spark"), false);
  assert.equal(heroCardsSource.includes("hero-sub"), false);
  assert.equal(dashboardPageSource.includes("HERO_PICK"), false);
  assert.equal(dashboardStyles.includes("hero-pill"), false);
  assert.equal(dashboardStyles.includes("hero-spark"), false);
  assert.equal(dashboardStyles.includes("spark-bar"), false);
  assert.equal(dashboardStyles.includes("hero-sub"), false);
  assert.equal(dashboardStyles.includes(".info-help"), true);
  assert.equal(dashboardStyles.includes(".info-tooltip"), true);
  assert.equal(dashboardStyles.includes(".hero-help"), false);
  assert.equal(dashboardStyles.includes(".hero-tooltip"), false);
});

test("app navigation is a persistent dashboard and survey sidebar", async () => {
  const [layoutSource, sidebarSource, dashboardPageSource, layoutStyles, dashboardStyles, surveyStyles] = await Promise.all([
    readFile(new URL("../src/components/layout/AppLayout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardSidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/layout/AppLayout.css", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/SurveyPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(layoutSource.includes("<header"), false);
  assert.equal(layoutSource.includes("Submit Survey"), false);
  assert.equal(layoutSource.includes("DashboardSidebar"), true);
  assert.equal(layoutSource.includes("<Outlet"), true);
  assert.equal(sidebarSource.includes("NavLink"), true);
  assert.equal(sidebarSource.includes('to: "/dashboard"'), true);
  assert.equal(sidebarSource.includes('to: "/survey"'), true);
  assert.equal(sidebarSource.includes("NAV_SECTIONS"), false);
  assert.equal(sidebarSource.includes("<button"), false);
  assert.equal(sidebarSource.includes("Adoption"), false);
  assert.equal(sidebarSource.includes("Value areas"), false);
  assert.equal(sidebarSource.includes("Time saved"), false);
  assert.equal(sidebarSource.includes("Output & quality"), false);
  assert.equal(sidebarSource.includes("Barriers"), false);
  assert.equal(sidebarSource.includes("Respondents"), false);
  assert.equal(sidebarSource.includes("Q3 2026 survey"), false);
  assert.equal(sidebarSource.includes("coverage"), false);
  assert.equal(dashboardPageSource.includes("DashboardSidebar"), false);
  assert.equal(dashboardPageSource.includes("navSection"), false);
  assert.equal(dashboardPageSource.includes("PANEL_PICK"), false);
  assert.equal(layoutStyles.includes(".app-frame"), true);
  assert.equal(layoutStyles.includes(".dashboard-sidebar"), true);
  assert.equal(dashboardStyles.includes(".dashboard-frame"), false);
  assert.equal(dashboardStyles.includes("sidebar-coverage-card"), false);
  assert.equal(surveyStyles.includes("min-height: 100vh"), false);
});

test("adoption gauge and level leaderboard replace redundant adoption chart", async () => {
  const adoptionChartPath = new URL("../src/components/dashboard/AdoptionChart.tsx", import.meta.url);
  await assert.rejects(() => access(adoptionChartPath));

  const [dashboardPageSource, adoptionSidePanelSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/AdoptionSidePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(dashboardPageSource.includes("AdoptionChart"), false);
  assert.equal(dashboardPageSource.includes("<AdoptionChart"), false);
  assert.equal(adoptionSidePanelSource.includes("InfoTooltip"), true);
  assert.equal(adoptionSidePanelSource.includes("Any usage other than \"Never\" counts as an active AI user."), true);
  assert.equal(adoptionSidePanelSource.includes("dashboard-side-stack"), false);
  assert.equal(adoptionSidePanelSource.includes("gauge-sub"), false);
  assert.equal(adoptionSidePanelSource.includes("gauge-more"), false);
  assert.equal(dashboardStyles.includes(".chart-card"), false);
  assert.equal(dashboardStyles.includes(".chart-card-head"), false);
  assert.equal(dashboardStyles.includes(".chart-legend"), false);
  assert.equal(dashboardStyles.includes(".bar-chart-area"), false);
  assert.equal(dashboardStyles.includes(".bar-chart-bars"), false);
  assert.equal(dashboardStyles.includes(".chart-hint"), false);
  assert.equal(dashboardStyles.includes(".dashboard-side-stack"), false);
  assert.equal(dashboardStyles.includes(".gauge-sub"), false);
  assert.equal(dashboardStyles.includes(".gauge-more"), false);
});

test("combo analysis card uses a leadership title and shared help tooltip", async () => {
  const [comboCardSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/ComboAnalysisCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(comboCardSource.includes("Productivity payoff analysis"), true);
  assert.equal(comboCardSource.includes("Dynamic Q3"), false);
  assert.equal(comboCardSource.includes("Combine one option from each question"), false);
  assert.equal(comboCardSource.includes("InfoTooltip"), true);
  assert.equal(comboCardSource.includes("card-eyebrow"), false);
  assert.equal(comboCardSource.includes("combo-card-head"), true);
  assert.equal(dashboardStyles.includes(".combo-card-head"), true);
});

test("value area ranking card uses contextual help and row-level rank details", async () => {
  const [valueAreaSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/ValueAreaRankingCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(valueAreaSource.includes("InfoTooltip"), true);
  assert.equal(valueAreaSource.includes("card-eyebrow"), false);
  assert.equal(valueAreaSource.includes("card-hint"), false);
  assert.equal(valueAreaSource.includes("rank 1:"), false);
  assert.equal(valueAreaSource.includes("rank 2:"), false);
  assert.equal(valueAreaSource.includes("rank 3:"), false);
  assert.equal(valueAreaSource.includes("value-area-tooltip"), true);
  assert.equal(valueAreaSource.includes("rank-count-chip"), true);
  assert.equal(dashboardStyles.includes(".value-area-tooltip"), true);
  assert.equal(dashboardStyles.includes(".rank-count-chip"), true);
});

test("distribution panels use clear titles help tooltips and fact-based footers", async () => {
  const panelsSource = await readFile(new URL("../src/components/dashboard/DistributionPanels.tsx", import.meta.url), "utf8");

  assert.equal(panelsSource.includes("InfoTooltip"), true);
  assert.equal(panelsSource.includes('title: "Time saved per week"'), true);
  assert.equal(panelsSource.includes('title: "Output impact"'), true);
  assert.equal(panelsSource.includes('title: "Quality impact"'), true);
  assert.equal(panelsSource.includes('title: "Rework burden"'), true);
  assert.equal(panelsSource.includes('title: "Where AI helps most"'), true);
  assert.equal(panelsSource.includes('title: "What\'s limiting AI value"'), true);
  assert.equal(panelsSource.includes("source:"), false);
  assert.equal(panelsSource.includes("card-eyebrow"), false);
  assert.equal(panelsSource.includes("Midpoints 0 / 0.5 / 3 / 8 hours"), false);
  assert.equal(panelsSource.includes("avg_weekly_hours_saved.denominator"), false);
  assert.equal(panelsSource.includes("How often respondents correct or rewrite AI output"), false);
  assert.equal(panelsSource.includes("Single choice, sorted by count descending"), false);
  assert.equal(panelsSource.includes("One respondent may contribute to several barriers"), false);
  assert.equal(panelsSource.includes("most common answer"), true);
  assert.equal(panelsSource.includes("report frequent rework"), true);
  assert.equal(panelsSource.includes("most cited barrier"), true);
});

test("barriers panel footer chooses the top actual barrier instead of no_major_barriers", () => {
  const rows = [
    { code: "no_major_barriers", label: "No major barriers", count: 7, pct: 70, otherTexts: {} },
    { code: "lack_of_training", label: "Lack of training", count: 3, pct: 30, otherTexts: {} },
    { code: "tool_access", label: "Tool access", count: 1, pct: 10, otherTexts: {} },
  ];

  assert.equal(topActualBarrierRow(rows)?.code, "lack_of_training");
  assert.equal(topActualBarrierRow(rows.filter((row) => row.code === "no_major_barriers")), null);
});

test("dashboard removes midpoint-derived weekly hours estimates", async () => {
  const [metricsTypesSource, adoptionSidePanelSource, recordsTableSource, distributionPanelsSource] = await Promise.all([
    readFile(new URL("../src/types/metrics.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/AdoptionSidePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/RecordsTable.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DistributionPanels.tsx", import.meta.url), "utf8"),
  ]);

  for (const source of [metricsTypesSource, adoptionSidePanelSource, recordsTableSource, distributionPanelsSource]) {
    assert.equal(source.includes("avg_weekly_hours_saved"), false);
    assert.equal(source.includes("estimated_weekly_hours_saved"), false);
    assert.equal(source.includes("avg_hours_saved"), false);
    assert.equal(source.includes("avg saved"), false);
  }

  assert.equal(recordsTableSource.includes("Avg hrs saved"), false);
  assert.equal(distributionPanelsSource.includes("Midpoints"), false);
});

test("records table does not render footer disclaimer text", async () => {
  const [dashboardPageSource, recordsTableSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/RecordsTable.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(recordsTableSource.includes("eligibleTotal"), false);
  assert.equal(recordsTableSource.includes("table-footer"), false);
  assert.equal(recordsTableSource.includes("Seeded demonstration data"), false);
  assert.equal(recordsTableSource.includes("fielded Q3 2026"), false);
  assert.equal(recordsTableSource.includes("denominators shown per metric"), false);
  assert.equal(dashboardPageSource.includes("eligibleTotal="), false);
  assert.equal(dashboardStyles.includes(".table-footer"), false);
});

test("records table labels null top barrier as unavailable data", () => {
  assert.equal(topBarrierLabel(null), "No barrier data");
  assert.equal(topBarrierLabel({ code: "no_major_barriers", label: "No major barriers" }), "No major barriers");
  assert.equal(topBarrierLabel({ code: "lack_of_training", label: "Lack of training" }), "Lack of training");
});

test("employee directory fallback is used only when the backend is unreachable", async () => {
  await withMockFetch(
    async () => {
      throw new TypeError("network unavailable");
    },
    async () => {
      const employees = await fetchEmployees();
      assert.equal(employees.length, 10);
    }
  );

  await withMockFetch(
    async () => new Response("server error", { status: 500 }),
    () => assert.rejects(() => fetchEmployees(), /GET \/api\/employees failed: 500/)
  );
});

test("dashboard org directory fallback is used only when the backend is unreachable", async () => {
  await withMockFetch(
    async () => {
      throw new TypeError("network unavailable");
    },
    async () => {
      const employees = await fetchOrgDirectory();
      assert.equal(employees.length, 10);
    }
  );

  await withMockFetch(
    async () => new Response("server error", { status: 500 }),
    () => assert.rejects(() => fetchOrgDirectory(), /GET \/api\/employees failed: 500/)
  );
});

async function withMockFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withLocalStorage(initialValues, run) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = { ...initialValues };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key) {
        return Object.hasOwn(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      },
    },
  });

  try {
    return await run(storage);
  } finally {
    if (originalDescriptor === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    }
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
