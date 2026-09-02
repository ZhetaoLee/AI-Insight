import type { DashboardMetricsResponse } from "../../types/metrics";
import { InfoTooltip } from "./InfoTooltip";

interface HeroDef {
  label: string;
  value: number;
  help: string;
}

interface HeroCardsProps {
  metrics: DashboardMetricsResponse;
}

export function HeroCards({ metrics }: HeroCardsProps) {
  const { population } = metrics;
  const heroes: HeroDef[] = [
    {
      label: "Employees",
      value: population.eligible_employees,
      help: "Employees included in the currently selected dashboard scope.",
    },
    {
      label: "Respondents",
      value: population.respondents,
      help: "Employees in scope who submitted a survey response for the active cycle.",
    },
    {
      label: "Active AI Users",
      value: population.active_ai_users,
      help: 'Respondents who selected anything other than "Never" for AI usage frequency.',
    },
  ];

  return (
    <div className="hero-grid">
      {heroes.map((hero) => (
        <div key={hero.label} className="hero-card">
          <div className="hero-card-head">
            <div className="hero-label">{hero.label}</div>
            <InfoTooltip label={`${hero.label} help`}>{hero.help}</InfoTooltip>
          </div>
          <div className="hero-value-row">
            <div className="hero-value">{hero.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
