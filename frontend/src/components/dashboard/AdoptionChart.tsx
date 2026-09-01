import { useState } from "react";
import type { GroupBreakdown, GroupByField } from "../../types/metrics";
import { shortGroupLabel } from "../../lib/dashboardFormat";

interface AdoptionChartProps {
  groupBreakdown: GroupBreakdown;
  groupLabel: string;
  onGroupByChange: (g: GroupByField) => void;
}

export function AdoptionChart({ groupBreakdown, groupLabel, onGroupByChange }: AdoptionChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const rows = groupBreakdown.rows;
  const hovered = hoverIdx !== null ? rows[hoverIdx] : null;

  const chartHint = hovered
    ? `${hovered.label} · ${hovered.respondents} / ${hovered.eligible_employees} responses · adoption ${hovered.adoption_rate ?? 0}% · more output ${hovered.more_output_rate ?? 0}% · ${hovered.avg_hours_saved != null ? hovered.avg_hours_saved.toFixed(1) + " h" : "—"} avg saved`
    : "Hover a column for the full breakdown";

  return (
    <div className="card chart-card">
      <div className="chart-card-head">
        <div className="card-title">Adoption by {groupLabel}</div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#1f9d7c" }} />
            AI adoption rate
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#bfe6d9" }} />
            Reports more output
          </div>
          <div className="toggle-group small">
            {(["department", "level"] as GroupByField[]).map((g) => (
              <button
                key={g}
                type="button"
                className={groupBreakdown.group_by === g ? "toggle-btn active" : "toggle-btn"}
                onClick={() => onGroupByChange(g)}
              >
                {g === "department" ? "Department" : "Level"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bar-chart-area">
        <div className="bar-chart-axis">
          <div>100</div>
          <div>75</div>
          <div>50</div>
          <div>25</div>
          <div>0</div>
        </div>
        <div className="bar-chart-plot">
          {rows.map((r, idx) => {
            const op = hoverIdx === null || hoverIdx === idx ? 1 : 0.45;
            return (
              <div
                key={r.key}
                className="bar-chart-col"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <div className="bar-chart-bars">
                  <div style={{ background: "#1f9d7c", height: `${r.adoption_rate ?? 0}%`, opacity: op }} />
                  <div style={{ background: "#bfe6d9", height: `${r.more_output_rate ?? 0}%`, opacity: op }} />
                </div>
                <div className="bar-chart-label" style={{ color: hoverIdx === idx ? "#1f2a37" : "#8b949e" }}>
                  {shortGroupLabel(r.label)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="chart-hint">{chartHint}</div>
    </div>
  );
}
