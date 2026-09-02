import { buildDashboardSeed } from "../lib/dashboardSeedData";
import { computeDashboardMetrics } from "../lib/metricsEngine";
import type { Employee } from "../types/employee";
import type { DashboardScope, DashboardMetricsResponse, Q3Q5Criteria } from "../types/metrics";
import { fetchJsonWithNetworkFallback } from "./http";

// The scope pickers (manager / level dropdowns) need the full org directory,
// independent of whichever scope is currently selected for the metrics call.
export async function fetchOrgDirectory(): Promise<Employee[]> {
  return fetchJsonWithNetworkFallback(
    "/api/employees",
    () => buildDashboardSeed().employees,
    "GET /api/employees failed"
  );
}

// Falls back to a local computation over seed data when the backend isn't
// reachable yet, mirroring the pattern in api/employees.ts and api/survey.ts
// so the dashboard is demoable standalone. The fallback computation
// (lib/metricsEngine.ts) is structured to be dropped once /api/metrics
// (PRD.md §23) exists — components only ever consume DashboardMetricsResponse.
export async function fetchDashboardMetrics(
  scope: DashboardScope,
  q3Q5Criteria: Q3Q5Criteria
): Promise<DashboardMetricsResponse> {
  return fetchJsonWithNetworkFallback(
    `/api/metrics?${buildMetricsParams(scope, q3Q5Criteria).toString()}`,
    () => {
      const { employees, records } = buildDashboardSeed();
      return computeDashboardMetrics(employees, records, scope, q3Q5Criteria);
    },
    "GET /api/metrics failed"
  );
}

function buildMetricsParams(scope: DashboardScope, q3Q5Criteria: Q3Q5Criteria): URLSearchParams {
  const params = new URLSearchParams({
    scope: scope.type,
    q3: q3Q5Criteria.weekly_time_saved,
    q4: q3Q5Criteria.work_output_change,
    q5: q3Q5Criteria.quality_change,
  });
  if (scope.type !== "org") params.set("scope_id", scope.id);
  return params;
}
