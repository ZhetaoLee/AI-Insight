import type { Employee } from "../types/employee";

function buildChildrenMap(employees: Employee[]): Map<string, Employee[]> {
  const map = new Map<string, Employee[]>();
  for (const employee of employees) {
    if (!employee.manager_id) continue;
    const list = map.get(employee.manager_id) ?? [];
    list.push(employee);
    map.set(employee.manager_id, list);
  }
  return map;
}

export function resolveDashboardManagerId(employees: Employee[], currentManagerId: string): string {
  const selectedLeader = employees.find((employee) => employee.id === currentManagerId && employee.level !== "ic");
  if (selectedLeader) return currentManagerId;

  return employees.find((employee) => employee.level !== "ic")?.id ?? currentManagerId;
}

export function subtreeOf(employees: Employee[], managerId: string): Employee[] {
  const root = employees.find((employee) => employee.id === managerId);
  if (!root) return [];

  const children = buildChildrenMap(employees);
  const subtree: Employee[] = [root];
  const walk = (id: string) => {
    for (const child of children.get(id) ?? []) {
      subtree.push(child);
      walk(child.id);
    }
  };

  walk(managerId);
  return subtree;
}
