import { useState } from "react";
import type { DashboardMetricsResponse } from "../../types/metrics";
import { NO_MAJOR_BARRIERS_CODE, OTHER_CODE } from "../../types/survey";
import { InfoTooltip } from "./InfoTooltip";

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
  help: string;
  denominator: number;
  rows: PanelRow[];
  foot: string;
  hoverableOther: boolean;
}

function PanelCard({ panel }: { panel: PanelDef }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hoveredRow = hoverIdx !== null ? panel.rows[hoverIdx] : null;
  const foot =
    panel.hoverableOther && hoveredRow?.code === OTHER_CODE && hoveredRow.otherTexts && Object.keys(hoveredRow.otherTexts).length
      ? "Other · " + Object.entries(hoveredRow.otherTexts).map(([t, c]) => `${t} (${c})`).join(" · ")
      : panel.foot;

  return (
    <div className="card panel-card">
      <div className="panel-head">
        <div className="panel-title">{panel.title}</div>
        <InfoTooltip label={`${panel.title} help`}>{panel.help}</InfoTooltip>
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
const FREQUENT_REWORK_CODES = ["often", "almost_always"];

function pctForCodes(rows: { code: string; count: number }[], denominator: number, codes: string[]) {
  const count = rows.filter((r) => codes.includes(r.code)).reduce((sum, row) => sum + row.count, 0);
  return denominator ? Math.round((count / denominator) * 100) : 0;
}

function topRow<T extends { count: number }>(rows: T[]) {
  return rows.reduce<T | null>((best, row) => (!best || row.count > best.count ? row : best), null);
}

export function topActualBarrierRow<T extends { code: string; count: number }>(rows: T[]) {
  return topRow(rows.filter((row) => row.code !== NO_MAJOR_BARRIERS_CODE));
}

function mostCommonFoot(row: { label: string; pct: number; count: number } | null, emptyText: string) {
  return row && row.count ? `${row.label} is the most common answer, at ${row.pct}%.` : emptyText;
}

function mostCitedBarrierFoot(row: { label: string; pct: number; count: number } | null) {
  return row && row.count ? `${row.label} is the most cited barrier, at ${row.pct}%.` : "No barriers selected yet.";
}

export function DistributionPanels({ metrics, visibleTitles }: DistributionPanelsProps) {
  const betterQualityPct = pctForCodes(metrics.work_quality.rows, metrics.work_quality.denominator, ["slightly_better", "much_better"]);
  const frequentReworkPct = pctForCodes(metrics.ai_rework_frequency.rows, metrics.ai_rework_frequency.denominator, FREQUENT_REWORK_CODES);
  const moreOutputPct = pctForCodes(metrics.work_output.rows, metrics.work_output.denominator, ["slightly_more", "significantly_more"]);
  const topTimeSaved = topRow(metrics.weekly_time_saved.rows);
  const topBenefit = topRow(metrics.benefits.rows);
  const topBarrier = topActualBarrierRow(metrics.barriers.rows);

  const panels: PanelDef[] = [
    {
      title: "Time saved per week",
      help: "Distribution of how much work time respondents estimate AI saves in a typical week.",
      denominator: metrics.weekly_time_saved.denominator,
      rows: metrics.weekly_time_saved.rows.map((r, idx) => ({
        ...r,
        color: r.code === "not_sure" ? GRAY : idx <= 1 ? AMBER : GREEN,
      })),
      foot: mostCommonFoot(topTimeSaved, "No weekly time saved responses yet."),
      hoverableOther: false,
    },
    {
      title: "Output impact",
      help: "Distribution of whether respondents complete less, the same, or more work when using AI.",
      denominator: metrics.work_output.denominator,
      rows: metrics.work_output.rows.map((r, idx) => ({ ...r, color: idx <= 1 ? RED : GREEN })),
      foot: `${moreOutputPct}% report more output than before AI.`,
      hoverableOther: false,
    },
    {
      title: "Quality impact",
      help: "Distribution of whether respondents report worse, unchanged, or better work quality when using AI.",
      denominator: metrics.work_quality.denominator,
      rows: metrics.work_quality.rows.map((r, idx) => ({ ...r, color: idx <= 1 ? RED : GREEN })),
      foot: `${betterQualityPct}% report better quality; the rest see no meaningful change or worse.`,
      hoverableOther: false,
    },
    {
      title: "Rework burden",
      help: "How often respondents need to substantially correct or rewrite AI output before using it.",
      denominator: metrics.ai_rework_frequency.denominator,
      rows: metrics.ai_rework_frequency.rows.map((r, idx) => ({ ...r, color: idx >= 3 ? RED : GREEN })),
      foot: `${frequentReworkPct}% report frequent rework, often or almost always.`,
      hoverableOther: false,
    },
    {
      title: "Where AI helps most",
      help: "The single biggest day-to-day benefit respondents say AI provides.",
      denominator: metrics.benefits.denominator,
      rows: metrics.benefits.rows.map((r, idx) => ({ ...r, color: idx === 0 ? DARK_GREEN : GREEN })),
      foot: mostCommonFoot(topBenefit, "No primary benefit responses yet."),
      hoverableOther: true,
    },
    {
      title: "What's limiting AI value",
      help: "The barriers respondents selected as limiting effective AI use at work.",
      denominator: metrics.barriers.denominator,
      rows: metrics.barriers.rows.map((r, idx) => ({
        ...r,
        color: r.code === NO_MAJOR_BARRIERS_CODE ? BARRIER_GRAY : idx === 0 ? DARK_GREEN : GREEN,
      })),
      foot: mostCitedBarrierFoot(topBarrier),
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
