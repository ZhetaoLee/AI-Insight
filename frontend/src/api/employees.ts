import type { Employee } from "../types/employee";

// ~10 seeded employees across multiple hierarchy branches, matching the
// scale described in ADR.md and PRD.md §29.1. Used as a local fallback so
// the survey page is fully demoable before the FastAPI backend exists.
const SEED_EMPLOYEES: Employee[] = [
  { id: "emp_101", name: "Priya Nair", department: "Engineering", level: "senior_director", manager_id: null },
  { id: "emp_102", name: "Sarah Lee", department: "Engineering", level: "director", manager_id: "emp_101" },
  { id: "emp_103", name: "David Kim", department: "Engineering", level: "manager", manager_id: "emp_102" },
  { id: "emp_104", name: "Alice Chen", department: "Engineering", level: "ic", manager_id: "emp_103" },
  { id: "emp_105", name: "Marcus Webb", department: "Engineering", level: "ic", manager_id: "emp_103" },
  { id: "emp_106", name: "Elena Ruiz", department: "Product", level: "director", manager_id: "emp_101" },
  { id: "emp_107", name: "Noah Patel", department: "Product", level: "manager", manager_id: "emp_106" },
  { id: "emp_108", name: "Jade Thompson", department: "Product", level: "ic", manager_id: "emp_107" },
  { id: "emp_109", name: "Omar Farouk", department: "Operations", level: "manager", manager_id: "emp_101" },
  { id: "emp_110", name: "Grace Liu", department: "Operations", level: "ic", manager_id: "emp_109" },
];

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch("/api/employees");
    if (!res.ok) throw new Error(`GET /api/employees failed: ${res.status}`);
    return (await res.json()) as Employee[];
  } catch {
    return SEED_EMPLOYEES;
  }
}
