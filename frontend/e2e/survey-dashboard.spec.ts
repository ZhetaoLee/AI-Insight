import { expect, test } from "@playwright/test";

test("employee survey submission is reflected in the executive dashboard", async ({ page, request }) => {
  await page.goto("/survey");

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
  await expect(page.getByText("Response rate", { exact: true })).toBeVisible();
  await expect(page.getByText("AI adoption rate", { exact: true }).first()).toBeVisible();
});
