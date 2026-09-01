import { buildDashboardSeed } from "../lib/dashboardSeedData";
import { computeDashboardMetrics } from "../lib/metricsEngine";
import type { Employee } from "../types/employee";
import type { DashboardScope, DashboardMetricsResponse, GroupByField, Q3Q5Criteria } from "../types/metrics";

// The scope pickers (manager / level dropdowns) need the full org directory,
// independent of whichever scope is currently selected for the metrics call.
export async function fetchOrgDirectory(): Promise<Employee[]> {
  try {
    const res = await fetch("/api/employees");
    if (!res.ok) throw new Error(`GET /api/employees failed: ${res.status}`);
    return (await res.json()) as Employee[];
  } catch {
    return buildDashboardSeed().employees;
  }
}

// Falls back to a local computation over seed data when the backend isn't
// reachable yet, mirroring the pattern in api/employees.ts and api/survey.ts
// so the dashboard is demoable standalone. The fallback computation
// (lib/metricsEngine.ts) is structured to be dropped once /api/metrics
// (PRD.md §23) exists — components only ever consume DashboardMetricsResponse.
export async function fetchDashboardMetrics(
  scope: DashboardScope,
  groupBy: GroupByField,
  q3Q5Criteria: Q3Q5Criteria
): Promise<DashboardMetricsResponse> {
  const params = new URLSearchParams({
    scope: scope.type,
    group_by: groupBy,
    q3: q3Q5Criteria.weekly_time_saved,
    q4: q3Q5Criteria.work_output_change,
    q5: q3Q5Criteria.quality_change,
  });
  if (scope.type !== "org") params.set("scope_id", scope.id);

  try {
    const res = await fetch(`/api/metrics?${params.toString()}`);
    if (!res.ok) throw new Error(`GET /api/metrics failed: ${res.status}`);
    return (await res.json()) as DashboardMetricsResponse;
  } catch {
    const { employees, records } = buildDashboardSeed();
    return computeDashboardMetrics(employees, records, scope, groupBy, q3Q5Criteria);
  }
}
