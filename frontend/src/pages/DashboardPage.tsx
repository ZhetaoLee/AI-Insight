import { useEffect, useMemo, useState } from "react";
import { fetchDashboardMetrics, fetchOrgDirectory } from "../api/metrics";
import { AdoptionChart } from "../components/dashboard/AdoptionChart";
import { AdoptionSidePanel } from "../components/dashboard/AdoptionSidePanel";
import { ComboAnalysisCard } from "../components/dashboard/ComboAnalysisCard";
import { DashboardToolbar } from "../components/dashboard/DashboardToolbar";
import { DistributionPanels } from "../components/dashboard/DistributionPanels";
import { HeroCards } from "../components/dashboard/HeroCards";
import { RecordsTable } from "../components/dashboard/RecordsTable";
import { ValueAreaRankingCard } from "../components/dashboard/ValueAreaRankingCard";
import { resolveDashboardManagerId } from "../lib/dashboardScope";
import { LEVEL_LABELS, type Employee, type EmployeeLevel } from "../types/employee";
import type { DashboardMetricsResponse, DashboardScope, Q3Q5Criteria } from "../types/metrics";
import "./DashboardPage.css";

export function DashboardPage() {
  const [orgEmployees, setOrgEmployees] = useState<Employee[]>([]);
  const [scopeType, setScopeType] = useState<"org" | "manager" | "level">("org");
  const [managerId, setManagerId] = useState("d1");
  const [level, setLevel] = useState<EmployeeLevel>("ic");
  const [q3Q5Criteria, setQ3Q5Criteria] = useState<Q3Q5Criteria>({
    weekly_time_saved: "more_than_5_hours",
    work_output_change: "slightly_more",
    quality_change: "slightly_better",
  });
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgDirectory().then(setOrgEmployees);
  }, []);

  useEffect(() => {
    const nextManagerId = resolveDashboardManagerId(orgEmployees, managerId);
    if (nextManagerId !== managerId) setManagerId(nextManagerId);
  }, [managerId, orgEmployees]);

  const scope: DashboardScope = useMemo(() => {
    if (scopeType === "org") return { type: "org" };
    if (scopeType === "manager") return { type: "manager", id: managerId };
    return { type: "level", id: level };
  }, [scopeType, managerId, level]);

  useEffect(() => {
    let cancelled = false;
    setMetricsError(null);
    fetchDashboardMetrics(scope, q3Q5Criteria)
      .then((m) => {
        if (!cancelled) setMetrics(m);
      })
      .catch((error) => {
        if (!cancelled) {
          setMetricsError(error instanceof Error ? error.message : "Unable to load dashboard metrics.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, q3Q5Criteria]);

  if (!metrics) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">{metricsError ?? "Loading dashboard…"}</div>
      </div>
    );
  }

  const managerName = scopeType === "manager" ? orgEmployees.find((e) => e.id === managerId)?.name ?? "" : "";
  const scopeCaption =
    scopeType === "org"
      ? "All employees. Every rate is computed from individual responses in scope, never averaged up from group percentages."
      : scopeType === "manager"
        ? `Manager scope: ${managerName} plus all descendants, resolved to individual responses.`
        : `Level scope: all employees at ${LEVEL_LABELS[level]}, resolved to individual responses.`;
  const responseRatePct = Math.round(metrics.coverage.response_rate * 100);

  return (
    <div className="dashboard-page">
      <DashboardToolbar
        scopeType={scopeType}
        managerId={managerId}
        level={level}
        orgEmployees={orgEmployees}
        onScopeTypeChange={setScopeType}
        onManagerChange={setManagerId}
        onLevelChange={setLevel}
      />

      <div className="dashboard-content">
        <div className="content-header">
          <div className="content-heading">
            <div className="content-title">Executive overview</div>
            <div className="content-caption">{scopeCaption}</div>
          </div>
          <button type="button" className="reset-scope-btn" onClick={() => setScopeType("org")}>
            Reset scope
          </button>
        </div>

        {metricsError && <div className="dashboard-banner">{metricsError}</div>}

        <HeroCards metrics={metrics} />

        <section className="coverage-summary" aria-label="Response coverage">
          <div>
            <div className="coverage-summary-label">Response coverage</div>
            <div className="coverage-summary-value">
              {metrics.coverage.respondents} of {metrics.coverage.eligible_employees} employees responded
            </div>
          </div>
          <div className="coverage-summary-rate">{responseRatePct}%</div>
          <div className="coverage-summary-track" aria-hidden="true">
            <div className="coverage-summary-fill" style={{ width: `${responseRatePct}%` }} />
          </div>
        </section>

        <div className="charts-grid">
          <AdoptionChart groupBreakdown={metrics.group_breakdown} />
          <AdoptionSidePanel adoptionRate={metrics.headline_metrics.ai_adoption_rate} groupBreakdown={metrics.group_breakdown} groupLabel="Level" />
        </div>

        <div className="value-combo-grid">
          <ValueAreaRankingCard ranking={metrics.workflow_value} />
          <ComboAnalysisCard analysis={metrics.q3_q5_analysis} onChange={setQ3Q5Criteria} />
        </div>

        <DistributionPanels metrics={metrics} visibleTitles="all" />

        <RecordsTable
          groupBreakdown={metrics.group_breakdown}
          eligibleTotal={metrics.population.eligible_employees}
        />
      </div>
    </div>
  );
}
