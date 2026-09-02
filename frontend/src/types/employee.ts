export type EmployeeLevel = "senior_director" | "director" | "manager" | "ic";

export interface Employee {
  id: string;
  name: string;
  level: EmployeeLevel;
  manager_id: string | null;
}

export const LEVEL_LABELS: Record<EmployeeLevel, string> = {
  senior_director: "Senior Director",
  director: "Director",
  manager: "Manager",
  ic: "Individual Contributor",
};
