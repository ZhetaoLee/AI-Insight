import type { Coverage } from "../../types/metrics";
import { NAV_SECTIONS, type NavSection } from "./navSections";

interface DashboardSidebarProps {
  navSection: NavSection;
  onNavChange: (section: NavSection) => void;
  coverage: Coverage;
  barrierBadge: number | null;
}

export function DashboardSidebar({ navSection, onNavChange, coverage, barrierBadge }: DashboardSidebarProps) {
  const ratePct = Math.round(coverage.response_rate * 100);

  return (
    <div className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">A</div>
        <div className="brand-name">AI Insights</div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-nav-label">Measure</div>
        {NAV_SECTIONS.map((section) => {
          const active = navSection === section;
          const badge = section === "Barriers" ? barrierBadge : null;
          return (
            <button
              key={section}
              type="button"
              className={active ? "nav-item active" : "nav-item"}
              onClick={() => onNavChange(section)}
            >
              <span className="nav-dot" />
              <span className="nav-item-label">{section}</span>
              {badge ? <span className="nav-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="sidebar-coverage-card">
        <div className="coverage-card-title">Q3 2026 survey</div>
        <div className="coverage-card-sub">
          {coverage.respondents} of {coverage.eligible_employees} responses collected · {ratePct}% response rate
        </div>
        <div className="coverage-bar-track">
          <div className="coverage-bar-fill" style={{ width: `${ratePct}%` }} />
        </div>
        <div className="coverage-card-foot">{coverage.eligible_employees - coverage.respondents} non-respondents</div>
      </div>
    </div>
  );
}
