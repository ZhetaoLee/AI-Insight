import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildSurveyResponseSubmission,
  hasSurveyErrors,
  toggleBarrierSelection,
  validateSurveyForm,
} from "../src/lib/surveyForm.ts";
import { SEED_EMPLOYEES, fetchEmployees } from "../src/api/employees.ts";
import { fetchDashboardMetrics, fetchOrgDirectory } from "../src/api/metrics.ts";
import { ANALYSIS_WEEKLY_TIME_SAVED } from "../src/components/dashboard/ComboAnalysisCard.tsx";
import { resolveDashboardManagerId } from "../src/lib/dashboardScope.ts";

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
  assert.equal(layoutSource.includes("<Outlet />"), true);
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

test("adoption by level chart shows only adoption bars without a nested scroll window", async () => {
  const [adoptionChartSource, dashboardStyles] = await Promise.all([
    readFile(new URL("../src/components/dashboard/AdoptionChart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/DashboardPage.css", import.meta.url), "utf8"),
  ]);

  assert.equal(adoptionChartSource.includes("Reports more output"), false);
  assert.equal(adoptionChartSource.includes("more output"), false);
  assert.equal(adoptionChartSource.includes("more_output_rate"), false);
  assert.equal(adoptionChartSource.includes("AI adoption rate"), true);
  assert.equal(adoptionChartSource.includes("legend-dot"), true);

  const chartAreaBlock = dashboardStyles.match(/\.bar-chart-area\s*\{[^}]*\}/)?.[0] ?? "";
  const chartPlotBlock = dashboardStyles.match(/\.bar-chart-plot\s*\{[^}]*\}/)?.[0] ?? "";
  const chartBarBlock = dashboardStyles.match(/\.bar-chart-bars > div\s*\{[^}]*\}/)?.[0] ?? "";
  assert.equal(chartAreaBlock.includes("overflow-x: auto"), false);
  assert.equal(chartPlotBlock.includes("min-width: 390px"), false);
  assert.equal(chartBarBlock.includes("width: 26%"), false);
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
