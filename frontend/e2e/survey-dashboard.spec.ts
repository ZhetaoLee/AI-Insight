import { expect, test } from "@playwright/test";

type BarrierSubmission = { option: string; other_text: string | null };

function surveySubmission(employeeId: string, barriers: BarrierSubmission[] = [{ option: "lack_of_training", other_text: null }]) {
  return {
    employee_id: employeeId,
    answers: {
      ai_usage_frequency: "daily",
      top_value_areas: [
        { area: "implementation", rank: 1, other_text: null },
        { area: "research", rank: 2, other_text: null },
        { area: "testing", rank: 3, other_text: null },
      ],
      weekly_time_saved: "more_than_5_hours",
      work_output_change: "significantly_more",
      quality_change: "slightly_better",
      correction_frequency: "sometimes",
      biggest_benefit: { option: "saves_time", other_text: null },
      barriers,
    },
  };
}

test("employee survey submission is reflected in the executive dashboard", async ({ page, request }) => {
  await page.goto("/survey");

  const sidebarLinks = page.locator(".sidebar-nav .nav-item");
  await expect(page.locator(".dashboard-sidebar")).toBeVisible();
  await expect(sidebarLinks).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Survey" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Submit Survey" })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Adoption", { exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Value areas", { exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Time saved", { exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Output & quality", { exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Barriers", { exact: true })).toHaveCount(0);
  await expect(page.locator(".sidebar-nav").getByText("Respondents", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Q3 2026 survey")).toHaveCount(0);
  await expect(page.locator("#employee-picker option", { hasText: "Marcus Webb" })).toHaveCount(1);

  const stalePageSubmission = await request.post("/api/survey-responses", { data: surveySubmission("emp_105") });
  expect(stalePageSubmission.status()).toBe(201);
  await page.locator("#employee-picker").focus();
  await expect(page.locator("#employee-picker option", { hasText: "Marcus Webb" })).toHaveCount(0);

  await page.getByLabel("Your name").selectOption("emp_104");
  await expect(page.locator(".employee-context")).toContainText("Individual Contributor");
  await expect(page.locator(".employee-context")).not.toContainText("Engineering");
  await expect(page.locator(".employee-context")).not.toContainText("Manager:");

  await page.getByRole("button", { name: "Daily" }).click();
  await page.getByRole("button", { name: "Implementation" }).click();
  await page.getByRole("button", { name: "Research" }).click();
  await page.getByRole("button", { name: "Testing" }).click();
  await page.getByRole("button", { name: "More than 5 hours" }).click();
  await page.getByRole("button", { name: "Significantly more" }).click();
  await page.getByRole("button", { name: "Slightly better" }).click();
  await page.getByRole("button", { name: "Sometimes" }).click();
  await page.getByRole("button", { name: "Saves time" }).click();
  await page.getByRole("button", { name: "Lack of training" }).click();
  await page.getByRole("button", { name: "Submit response" }).click();

  await expect(page.getByText("Your response is recorded")).toBeVisible();
  await expect(page.locator("#employee-picker option", { hasText: "Alice Chen" })).toHaveCount(0);
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Implementation" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Research" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Testing" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "More than 5 hours" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Significantly more" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Slightly better" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Sometimes" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Saves time" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Lack of training" })).toHaveAttribute("aria-pressed", "false");

  const resetRefreshSubmission = await request.post("/api/survey-responses", { data: surveySubmission("emp_108") });
  expect(resetRefreshSubmission.status()).toBe(201);
  await page.getByRole("button", { name: "Start another" }).click();
  await expect(page.locator("#employee-picker option", { hasText: "Alice Chen" })).toHaveCount(0);
  await expect(page.locator("#employee-picker option", { hasText: "Marcus Webb" })).toHaveCount(0);
  await expect(page.locator("#employee-picker option", { hasText: "Jade Thompson" })).toHaveCount(0);

  const managerMetricsResponse = await request.get("/api/metrics?scope=manager&scope_id=emp_103");
  expect(managerMetricsResponse.ok()).toBeTruthy();
  const managerMetrics = await managerMetricsResponse.json();
  expect(managerMetrics.coverage.respondents).toBeGreaterThanOrEqual(1);
  expect(managerMetrics.population.active_ai_users).toBeGreaterThanOrEqual(1);
  expect(managerMetrics.headline_metrics.avg_weekly_hours_saved).toBeUndefined();
  expect(managerMetrics.headline_metrics.estimated_weekly_hours_saved).toBeUndefined();
  for (const row of managerMetrics.group_breakdown.rows) {
    expect(row.avg_hours_saved).toBeUndefined();
    expect(row.avg_hours_saved_denominator).toBeUndefined();
  }

  for (const employeeId of ["emp_101", "emp_102", "emp_103", "emp_106"]) {
    const noBarrierResponse = await request.post("/api/survey-responses", {
      data: surveySubmission(employeeId, [{ option: "no_major_barriers", other_text: null }]),
    });
    expect(noBarrierResponse.status()).toBe(201);
  }

  await page.getByRole("link", { name: "Dashboard" }).click();

  await expect(page.getByText("Executive overview")).toBeVisible();
  await expect(page.locator(".dashboard-sidebar")).toHaveCount(1);
  await expect(sidebarLinks).toHaveCount(2);
  await expect(page.locator(".dashboard-sidebar").getByText("Q3 2026 survey")).toHaveCount(0);
  await expect(page.getByText(/Small sample:/)).toHaveCount(0);
  await expect(page.getByText(/Rates are directional only/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Organization Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Level" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Organization 10 employees" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Priya Nair Senior Director - 9 reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sarah Lee Director - 3 reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "David Kim Manager - 2 reports" })).toBeVisible();
  await expect(page.locator(".org-tree-leaf", { hasText: "Alice Chen" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Alice Chen/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Priya Nair Senior Director - 9 reports" }).click();
  await expect(page.getByText("Manager scope: Priya Nair plus all descendants, resolved to individual responses.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Senior Director Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Sarah Lee Director - 3 reports" }).click();
  await expect(page.getByText("Manager scope: Sarah Lee plus all descendants, resolved to individual responses.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Director Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "David Kim Manager - 2 reports" }).click();
  await expect(page.getByText("Manager scope: David Kim plus all descendants, resolved to individual responses.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manager Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Organization 10 employees" }).click();
  await expect(page.locator(".content-caption")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Organization Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Level" }).click();
  await expect(page.locator(".toolbar-picker")).toBeVisible();
  await expect(page.locator(".org-tree-root.selected")).toHaveCount(0);
  await expect(page.locator(".org-tree-button.selected")).toHaveCount(0);
  await page.getByRole("button", { name: "Organization Dashboard" }).click();
  await expect(page.locator(".content-caption")).toHaveCount(0);
  await expect(page.getByText("Employees", { exact: true })).toBeVisible();
  await expect(page.getByText("Respondents", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Active AI Users", { exact: true })).toBeVisible();
  await expect(page.getByText("Response coverage", { exact: true })).toBeVisible();
  await expect(page.getByText("Avg hrs saved", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/avg saved/i)).toHaveCount(0);
  await expect(page.locator(".hero-card")).toHaveCount(3);
  await expect(page.locator(".hero-card .info-help")).toHaveCount(3);
  const chartsGrid = page.locator(".charts-grid");
  await expect(page.getByText("Adoption by level", { exact: true })).toHaveCount(0);
  await expect(page.locator(".chart-card")).toHaveCount(0);
  await expect(chartsGrid.locator(":scope > .card")).toHaveCount(2);
  const gaugeCard = page.locator(".gauge-card");
  const leaderboardCard = page.locator(".leaderboard-card");
  await expect(gaugeCard.getByText("AI adoption rate", { exact: true })).toBeVisible();
  await expect(gaugeCard.locator(".info-help")).toHaveCount(1);
  await expect(gaugeCard.getByText(/^Q1\\./)).toHaveCount(0);
  await expect(leaderboardCard.getByText("Level leaderboard", { exact: true })).toBeVisible();
  const [gaugeBox, leaderboardBox] = await Promise.all([gaugeCard.boundingBox(), leaderboardCard.boundingBox()]);
  expect(gaugeBox).not.toBeNull();
  expect(leaderboardBox).not.toBeNull();
  expect(Math.abs(gaugeBox!.y - leaderboardBox!.y)).toBeLessThan(8);
  expect(leaderboardBox!.x).toBeGreaterThan(gaugeBox!.x);
  const comboCard = page.locator(".combo-card");
  await expect(comboCard.getByText("Productivity payoff analysis", { exact: true })).toBeVisible();
  await expect(comboCard.getByText("Dynamic Q3–Q5 analysis", { exact: true })).toHaveCount(0);
  await expect(comboCard.getByText("Combine one option from each question", { exact: true })).toHaveCount(0);
  await expect(comboCard.locator(".info-help")).toHaveCount(1);

  await page.locator(".hero-card .info-help").first().hover();
  await expect(page.locator(".hero-card .info-tooltip").first()).toHaveCSS("opacity", "1");
  await gaugeCard.locator(".info-help").hover();
  await expect(gaugeCard.locator(".info-tooltip")).toHaveCSS("opacity", "1");
  await comboCard.locator(".info-help").hover();
  await expect(comboCard.locator(".info-tooltip")).toHaveCSS("opacity", "1");
  const valueAreaCard = page.locator(".value-area-card");
  await expect(valueAreaCard.getByText("AI value area ranking", { exact: true })).toBeVisible();
  await expect(valueAreaCard.locator(".card-eyebrow")).toHaveCount(0);
  await expect(valueAreaCard.locator(".info-help")).toHaveCount(1);
  await expect(valueAreaCard.locator(".card-hint")).toHaveCount(0);
  await expect(valueAreaCard).not.toContainText(/rank 1:/i);
  await expect(valueAreaCard.locator(".value-area-tooltip")).toHaveCount(await valueAreaCard.locator(".value-area-row").count());
  await valueAreaCard.locator(".value-area-row").first().hover();
  await expect(valueAreaCard.locator(".value-area-row").first().locator(".value-area-tooltip")).toHaveCSS("opacity", "1");
  await expect(valueAreaCard.locator(".value-area-row").first().locator(".rank-count-chip")).toHaveCount(3);
  const distributionGrid = page.locator(".distribution-grid");
  await expect(distributionGrid.locator(".panel-card")).toHaveCount(6);
  await expect(distributionGrid.locator(".card-eyebrow")).toHaveCount(0);
  await expect(distributionGrid.locator(".info-help")).toHaveCount(6);
  await expect(distributionGrid.getByText("Time saved per week", { exact: true })).toBeVisible();
  await expect(distributionGrid.getByText("Output impact", { exact: true })).toBeVisible();
  await expect(distributionGrid.getByText("Quality impact", { exact: true })).toBeVisible();
  await expect(distributionGrid.getByText("Rework burden", { exact: true })).toBeVisible();
  await expect(distributionGrid.getByText("Where AI helps most", { exact: true })).toBeVisible();
  await expect(distributionGrid.getByText("What's limiting AI value", { exact: true })).toBeVisible();
  await expect(distributionGrid).not.toContainText(/Q[3-8] ·/);
  await expect(distributionGrid).not.toContainText("Midpoints 0 / 0.5 / 3 / 8 hours");
  await expect(distributionGrid).not.toContainText("Single choice, sorted by count descending");
  await expect(distributionGrid).not.toContainText("One respondent may contribute to several barriers");
  await expect(distributionGrid.getByText(/is the most common answer, at \d+%/).first()).toBeVisible();
  await expect(distributionGrid.getByText(/report frequent rework/)).toBeVisible();
  await expect(distributionGrid.getByText(/No major barriers is the most cited barrier/)).toHaveCount(0);
  await expect(distributionGrid.getByText(/Lack of training is the most cited barrier, at \d+%/)).toBeVisible();
  await distributionGrid.locator(".info-help").first().hover();
  await expect(distributionGrid.locator(".info-tooltip").first()).toHaveCSS("opacity", "1");
  const recordsTable = page.locator(".table-card");
  await expect(recordsTable.getByText("Level records", { exact: true })).toBeVisible();
  await expect(recordsTable.getByText("No barrier data")).toHaveCount(3);
  await expect(recordsTable.getByText("No major barriers")).toHaveCount(0);
  await expect(recordsTable.locator(".table-footer")).toHaveCount(0);
  await expect(recordsTable).not.toContainText("Seeded demonstration data");
  await expect(recordsTable).not.toContainText("fielded Q3 2026");
  await expect(recordsTable).not.toContainText("denominators shown per metric");

  await page.getByRole("link", { name: "Survey" }).click();
  await expect(page).toHaveURL(/\/survey$/);
  await expect(page.locator(".dashboard-sidebar")).toBeVisible();
  await expect(page.getByText("AI productivity survey")).toBeVisible();
  await expect(page.locator("#employee-picker option", { hasText: "Alice Chen" })).toHaveCount(0);
});
