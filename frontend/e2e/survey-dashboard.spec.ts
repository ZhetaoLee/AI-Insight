import { expect, test } from "@playwright/test";

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

  await page.getByLabel("Your name").selectOption("emp_104");
  await expect(page.locator(".employee-context")).toContainText("Individual Contributor");
  await expect(page.locator(".employee-context")).not.toContainText("Engineering");

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

  const managerMetricsResponse = await request.get("/api/metrics?scope=manager&scope_id=emp_103");
  expect(managerMetricsResponse.ok()).toBeTruthy();
  const managerMetrics = await managerMetricsResponse.json();
  expect(managerMetrics.coverage.respondents).toBeGreaterThanOrEqual(1);
  expect(managerMetrics.population.active_ai_users).toBeGreaterThanOrEqual(1);

  await page.getByRole("link", { name: "Dashboard" }).click();

  await expect(page.getByText("Executive overview")).toBeVisible();
  await expect(page.locator(".dashboard-sidebar")).toHaveCount(1);
  await expect(sidebarLinks).toHaveCount(2);
  await expect(page.locator(".dashboard-sidebar").getByText("Q3 2026 survey")).toHaveCount(0);
  await expect(page.getByText(/Small sample:/)).toHaveCount(0);
  await expect(page.getByText(/Rates are directional only/)).toHaveCount(0);
  await expect(page.getByText("Employees", { exact: true })).toBeVisible();
  await expect(page.getByText("Respondents", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Active AI Users", { exact: true })).toBeVisible();
  await expect(page.getByText("Response coverage", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-card")).toHaveCount(3);
  await expect(page.locator(".hero-card .info-help")).toHaveCount(3);
  const adoptionChart = page.locator(".chart-card").filter({ hasText: "Adoption by level" });
  await expect(adoptionChart.getByText("Reports more output", { exact: true })).toHaveCount(0);
  await expect(adoptionChart.locator(".legend-item")).toHaveCount(1);
  await expect(adoptionChart.locator(".bar-chart-bars > div")).toHaveCount(4);
  const adoptionChartOverflows = await adoptionChart.locator(".bar-chart-area").evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(adoptionChartOverflows).toBeFalsy();
  const comboCard = page.locator(".combo-card");
  await expect(comboCard.getByText("Productivity payoff analysis", { exact: true })).toBeVisible();
  await expect(comboCard.getByText("Dynamic Q3–Q5 analysis", { exact: true })).toHaveCount(0);
  await expect(comboCard.getByText("Combine one option from each question", { exact: true })).toHaveCount(0);
  await expect(comboCard.locator(".info-help")).toHaveCount(1);

  await page.locator(".hero-card .info-help").first().hover();
  await expect(page.locator(".hero-card .info-tooltip").first()).toHaveCSS("opacity", "1");
  await comboCard.locator(".info-help").hover();
  await expect(comboCard.locator(".info-tooltip")).toHaveCSS("opacity", "1");
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
  await expect(distributionGrid.getByText(/is the most cited barrier, at \d+%/)).toBeVisible();
  await distributionGrid.locator(".info-help").first().hover();
  await expect(distributionGrid.locator(".info-tooltip").first()).toHaveCSS("opacity", "1");

  await page.getByRole("link", { name: "Survey" }).click();
  await expect(page).toHaveURL(/\/survey$/);
  await expect(page.locator(".dashboard-sidebar")).toBeVisible();
  await expect(page.getByText("AI productivity survey")).toBeVisible();
});
