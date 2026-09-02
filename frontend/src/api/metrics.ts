import { SEED_EMPLOYEES } from "./employees";
import type { Employee } from "../types/employee";
import type { DashboardScope, DashboardMetricsResponse, Q3Q5Criteria } from "../types/metrics";
import { fetchJson, fetchJsonWithNetworkFallback } from "./http";

// The scope pickers (manager / level dropdowns) need the full org directory,
// independent of whichever scope is currently selected for the metrics call.
export async function fetchOrgDirectory(): Promise<Employee[]> {
  return fetchJsonWithNetworkFallback(
    "/api/employees",
    () => SEED_EMPLOYEES,
    "GET /api/employees failed"
  );
}

export async function fetchDashboardMetrics(
  scope: DashboardScope,
  q3Q5Criteria: Q3Q5Criteria
): Promise<DashboardMetricsResponse> {
  return fetchJson(
    `/api/metrics?${buildMetricsParams(scope, q3Q5Criteria).toString()}`,
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
