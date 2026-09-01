import type { GroupBreakdown, RateMetric } from "../../types/metrics";
import { abbreviate } from "../../lib/dashboardFormat";

interface AdoptionSidePanelProps {
  adoptionRate: RateMetric;
  groupBreakdown: GroupBreakdown;
  groupLabel: string;
}

export function AdoptionSidePanel({ adoptionRate, groupBreakdown, groupLabel }: AdoptionSidePanelProps) {
  const valuePct = Math.round(adoptionRate.value * 100);
  const arc = 270;
  const dash = `${((arc * valuePct) / 100).toFixed(1)} ${arc}`;
  const leaders = groupBreakdown.rows.slice(0, 4);

  return (
    <div className="dashboard-side-stack">
      <div className="card gauge-card">
        <div className="gauge-card-head">
          <div className="gauge-title-block">
            <div className="card-title">AI adoption rate</div>
            <div className="gauge-caption">
              {adoptionRate.count} of {adoptionRate.denominator} respondents
            </div>
          </div>
          <div className="gauge-more">···</div>
        </div>
        <div className="gauge-svg-wrap">
          <svg viewBox="0 0 200 112" style={{ width: "100%", height: "100%", display: "block" }}>
            <path d="M14 104 A86 86 0 0 1 186 104" fill="none" stroke="#edf1f3" strokeWidth="20" strokeLinecap="round" />
            <path
              d="M14 104 A86 86 0 0 1 186 104"
              fill="none"
              stroke="#1f9d7c"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={dash}
            />
          </svg>
          <div className="gauge-value">{valuePct}%</div>
        </div>
        <div className="gauge-sub">
          Q1. Any usage other than "Never" counts as an active AI user. Non-respondents are excluded from the denominator.
        </div>
      </div>

      <div className="card leaderboard-card">
        <div className="leaderboard-head">
          <div className="leaderboard-title">{groupLabel} leaderboard</div>
          <div className="leaderboard-sub">By adoption</div>
        </div>
        <div className="leaderboard-list">
          {leaders.map((r) => {
            const adoptionN = r.adoption_rate ?? 0;
            const strong = adoptionN >= 70;
            const valueColor = strong ? "#1f9d7c" : adoptionN >= 45 ? "#5d6874" : "#c2564a";
            const chipBg = strong ? "#e7f6f0" : "#f0f2f4";
            const chipFg = strong ? "#15806a" : "#5d6874";
            return (
              <div key={r.key} className="leaderboard-row">
                <div className="leaderboard-chip" style={{ background: chipBg, color: chipFg }}>
                  {abbreviate(r.label)}
                </div>
                <div className="leaderboard-name-block">
                  <div className="leaderboard-name">{r.label}</div>
                  <div className="leaderboard-meta">
                    {r.respondents} / {r.eligible_employees} responses ·{" "}
                    {r.avg_hours_saved != null ? `${r.avg_hours_saved.toFixed(1)} h` : "—"} avg saved
                  </div>
                </div>
                <div className="leaderboard-value" style={{ color: valueColor }}>
                  {r.adoption_rate != null ? `${r.adoption_rate}%` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
