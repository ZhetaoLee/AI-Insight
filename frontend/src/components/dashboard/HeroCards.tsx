import { useState, type CSSProperties } from "react";
import type { DashboardMetricsResponse } from "../../types/metrics";

interface HeroDef {
  label: string;
  value: string;
  unit: string;
  pill: string;
  accent: string;
  tint: string;
  pillBg: string;
  dim: string;
  sparkValues: number[];
  defaultSub: string;
  hoverSub: string;
}

interface HeroCardsProps {
  metrics: DashboardMetricsResponse;
  visibleIndices: number[] | "all";
}

const BETTER_QUALITY_CODES = new Set(["slightly_better", "much_better"]);

export function HeroCards({ metrics, visibleIndices }: HeroCardsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { population, coverage, headline_metrics: headline, group_breakdown } = metrics;
  const n = population.respondents;

  const betterQualityCount = metrics.work_quality.rows
    .filter((r) => BETTER_QUALITY_CODES.has(r.code))
    .reduce((sum, r) => sum + r.count, 0);
  const betterQualityPct = n ? Math.round((betterQualityCount / n) * 100) : 0;

  const groupRespRate = group_breakdown.rows.map((r) => (r.eligible_employees ? Math.round((r.respondents / r.eligible_employees) * 100) : 0));
  const groupAdoption = group_breakdown.rows.map((r) => r.adoption_rate ?? 0);
  const groupAvgHours = group_breakdown.rows.map((r) => r.avg_hours_saved ?? 0);
  const groupMoreOutput = group_breakdown.rows.map((r) => r.more_output_rate ?? 0);

  const heroes: HeroDef[] = [
    {
      label: "Response rate",
      value: `${Math.round(coverage.response_rate * 100)}`,
      unit: "%",
      pill: `${coverage.respondents} / ${coverage.eligible_employees}`,
      accent: "#4a6fa5",
      tint: "#eef2f9",
      pillBg: "#dde5f2",
      dim: "#c6d3e8",
      sparkValues: groupRespRate,
      defaultSub: `${coverage.respondents} of ${coverage.eligible_employees} eligible employees responded.`,
      hoverSub: "Respondents divided by eligible employees in this scope.",
    },
    {
      label: "AI adoption rate",
      value: `${Math.round(headline.ai_adoption_rate.value * 100)}`,
      unit: "%",
      pill: `${headline.ai_adoption_rate.count} / ${headline.ai_adoption_rate.denominator}`,
      accent: "#1f9d7c",
      tint: "#edf8f4",
      pillBg: "#cfeade",
      dim: "#bfe6d9",
      sparkValues: groupAdoption,
      defaultSub: `${headline.ai_adoption_rate.count} of ${headline.ai_adoption_rate.denominator} respondents are active AI users.`,
      hoverSub: 'Q1 · respondents who selected anything other than "Never".',
    },
    {
      label: "Avg weekly time saved",
      value: headline.avg_weekly_hours_saved.value.toFixed(1),
      unit: "hrs",
      pill: `n = ${headline.avg_weekly_hours_saved.denominator}`,
      accent: "#b5872f",
      tint: "#fdf7ea",
      pillBg: "#f6e7c4",
      dim: "#eddcb4",
      sparkValues: groupAvgHours,
      defaultSub: `${Math.round(headline.estimated_weekly_hours_saved)} hrs/week across ${headline.avg_weekly_hours_saved.denominator} known answers.`,
      hoverSub: 'Q3 midpoints: 0 / 0.5 / 3 / 8 hours. "Not sure" excluded from the denominator.',
    },
    {
      label: "Reports more output",
      value: `${Math.round(headline.reports_more_output.value * 100)}`,
      unit: "%",
      pill: `${headline.reports_more_output.count} / ${headline.reports_more_output.denominator}`,
      accent: "#c2564a",
      tint: "#fdf1ef",
      pillBg: "#f8ded9",
      dim: "#eec6bf",
      sparkValues: groupMoreOutput,
      defaultSub: `${betterQualityPct}% also report better work quality (Q5).`,
      hoverSub: 'Q4 · respondents answering "Slightly more" or "Significantly more".',
    },
  ];

  const shown = visibleIndices === "all" ? heroes : visibleIndices.map((i) => heroes[i]);

  return (
    <div className="hero-grid">
      {shown.map((h, idx) => {
        const realIdx = heroes.indexOf(h);
        const max = Math.max(1, ...h.sparkValues);
        return (
          <div
            key={h.label + idx}
            className="hero-card"
            style={{ background: h.tint } as CSSProperties}
            onMouseEnter={() => setHovered(realIdx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="hero-card-head">
              <div className="hero-label">{h.label}</div>
              <div className="hero-pill" style={{ background: h.pillBg, color: h.accent }}>
                {h.pill}
              </div>
            </div>
            <div className="hero-value-row">
              <div className="hero-value">{h.value}</div>
              <div className="hero-unit">{h.unit}</div>
            </div>
            <div className="hero-spark">
              {h.sparkValues.map((v, i) => (
                <div
                  key={i}
                  className="spark-bar"
                  style={{
                    height: `${Math.round((v / max) * 100)}%`,
                    background: v === 0 ? "#e6e9ec" : v >= max * 0.75 ? h.accent : h.dim,
                  }}
                />
              ))}
            </div>
            <div className="hero-sub">{hovered === realIdx ? h.hoverSub : h.defaultSub}</div>
          </div>
        );
      })}
    </div>
  );
}
