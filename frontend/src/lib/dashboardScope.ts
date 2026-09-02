import type { Employee } from "../types/employee";

export function resolveDashboardManagerId(employees: Employee[], currentManagerId: string): string {
  const selectedLeader = employees.find((employee) => employee.id === currentManagerId && employee.level !== "ic");
  if (selectedLeader) return currentManagerId;

  return employees.find((employee) => employee.level !== "ic")?.id ?? currentManagerId;
}
