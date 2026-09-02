import { LEVEL_LABELS, type Employee } from "../types/employee";
import {
  AI_USAGE_FREQUENCY,
  BARRIERS,
  BIGGEST_BENEFIT,
  CORRECTION_FREQUENCY,
  NO_MAJOR_BARRIERS_CODE,
  OTHER_CODE,
  QUALITY_CHANGE,
  TOP_VALUE_AREAS,
  WEEKLY_TIME_SAVED,
  WORK_OUTPUT_CHANGE,
  type SurveyOption,
} from "../types/survey";
import type { DashboardRecord } from "./dashboardSeedData";
import type {
  DashboardMetricsResponse,
  DashboardScope,
  DistributionRow,
  GroupByField,
  GroupBreakdown,
  GroupRow,
  OptionDistribution,
  Q3Q5Criteria,
  QuestionDistribution,
  ScopeDescriptor,
  ValueAreaRanking,
} from "../types/metrics";

// Pure, backend-shaped computations over the resolved employee population and
// their raw survey answers. This mirrors the HierarchyService/ScopeResolver +
// SignalCalculator/MetricsAggregator split from ADR.md §20 so it can be lifted
// into the FastAPI service layer largely unchanged once /api/metrics exists —
// see api/metrics.ts for how this is used only as a fetch-failure fallback.

const NEVER_CODE = AI_USAGE_FREQUENCY[0].code;
const MORE_OUTPUT_CODES = [WORK_OUTPUT_CHANGE[3].code, WORK_OUTPUT_CHANGE[4].code];
const BETTER_QUALITY_CODES = [QUALITY_CHANGE[3].code, QUALITY_CHANGE[4].code];
const FREQUENT_REWORK_CODES = [CORRECTION_FREQUENCY[3].code, CORRECTION_FREQUENCY[4].code];
const NOT_SURE_CODE = WEEKLY_TIME_SAVED[4].code;

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

function fraction(n: number, d: number): number {
  return d ? n / d : 0;
}

function labelFor(options: SurveyOption[], code: string): string {
  return options.find((o) => o.code === code)?.label ?? code;
}

function buildChildrenMap(employees: Employee[]): Map<string, Employee[]> {
  const map = new Map<string, Employee[]>();
  for (const e of employees) {
    if (!e.manager_id) continue;
    const list = map.get(e.manager_id) ?? [];
    list.push(e);
    map.set(e.manager_id, list);
  }
  return map;
}

export function subtreeOf(employees: Employee[], managerId: string): Employee[] {
  const root = employees.find((e) => e.id === managerId);
  if (!root) return [];
  const children = buildChildrenMap(employees);
  const out: Employee[] = [root];
  const walk = (id: string) => {
    for (const child of children.get(id) ?? []) {
      out.push(child);
      walk(child.id);
    }
  };
  walk(managerId);
  return out;
}

export function resolveScope(employees: Employee[], scope: DashboardScope): Employee[] {
  if (scope.type === "org") return employees;
  if (scope.type === "manager") return subtreeOf(employees, scope.id);
  return employees.filter((e) => e.level === scope.id);
}

export function describeScope(employees: Employee[], scope: DashboardScope): ScopeDescriptor {
  if (scope.type === "org") return { type: "org", id: null, name: "Organization" };
  if (scope.type === "manager") {
    const manager = employees.find((e) => e.id === scope.id);
    return { type: "manager", id: scope.id, name: manager?.name ?? scope.id };
  }
  return { type: "level", id: scope.id, name: LEVEL_LABELS[scope.id] };
}

interface Resolved {
  employee: Employee;
  record: DashboardRecord;
}

function resolveRecords(pool: Employee[], recordsByEmployeeId: Map<string, DashboardRecord>): Resolved[] {
  return pool.map((employee) => ({ employee, record: recordsByEmployeeId.get(employee.id)! }));
}

function optionDistribution(
  respondents: Resolved[],
  options: SurveyOption[],
  answerCode: (r: Resolved) => string | null
): QuestionDistribution {
  const answered = respondents.filter((r) => answerCode(r) !== null);
  const rows: DistributionRow[] = options.map((o) => {
    const count = answered.filter((r) => answerCode(r) === o.code).length;
    return { code: o.code, label: o.label, count, pct: pct(count, answered.length) };
  });
  return { denominator: answered.length, rows };
}

function rankedOptionDistribution(
  respondents: Resolved[],
  options: SurveyOption[],
  selection: (r: Resolved) => { option: string; other_text: string | null } | null
): OptionDistribution {
  const answered = respondents.filter((r) => selection(r) !== null);
  const counts = new Map<string, number>();
  const otherTexts = new Map<string, Record<string, number>>();
  for (const r of answered) {
    const sel = selection(r)!;
    counts.set(sel.option, (counts.get(sel.option) ?? 0) + 1);
    if (sel.option === OTHER_CODE && sel.other_text) {
      const bucket = otherTexts.get(sel.option) ?? {};
      bucket[sel.other_text] = (bucket[sel.other_text] ?? 0) + 1;
      otherTexts.set(sel.option, bucket);
    }
  }
  const rows = options
    .map((o) => ({
      code: o.code,
      label: o.label,
      count: counts.get(o.code) ?? 0,
      pct: pct(counts.get(o.code) ?? 0, answered.length),
      otherTexts: otherTexts.get(o.code) ?? {},
    }))
    .sort((a, b) => b.count - a.count);
  return { denominator: answered.length, rows };
}

function multiSelectDistribution(
  respondents: Resolved[],
  options: SurveyOption[],
  selections: (r: Resolved) => { option: string; other_text: string | null }[]
): OptionDistribution {
  const answered = respondents.filter((r) => selections(r).length > 0);
  const counts = new Map<string, number>();
  const otherTexts = new Map<string, Record<string, number>>();
  for (const r of answered) {
    for (const sel of selections(r)) {
      counts.set(sel.option, (counts.get(sel.option) ?? 0) + 1);
      if (sel.option === OTHER_CODE && sel.other_text) {
        const bucket = otherTexts.get(sel.option) ?? {};
        bucket[sel.other_text] = (bucket[sel.other_text] ?? 0) + 1;
        otherTexts.set(sel.option, bucket);
      }
    }
  }
  const rows = options
    .map((o) => ({
      code: o.code,
      label: o.label,
      count: counts.get(o.code) ?? 0,
      pct: pct(counts.get(o.code) ?? 0, answered.length),
      otherTexts: otherTexts.get(o.code) ?? {},
    }))
    .sort((a, b) => b.count - a.count);
  return { denominator: answered.length, rows };
}

function valueAreaRanking(respondents: Resolved[]): ValueAreaRanking {
  const answered = respondents.filter((r) => r.record.answers && r.record.answers.top_value_areas.length > 0);
  const counts = new Map<string, { rank1: number; rank2: number; rank3: number; other: Record<string, number> }>();
  for (const r of answered) {
    for (const area of r.record.answers!.top_value_areas) {
      const entry = counts.get(area.area) ?? { rank1: 0, rank2: 0, rank3: 0, other: {} };
      if (area.rank === 1) entry.rank1++;
      else if (area.rank === 2) entry.rank2++;
      else if (area.rank === 3) entry.rank3++;
      if (area.area === OTHER_CODE && area.other_text) {
        entry.other[area.other_text] = (entry.other[area.other_text] ?? 0) + 1;
      }
      counts.set(area.area, entry);
    }
  }
  const rows = TOP_VALUE_AREAS.map((o) => {
    const c = counts.get(o.code) ?? { rank1: 0, rank2: 0, rank3: 0, other: {} };
    return {
      code: o.code,
      label: o.label,
      rank1: c.rank1,
      rank2: c.rank2,
      rank3: c.rank3,
      total: c.rank1 + c.rank2 + c.rank3,
      otherTexts: c.other,
    };
  }).sort((a, b) => b.total - a.total || b.rank1 - a.rank1 || b.rank2 - a.rank2 || b.rank3 - a.rank3);
  return { denominator: answered.length, rows };
}

export function computeQ3Q5Analysis(respondents: Resolved[], criteria: Q3Q5Criteria) {
  const validForAnalysis = respondents.filter((r) => {
    const a = r.record.answers;
    if (!a) return false;
    if (a.weekly_time_saved === NOT_SURE_CODE) return false;
    return Boolean(a.weekly_time_saved && a.work_output_change && a.quality_change);
  });
  const matching = validForAnalysis.filter(
    (r) =>
      r.record.answers!.weekly_time_saved === criteria.weekly_time_saved &&
      r.record.answers!.work_output_change === criteria.work_output_change &&
      r.record.answers!.quality_change === criteria.quality_change
  );
  return {
    criteria,
    matching_count: matching.length,
    analysis_denominator: validForAnalysis.length,
    matching_rate: fraction(matching.length, validForAnalysis.length),
  };
}

function computeGroupBreakdown(pool: Employee[], recordsByEmployeeId: Map<string, DashboardRecord>, groupBy: GroupByField): GroupBreakdown {
  const groups =
    groupBy === "department"
      ? Array.from(new Set(pool.map((e) => e.department))).sort()
      : (["senior_director", "director", "manager", "ic"] as const);

  const rows: GroupRow[] = [];
  for (const key of groups) {
    const members = pool.filter((e) => (groupBy === "department" ? e.department === key : e.level === key));
    if (members.length === 0) continue;
    const resolved = resolveRecords(members, recordsByEmployeeId);
    const respondents = resolved.filter((r) => r.record.responded);
    const active = respondents.filter((r) => r.record.answers!.ai_usage_frequency !== NEVER_CODE);
    const moreOutput = respondents.filter((r) => MORE_OUTPUT_CODES.includes(r.record.answers!.work_output_change!));
    const known = respondents.filter((r) => r.record.estimatedHoursSaved !== null);
    const frequentRework = respondents.filter((r) => FREQUENT_REWORK_CODES.includes(r.record.answers!.correction_frequency!));

    const barrierCounts = new Map<string, number>();
    for (const r of respondents) {
      for (const b of r.record.answers!.barriers) {
        if (b.option === NO_MAJOR_BARRIERS_CODE) continue;
        barrierCounts.set(b.option, (barrierCounts.get(b.option) ?? 0) + 1);
      }
    }
    let topBarrier: GroupRow["top_barrier"] = null;
    let topCount = 0;
    for (const [code, count] of barrierCounts) {
      if (count > topCount) {
        topCount = count;
        topBarrier = { code, label: labelFor(BARRIERS, code) };
      }
    }

    rows.push({
      key,
      label: groupBy === "department" ? key : LEVEL_LABELS[key as Employee["level"]],
      eligible_employees: members.length,
      respondents: respondents.length,
      adoption_rate: respondents.length ? pct(active.length, respondents.length) : null,
      more_output_rate: respondents.length ? pct(moreOutput.length, respondents.length) : null,
      avg_hours_saved: known.length ? known.reduce((sum, r) => sum + (r.record.estimatedHoursSaved ?? 0), 0) / known.length : null,
      avg_hours_saved_denominator: known.length,
      frequent_rework_rate: respondents.length ? pct(frequentRework.length, respondents.length) : null,
      top_barrier: topBarrier,
    });
  }

  rows.sort((a, b) => (b.adoption_rate ?? -1) - (a.adoption_rate ?? -1));
  return { group_by: groupBy, rows };
}

export function computeDashboardMetrics(
  employees: Employee[],
  records: DashboardRecord[],
  scope: DashboardScope,
  groupBy: GroupByField,
  q3Q5Criteria: Q3Q5Criteria
): DashboardMetricsResponse {
  const recordsByEmployeeId = new Map(records.map((r) => [r.employeeId, r]));
  const pool = resolveScope(employees, scope);
  const resolved = resolveRecords(pool, recordsByEmployeeId);
  const respondents = resolved.filter((r) => r.record.responded);

  const n = respondents.length;
  const active = respondents.filter((r) => r.record.answers!.ai_usage_frequency !== NEVER_CODE);
  const knownHours = respondents.filter((r) => r.record.estimatedHoursSaved !== null);
  const moreOutput = respondents.filter((r) => MORE_OUTPUT_CODES.includes(r.record.answers!.work_output_change!));
  const totalHours = knownHours.reduce((sum, r) => sum + (r.record.estimatedHoursSaved ?? 0), 0);
  const avgHours = knownHours.length ? totalHours / knownHours.length : 0;

  return {
    scope: describeScope(employees, scope),
    coverage: { eligible_employees: pool.length, respondents: n, response_rate: fraction(n, pool.length) },
    population: {
      eligible_employees: pool.length,
      respondents: n,
      non_respondents: pool.length - n,
      active_ai_users: active.length,
    },
    headline_metrics: {
      ai_adoption_rate: { value: fraction(active.length, n), count: active.length, denominator: n },
      avg_weekly_hours_saved: { value: avgHours, denominator: knownHours.length },
      estimated_weekly_hours_saved: totalHours,
      reports_more_output: { value: fraction(moreOutput.length, n), count: moreOutput.length, denominator: n },
    },
    usage_frequency: optionDistribution(respondents, AI_USAGE_FREQUENCY, (r) => r.record.answers!.ai_usage_frequency),
    workflow_value: valueAreaRanking(respondents),
    weekly_time_saved: optionDistribution(respondents, WEEKLY_TIME_SAVED, (r) => r.record.answers!.weekly_time_saved),
    work_output: optionDistribution(respondents, WORK_OUTPUT_CHANGE, (r) => r.record.answers!.work_output_change),
    work_quality: optionDistribution(respondents, QUALITY_CHANGE, (r) => r.record.answers!.quality_change),
    ai_rework_frequency: optionDistribution(respondents, CORRECTION_FREQUENCY, (r) => r.record.answers!.correction_frequency),
    q3_q5_analysis: computeQ3Q5Analysis(respondents, q3Q5Criteria),
    benefits: rankedOptionDistribution(respondents, BIGGEST_BENEFIT, (r) => r.record.answers!.biggest_benefit),
    barriers: multiSelectDistribution(respondents, BARRIERS, (r) => r.record.answers!.barriers),
    group_breakdown: computeGroupBreakdown(pool, recordsByEmployeeId, groupBy),
  };
}

export { BETTER_QUALITY_CODES, MORE_OUTPUT_CODES, FREQUENT_REWORK_CODES, NEVER_CODE, NOT_SURE_CODE, NO_MAJOR_BARRIERS_CODE };
