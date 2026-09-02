import { fetchJsonWithNetworkFallback } from "./http";
import type { Employee } from "../types/employee";

// ~10 seeded employees across multiple hierarchy branches, matching the
// scale described in ADR.md and PRD.md §29.1. Used as a local fallback so
// the survey page is fully demoable before the FastAPI backend exists.
export const SEED_EMPLOYEES: Employee[] = [
  { id: "emp_101", name: "Priya Nair", level: "senior_director", manager_id: null },
  { id: "emp_102", name: "Sarah Lee", level: "director", manager_id: "emp_101" },
  { id: "emp_103", name: "David Kim", level: "manager", manager_id: "emp_102" },
  { id: "emp_104", name: "Alice Chen", level: "ic", manager_id: "emp_103" },
  { id: "emp_105", name: "Marcus Webb", level: "ic", manager_id: "emp_103" },
  { id: "emp_106", name: "Elena Ruiz", level: "director", manager_id: "emp_101" },
  { id: "emp_107", name: "Noah Patel", level: "manager", manager_id: "emp_106" },
  { id: "emp_108", name: "Jade Thompson", level: "ic", manager_id: "emp_107" },
  { id: "emp_109", name: "Omar Farouk", level: "manager", manager_id: "emp_106" },
  { id: "emp_110", name: "Grace Liu", level: "ic", manager_id: "emp_109" },
];

export async function fetchEmployees(): Promise<Employee[]> {
  return fetchJsonWithNetworkFallback("/api/employees", () => SEED_EMPLOYEES, "GET /api/employees failed");
}
