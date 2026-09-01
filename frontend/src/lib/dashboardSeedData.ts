import type { Employee, EmployeeLevel } from "../types/employee";
import {
  AI_USAGE_FREQUENCY,
  BARRIERS,
  BIGGEST_BENEFIT,
  CORRECTION_FREQUENCY,
  QUALITY_CHANGE,
  TOP_VALUE_AREAS,
  WEEKLY_TIME_SAVED,
  WORK_OUTPUT_CHANGE,
  type SurveyAnswers,
} from "../types/survey";

// Temporary client-side stand-in for the ~50-person org and its Q3 2026
// survey responses, used only until /api/metrics exists (see api/metrics.ts).
// This is deliberately a separate, larger population from api/employees.ts's
// ~10-person seed (PRD.md §29.1 acceptance criterion for the survey picker) —
// the executive dashboard needs enough scope/department/level spread for its
// charts to be meaningful, matching the population size the Executive
// Dashboard design was built against. Generation is a deterministic PRNG
// (mulberry32) so the dashboard renders identical demo data on every load.

export interface DashboardRecord {
  employeeId: string;
  responded: boolean;
  answers: SurveyAnswers | null;
  estimatedHoursSaved: number | null;
}

export interface DashboardSeed {
  employees: Employee[];
  records: DashboardRecord[];
}

export const DEPARTMENTS = ["Engineering", "Product", "Operations", "Infrastructure", "Finance", "HR", "Other"];

const Q3_HOURS: Record<string, number | null> = {
  no_noticeable_time_saved: 0,
  less_than_1_hour: 0.5,
  "1_5_hours": 3,
  more_than_5_hours: 8,
  not_sure: null,
};

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(rnd: () => number, weights: [T, number][]): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let r = rnd() * total;
  for (const [value, w] of weights) {
    r -= w;
    if (r <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function codeAt(options: { code: string }[], index: number): string {
  return options[index].code;
}

interface ManagerDef {
  id: string;
  name: string;
  dept: string;
  level: EmployeeLevel;
  managerId: string | null;
}

const MANAGERS: ManagerDef[] = [
  { id: "sd1", name: "Alina Reyes", dept: "Engineering", level: "senior_director", managerId: null },
  { id: "sd2", name: "Marcus Osei", dept: "Operations", level: "senior_director", managerId: null },
  { id: "d1", name: "Priya Raman", dept: "Engineering", level: "director", managerId: "sd1" },
  { id: "d2", name: "Tomas Weber", dept: "Infrastructure", level: "director", managerId: "sd1" },
  { id: "d3", name: "Hana Ito", dept: "Product", level: "director", managerId: "sd2" },
  { id: "d4", name: "Grace Nolan", dept: "Operations", level: "director", managerId: "sd2" },
  { id: "d5", name: "Elias Braun", dept: "Finance", level: "director", managerId: "sd2" },
  { id: "m1", name: "Sam Okafor", dept: "Engineering", level: "manager", managerId: "d1" },
  { id: "m2", name: "Lena Fischer", dept: "Engineering", level: "manager", managerId: "d1" },
  { id: "m3", name: "Dev Malhotra", dept: "Engineering", level: "manager", managerId: "d1" },
  { id: "m4", name: "Ruth Vance", dept: "Infrastructure", level: "manager", managerId: "d2" },
  { id: "m5", name: "Ken Aoyama", dept: "Infrastructure", level: "manager", managerId: "d2" },
  { id: "m6", name: "Iris Blum", dept: "Product", level: "manager", managerId: "d3" },
  { id: "m7", name: "Owen Duarte", dept: "Operations", level: "manager", managerId: "d4" },
  { id: "m8", name: "Mia Cardoso", dept: "Operations", level: "manager", managerId: "d4" },
  { id: "m9", name: "Nadia Roth", dept: "HR", level: "manager", managerId: "d5" },
];

const IC_PLAN: [string, string, number][] = [
  ["m1", "Engineering", 4],
  ["m2", "Engineering", 4],
  ["m3", "Engineering", 3],
  ["m4", "Infrastructure", 2],
  ["m5", "Infrastructure", 2],
  ["m6", "Product", 5],
  ["m7", "Operations", 2],
  ["m8", "Operations", 2],
  ["d5", "Finance", 4],
  ["m9", "HR", 3],
  ["d5", "Other", 3],
];

const FIRST_NAMES = [
  "Jonas", "Amara", "Théo", "Wei", "Sofia", "Noor", "Caleb", "Ines", "Rafael", "Yuki", "Anna", "Omar",
  "Freya", "Diego", "Leila", "Bruno", "Mei", "Ivan", "Clara", "Ravi", "Nina", "Hugo", "Zoe", "Emil",
  "Talia", "Andres", "Sana", "Felix", "Maya", "Otto", "Lucia", "Arjun", "Erin", "Pavel",
];
const LAST_NAMES = [
  "Lund", "Diallo", "Marchand", "Chen", "Ferrer", "Haddad", "Boyd", "Sousa", "Ortiz", "Tanaka",
  "Kovac", "Farah", "Nilsen", "Rojas", "Amin", "Costa", "Zhao", "Petrov", "Nunes", "Iyer",
  "Berg", "Almeida", "Kaminski", "Roth", "Shah", "Vega", "Qureshi", "Bauer", "Singh", "Lange",
  "Moreno", "Nair", "Doyle", "Novak",
];

const DEPT_STRENGTH: Record<string, number> = {
  Engineering: 0.86,
  Infrastructure: 0.74,
  Product: 0.66,
  Operations: 0.44,
  Finance: 0.22,
  HR: 0.3,
  Other: 0.36,
};

const LEVEL_ADJUSTMENT: Record<EmployeeLevel, number> = {
  senior_director: -0.06,
  director: -0.04,
  manager: 0.02,
  ic: 0,
};

const AREA_OTHER_TEXTS = ["Vendor risk reviews", "Board reporting prep", "Incident write-ups"];
const BENEFIT_OTHER_TEXTS = ["Helps me draft in a second language", "Speeds up spreadsheet modelling"];
const BARRIER_OTHER_TEXTS = ["Procurement has not approved a licence", "Our data cannot leave the on-prem network"];

function areaWeight(code: string, isEngLeaning: boolean): number {
  switch (code) {
    case "implementation":
      return isEngLeaning ? 22 : 8;
    case "troubleshooting":
      return isEngLeaning ? 18 : 6;
    case "research":
      return 16;
    case "administration":
      return 14;
    case "review":
      return 12;
    case "other":
      return 1.6;
    default:
      return 9;
  }
}

function benefitWeight(code: string, sc: number): number {
  switch (code) {
    case "saves_time":
      return 30;
    case "reduces_repetitive_work":
      return 22;
    case "helps_get_unstuck":
      return 16 + sc * 8;
    case "improves_work_quality":
      return 8 + sc * 6;
    case "supports_better_decisions":
      return 7;
    case "helps_explore_ideas":
      return 5;
    case "helps_learn_faster":
      return 8;
    default:
      return 2;
  }
}

function barrierWeight(code: string, dept: string, sc: number): number {
  switch (code) {
    case "tool_access":
      return dept === "Finance" || dept === "HR" ? 20 : 6;
    case "lack_of_training":
      return 22 - sc * 8;
    case "reliability_concerns":
      return 16;
    case "review_effort":
      return 13;
    case "security_privacy_concerns":
      return dept === "Finance" ? 18 : 7;
    case "lack_of_internal_context":
      return 18;
    case "poor_workflow_fit":
      return 10;
    default:
      return 2.5;
  }
}

let cachedSeed: DashboardSeed | null = null;

export function buildDashboardSeed(): DashboardSeed {
  if (cachedSeed) return cachedSeed;

  const rnd = mulberry32(20260903);

  interface Draft {
    employee: Employee;
    dept: string;
    level: EmployeeLevel;
    u: number;
    responded: boolean;
  }

  const drafts: Draft[] = [];
  for (const m of MANAGERS) {
    drafts.push({
      employee: { id: m.id, name: m.name, department: m.dept, level: m.level, manager_id: m.managerId },
      dept: m.dept,
      level: m.level,
      u: 0,
      responded: false,
    });
  }
  let i = 0;
  for (const [managerId, dept, count] of IC_PLAN) {
    for (let k = 0; k < count; k++) {
      const id = "ic" + i;
      drafts.push({
        employee: {
          id,
          name: `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`,
          department: dept,
          level: "ic",
          manager_id: managerId,
        },
        dept,
        level: "ic",
        u: 0,
        responded: false,
      });
      i++;
    }
  }

  for (const d of drafts) d.u = rnd();
  const order = drafts.slice().sort((a, b) => (a.u + DEPT_STRENGTH[a.dept] * 0.6) - (b.u + DEPT_STRENGTH[b.dept] * 0.6));
  order.forEach((d, idx) => {
    d.responded = idx >= 10;
  });

  const records: DashboardRecord[] = [];

  for (const d of drafts) {
    if (!d.responded) {
      records.push({ employeeId: d.employee.id, responded: false, answers: null, estimatedHoursSaved: null });
      continue;
    }

    const sc = Math.max(0.05, Math.min(1.05, DEPT_STRENGTH[d.dept] + LEVEL_ADJUSTMENT[d.level] + (rnd() - 0.5) * 0.44));
    const neverP = Math.max(0.04, Math.min(0.55, 0.58 - DEPT_STRENGTH[d.dept] * 0.52));
    const q1 =
      rnd() < neverP
        ? codeAt(AI_USAGE_FREQUENCY, 0)
        : codeAt(AI_USAGE_FREQUENCY, sc < 0.5 ? 1 : sc < 0.72 ? 2 : sc < 0.92 ? 3 : 4);
    const activeUser = q1 !== codeAt(AI_USAGE_FREQUENCY, 0);

    let q3: string;
    if (!activeUser) q3 = codeAt(WEEKLY_TIME_SAVED, 0);
    else if (rnd() < 0.09) q3 = codeAt(WEEKLY_TIME_SAVED, 4);
    else
      q3 = weightedPick(rnd, [
        [codeAt(WEEKLY_TIME_SAVED, 0), Math.max(1, 14 - sc * 12)],
        [codeAt(WEEKLY_TIME_SAVED, 1), 20 - sc * 8],
        [codeAt(WEEKLY_TIME_SAVED, 2), 16 + sc * 12],
        [codeAt(WEEKLY_TIME_SAVED, 3), Math.max(1, sc * 26 - 6)],
      ]);
    const hours = Q3_HOURS[q3];

    const q4 = !activeUser
      ? codeAt(WORK_OUTPUT_CHANGE, 2)
      : weightedPick(rnd, [
          [codeAt(WORK_OUTPUT_CHANGE, 0), 1.5],
          [codeAt(WORK_OUTPUT_CHANGE, 1), 3],
          [codeAt(WORK_OUTPUT_CHANGE, 2), 26 - sc * 16],
          [codeAt(WORK_OUTPUT_CHANGE, 3), 16 + sc * 8],
          [codeAt(WORK_OUTPUT_CHANGE, 4), Math.max(1, sc * 22 - 5)],
        ]);
    const q5 = !activeUser
      ? codeAt(QUALITY_CHANGE, 2)
      : weightedPick(rnd, [
          [codeAt(QUALITY_CHANGE, 0), 1],
          [codeAt(QUALITY_CHANGE, 1), 4],
          [codeAt(QUALITY_CHANGE, 2), 24 - sc * 14],
          [codeAt(QUALITY_CHANGE, 3), 18 + sc * 6],
          [codeAt(QUALITY_CHANGE, 4), Math.max(1, sc * 18 - 4)],
        ]);
    const q6 = !activeUser
      ? codeAt(CORRECTION_FREQUENCY, 0)
      : weightedPick(rnd, [
          [codeAt(CORRECTION_FREQUENCY, 0), 3 + sc * 4],
          [codeAt(CORRECTION_FREQUENCY, 1), 8 + sc * 8],
          [codeAt(CORRECTION_FREQUENCY, 2), 22],
          [codeAt(CORRECTION_FREQUENCY, 3), 16 - sc * 7],
          [codeAt(CORRECTION_FREQUENCY, 4), Math.max(1, 8 - sc * 6)],
        ]);

    const isEngLeaning = d.dept === "Engineering" || d.dept === "Infrastructure";
    const areaPool = TOP_VALUE_AREAS.map((o) => [o.code, areaWeight(o.code, isEngLeaning)] as [string, number]);
    const chosenAreas: string[] = [];
    const remaining = areaPool.slice();
    for (let r = 0; r < 3; r++) {
      const c = weightedPick(rnd, remaining);
      chosenAreas.push(c);
      remaining.splice(remaining.findIndex(([code]) => code === c), 1);
    }
    const areaOtherText = chosenAreas.includes("other")
      ? AREA_OTHER_TEXTS[Math.floor(rnd() * AREA_OTHER_TEXTS.length)]
      : null;

    const q7 = !activeUser
      ? "other"
      : weightedPick(
          rnd,
          BIGGEST_BENEFIT.map((o) => [o.code, benefitWeight(o.code, sc)] as [string, number])
        );
    const benefitOtherText = q7 === "other" ? BENEFIT_OTHER_TEXTS[Math.floor(rnd() * BENEFIT_OTHER_TEXTS.length)] : null;

    let barrierCodes: string[];
    let barrierOtherText: string | null = null;
    if (rnd() < 0.06 + sc * 0.22) {
      barrierCodes = ["no_major_barriers"];
    } else {
      const candidates = BARRIERS.filter((o) => o.code !== "no_major_barriers").map(
        (o) => [o.code, barrierWeight(o.code, d.dept, sc)] as [string, number]
      );
      const count = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.22 ? 1 : 0);
      const set: string[] = [];
      const pool = candidates.slice();
      for (let r = 0; r < count && pool.length; r++) {
        const c = weightedPick(rnd, pool);
        set.push(c);
        pool.splice(pool.findIndex(([code]) => code === c), 1);
      }
      barrierCodes = set;
      if (set.includes("other")) barrierOtherText = BARRIER_OTHER_TEXTS[Math.floor(rnd() * BARRIER_OTHER_TEXTS.length)];
    }

    const answers: SurveyAnswers = {
      ai_usage_frequency: q1,
      top_value_areas: chosenAreas.map((area, idx) => ({
        area,
        rank: idx + 1,
        other_text: area === "other" ? areaOtherText : null,
      })),
      weekly_time_saved: q3,
      work_output_change: q4,
      quality_change: q5,
      correction_frequency: q6,
      biggest_benefit: { option: q7, other_text: benefitOtherText },
      barriers: barrierCodes.map((option) => ({
        option,
        other_text: option === "other" ? barrierOtherText : null,
      })),
    };

    records.push({ employeeId: d.employee.id, responded: true, answers, estimatedHoursSaved: hours });
  }

  cachedSeed = { employees: drafts.map((d) => d.employee), records };
  return cachedSeed;
}
