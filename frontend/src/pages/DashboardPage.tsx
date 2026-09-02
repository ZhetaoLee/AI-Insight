import { useEffect, useMemo, useState } from "react";
import { fetchDashboardMetrics, fetchOrgDirectory } from "../api/metrics";
import { AdoptionChart } from "../components/dashboard/AdoptionChart";
import { AdoptionSidePanel } from "../components/dashboard/AdoptionSidePanel";
import { ComboAnalysisCard } from "../components/dashboard/ComboAnalysisCard";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardToolbar } from "../components/dashboard/DashboardToolbar";
import { DistributionPanels } from "../components/dashboard/DistributionPanels";
import { HeroCards } from "../components/dashboard/HeroCards";
import { RecordsTable } from "../components/dashboard/RecordsTable";
import { ValueAreaRankingCard } from "../components/dashboard/ValueAreaRankingCard";
import type { NavSection } from "../components/dashboard/navSections";
import { LEVEL_LABELS, type Employee, type EmployeeLevel } from "../types/employee";
import type { DashboardMetricsResponse, DashboardScope, GroupByField, Q3Q5Criteria } from "../types/metrics";
import { NO_MAJOR_BARRIERS_CODE } from "../types/survey";
import "./DashboardPage.css";

const SMALL_SAMPLE_THRESHOLD = 8;

const HERO_PICK: Record<NavSection, number[]> = {
  Dashboard: [],
  Adoption: [1],
  "Value areas": [1, 2],
  "Time saved": [2],
  "Output & quality": [3],
  Barriers: [1, 3],
  Respondents: [0],
};

const PANEL_PICK: Record<NavSection, string[]> = {
  Dashboard: [],
  Adoption: [],
  "Value areas": [],
  "Time saved": ["Weekly time saved"],
  "Output & quality": ["Work output impact", "Work quality impact", "AI rework frequency"],
  Barriers: ["Barriers", "Primary benefits"],
  Respondents: [],
};

export function DashboardPage() {
  const [orgEmployees, setOrgEmployees] = useState<Employee[]>([]);
  const [scopeType, setScopeType] = useState<"org" | "manager" | "level">("org");
  const [managerId, setManagerId] = useState("d1");
  const [level, setLevel] = useState<EmployeeLevel>("ic");
  const [groupBy, setGroupBy] = useState<GroupByField>("department");
  const [navSection, setNavSection] = useState<NavSection>("Dashboard");
  const [q3Q5Criteria, setQ3Q5Criteria] = useState<Q3Q5Criteria>({
    weekly_time_saved: "more_than_5_hours",
    work_output_change: "slightly_more",
    quality_change: "slightly_better",
  });
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);

  useEffect(() => {
    fetchOrgDirectory().then(setOrgEmployees);
  }, []);

  const scope: DashboardScope = useMemo(() => {
    if (scopeType === "org") return { type: "org" };
    if (scopeType === "manager") return { type: "manager", id: managerId };
    return { type: "level", id: level };
  }, [scopeType, managerId, level]);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardMetrics(scope, groupBy, q3Q5Criteria).then((m) => {
      if (!cancelled) setMetrics(m);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, groupBy, q3Q5Criteria]);

  if (!metrics) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-loading">Loading dashboard…</div>
      </div>
    );
  }

  const all = navSection === "Dashboard";
  const heroIndices = HERO_PICK[navSection];
  const panelTitles = PANEL_PICK[navSection];
  const show = {
    heroes: all || heroIndices.length > 0,
    chart: all || navSection === "Adoption" || navSection === "Respondents",
    q2: all || navSection === "Value areas",
    combo: all || navSection === "Time saved" || navSection === "Output & quality",
    table: all || navSection === "Adoption" || navSection === "Respondents" || navSection === "Barriers",
  };

  const barrierTotal = metrics.barriers.rows.filter((r) => r.code !== NO_MAJOR_BARRIERS_CODE).reduce((s, r) => s + r.count, 0);
  const groupLabel = groupBy === "department" ? "Department" : "Level";
  const managerName = scopeType === "manager" ? orgEmployees.find((e) => e.id === managerId)?.name ?? "" : "";
  const scopeCaption =
    scopeType === "org"
      ? "All employees. Every rate is computed from individual responses in scope, never averaged up from group percentages."
      : scopeType === "manager"
        ? `Manager scope: ${managerName} plus all descendants, resolved to individual responses.`
        : `Level scope: all employees at ${LEVEL_LABELS[level]}, resolved to individual responses.`;
  const tooFew = metrics.population.respondents > 0 && metrics.population.respondents < SMALL_SAMPLE_THRESHOLD;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-frame">
        <DashboardSidebar
          navSection={navSection}
          onNavChange={setNavSection}
          coverage={metrics.coverage}
          barrierBadge={barrierTotal || null}
        />

        <div className="dashboard-main">
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

            {tooFew && (
              <div className="small-sample-banner">
                Small sample: {metrics.population.respondents} respondents in this scope. Rates are directional only.
              </div>
            )}

            {show.heroes && <HeroCards metrics={metrics} visibleIndices={all ? "all" : heroIndices} />}

            {show.chart && (
              <div className="charts-grid">
                <AdoptionChart groupBreakdown={metrics.group_breakdown} groupLabel={groupLabel} onGroupByChange={setGroupBy} />
                <AdoptionSidePanel adoptionRate={metrics.headline_metrics.ai_adoption_rate} groupBreakdown={metrics.group_breakdown} groupLabel={groupLabel} />
              </div>
            )}

            {(show.q2 || show.combo) && (
              <div className="value-combo-grid">
                {show.q2 && <ValueAreaRankingCard ranking={metrics.workflow_value} />}
                {show.combo && <ComboAnalysisCard analysis={metrics.q3_q5_analysis} onChange={setQ3Q5Criteria} />}
              </div>
            )}

            <DistributionPanels metrics={metrics} visibleTitles={all ? "all" : panelTitles} />

            {show.table && (
              <RecordsTable
                groupBreakdown={metrics.group_breakdown}
                groupLabel={groupLabel}
                eligibleTotal={metrics.population.eligible_employees}
                onGroupByChange={setGroupBy}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
