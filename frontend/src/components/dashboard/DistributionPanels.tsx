import { useState } from "react";
import type { DashboardMetricsResponse } from "../../types/metrics";

interface PanelRow {
  code: string;
  label: string;
  count: number;
  pct: number;
  color: string;
  otherTexts?: Record<string, number>;
}

interface PanelDef {
  title: string;
  source: string;
  denominator: number;
  rows: PanelRow[];
  foot: string;
  hoverableOther: boolean;
}

function PanelCard({ panel }: { panel: PanelDef }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hoveredRow = hoverIdx !== null ? panel.rows[hoverIdx] : null;
  const foot =
    panel.hoverableOther && hoveredRow?.code === "other" && hoveredRow.otherTexts && Object.keys(hoveredRow.otherTexts).length
      ? "Other · " + Object.entries(hoveredRow.otherTexts).map(([t, c]) => `${t} (${c})`).join(" · ")
      : panel.foot;

  return (
    <div className="card panel-card">
      <div className="panel-head">
        <div className="panel-title">{panel.title}</div>
        <div className="card-eyebrow">{panel.source}</div>
      </div>
      <div className="panel-rows">
        {panel.rows.map((r, idx) => (
          <div key={r.code} className="panel-row" onMouseEnter={() => setHoverIdx(idx)} onMouseLeave={() => setHoverIdx(null)}>
            <div className="panel-row-top">
              <div className="panel-row-label" style={{ color: hoverIdx === idx ? "#1f2a37" : "#5d6874" }}>
                {r.label}
              </div>
              <div className="panel-row-value">{hoverIdx === idx ? `${r.count} / ${panel.denominator}` : `${r.pct}%`}</div>
            </div>
            <div className="panel-bar-track">
              <div className="panel-bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="panel-foot">{foot}</div>
    </div>
  );
}

interface DistributionPanelsProps {
  metrics: DashboardMetricsResponse;
  visibleTitles: string[] | "all";
}

const AMBER = "#e3a13c";
const RED = "#c2564a";
const GREEN = "#1f9d7c";
const GRAY = "#c3ccd4";
const BARRIER_GRAY = "#9fb3c4";
const DARK_GREEN = "#15806a";

export function DistributionPanels({ metrics, visibleTitles }: DistributionPanelsProps) {
  const betterQualityCount = metrics.work_quality.rows
    .filter((r) => r.code === "slightly_better" || r.code === "much_better")
    .reduce((s, r) => s + r.count, 0);
  const betterQualityPct = metrics.population.respondents ? Math.round((betterQualityCount / metrics.population.respondents) * 100) : 0;
  const moreOutputPct = Math.round(metrics.headline_metrics.reports_more_output.value * 100);

  const panels: PanelDef[] = [
    {
      title: "Weekly time saved",
      source: `Q3 · n = ${metrics.weekly_time_saved.denominator}`,
      denominator: metrics.weekly_time_saved.denominator,
      rows: metrics.weekly_time_saved.rows.map((r, idx) => ({
        ...r,
        color: r.code === "not_sure" ? GRAY : idx <= 1 ? AMBER : GREEN,
      })),
      foot: `Midpoints 0 / 0.5 / 3 / 8 hours. "Not sure" is missing data, excluded from the ${metrics.headline_metrics.avg_weekly_hours_saved.denominator}-response average.`,
      hoverableOther: false,
    },
    {
      title: "Work output impact",
      source: `Q4 · n = ${metrics.work_output.denominator}`,
      denominator: metrics.work_output.denominator,
      rows: metrics.work_output.rows.map((r, idx) => ({ ...r, color: idx <= 1 ? RED : GREEN })),
      foot: `${moreOutputPct}% report more output than before AI.`,
      hoverableOther: false,
    },
    {
      title: "Work quality impact",
      source: `Q5 · n = ${metrics.work_quality.denominator}`,
      denominator: metrics.work_quality.denominator,
      rows: metrics.work_quality.rows.map((r, idx) => ({ ...r, color: idx <= 1 ? RED : GREEN })),
      foot: `${betterQualityPct}% report better quality; the rest see no meaningful change or worse.`,
      hoverableOther: false,
    },
    {
      title: "AI rework frequency",
      source: `Q6 · n = ${metrics.ai_rework_frequency.denominator}`,
      denominator: metrics.ai_rework_frequency.denominator,
      rows: metrics.ai_rework_frequency.rows.map((r, idx) => ({ ...r, color: idx >= 3 ? RED : GREEN })),
      foot: "How often respondents correct or rewrite AI output. Red bands are the review burden.",
      hoverableOther: false,
    },
    {
      title: "Primary benefits",
      source: `Q7 · n = ${metrics.benefits.denominator}`,
      denominator: metrics.benefits.denominator,
      rows: metrics.benefits.rows.map((r, idx) => ({ ...r, color: idx === 0 ? DARK_GREEN : GREEN })),
      foot: 'Single choice, sorted by count descending. Hover "Other" for submitted text.',
      hoverableOther: true,
    },
    {
      title: "Barriers",
      source: `Q8 · multi-select · n = ${metrics.barriers.denominator}`,
      denominator: metrics.barriers.denominator,
      rows: metrics.barriers.rows.map((r, idx) => ({
        ...r,
        color: r.code === "no_major_barriers" ? BARRIER_GRAY : idx === 0 ? DARK_GREEN : GREEN,
      })),
      foot: 'One respondent may contribute to several barriers, so shares exceed 100%. "No major barriers" is exclusive.',
      hoverableOther: true,
    },
  ];

  const shown = visibleTitles === "all" ? panels : panels.filter((p) => visibleTitles.includes(p.title));
  if (shown.length === 0) return null;

  return (
    <div className="distribution-grid">
      {shown.map((p) => (
        <PanelCard key={p.title} panel={p} />
      ))}
    </div>
  );
}
