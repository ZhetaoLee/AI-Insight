import type { EmployeeLevel } from "./employee";

// Shape follows PRD.md §24 (Dashboard API Response) plus the group-breakdown
// extension the executive dashboard's charts/table need; the frontend never
// recomputes these values itself once a real /api/metrics backend exists —
// see api/metrics.ts and lib/metricsEngine.ts for the temporary fallback.

export type DashboardScope =
  | { type: "org" }
  | { type: "manager"; id: string }
  | { type: "level"; id: EmployeeLevel };

export interface ScopeDescriptor {
  type: "org" | "manager" | "level";
  id: string | null;
  name: string;
}

export interface Coverage {
  eligible_employees: number;
  respondents: number;
  response_rate: number;
}

export interface Population {
  eligible_employees: number;
  respondents: number;
  non_respondents: number;
  active_ai_users: number;
}

export interface RateMetric {
  value: number;
  count: number;
  denominator: number;
}

export interface HeadlineMetrics {
  ai_adoption_rate: RateMetric;
  avg_weekly_hours_saved: { value: number; denominator: number };
  estimated_weekly_hours_saved: number;
  reports_more_output: RateMetric;
}

export interface DistributionRow {
  code: string;
  label: string;
  count: number;
  pct: number;
}

export interface QuestionDistribution {
  denominator: number;
  rows: DistributionRow[];
}

export interface ValueAreaRow {
  code: string;
  label: string;
  rank1: number;
  rank2: number;
  rank3: number;
  total: number;
  otherTexts: Record<string, number>;
}

export interface ValueAreaRanking {
  denominator: number;
  rows: ValueAreaRow[];
}

export interface RankedOptionRow {
  code: string;
  label: string;
  count: number;
  pct: number;
  otherTexts: Record<string, number>;
}

export interface OptionDistribution {
  denominator: number;
  rows: RankedOptionRow[];
}

export interface Q3Q5Criteria {
  weekly_time_saved: string;
  work_output_change: string;
  quality_change: string;
}

export interface Q3Q5Analysis {
  criteria: Q3Q5Criteria;
  matching_count: number;
  analysis_denominator: number;
  matching_rate: number;
}

export interface GroupRow {
  key: string;
  label: string;
  eligible_employees: number;
  respondents: number;
  adoption_rate: number | null;
  more_output_rate: number | null;
  avg_hours_saved: number | null;
  avg_hours_saved_denominator: number;
  frequent_rework_rate: number | null;
  top_barrier: { code: string; label: string } | null;
}

export interface GroupBreakdown {
  group_by: "level";
  rows: GroupRow[];
}

export interface DashboardMetricsResponse {
  scope: ScopeDescriptor;
  coverage: Coverage;
  population: Population;
  headline_metrics: HeadlineMetrics;
  usage_frequency: QuestionDistribution;
  workflow_value: ValueAreaRanking;
  weekly_time_saved: QuestionDistribution;
  work_output: QuestionDistribution;
  work_quality: QuestionDistribution;
  ai_rework_frequency: QuestionDistribution;
  q3_q5_analysis: Q3Q5Analysis;
  benefits: OptionDistribution;
  barriers: OptionDistribution;
  group_breakdown: GroupBreakdown;
}
