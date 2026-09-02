import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSurveyResponseSubmission,
  hasSurveyErrors,
  toggleBarrierSelection,
  validateSurveyForm,
} from "../src/lib/surveyForm.ts";
import { fetchEmployees } from "../src/api/employees.ts";
import { fetchDashboardMetrics, fetchOrgDirectory } from "../src/api/metrics.ts";
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
  { id: "emp_101", name: "Priya Nair", department: "Engineering", level: "senior_director", manager_id: null },
  { id: "emp_102", name: "Sarah Lee", department: "Engineering", level: "director", manager_id: "emp_101" },
  { id: "emp_104", name: "Alice Chen", department: "Engineering", level: "ic", manager_id: "emp_102" },
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

test("dashboard manager selection keeps leaders and replaces stale or IC ids", () => {
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "emp_102"), "emp_102");
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "emp_104"), "emp_101");
  assert.equal(resolveDashboardManagerId(dashboardEmployees, "d1"), "emp_101");
  assert.equal(resolveDashboardManagerId([], "d1"), "d1");
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
