import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { fetchOrgDirectory } from "../../api/metrics";
import { resolveDashboardManagerId } from "../../lib/dashboardScope";
import { LEVEL_LABELS, type Employee, type EmployeeLevel } from "../../types/employee";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import type { HierarchyScope } from "../dashboard/OrgChartTree";
import "./AppLayout.css";

export type DashboardScopeType = "org" | "manager" | "level";

export interface DashboardScopeContext {
  scopeType: DashboardScopeType;
  managerId: string;
  level: EmployeeLevel;
  orgEmployees: Employee[];
  hierarchyLabel: string;
  setScopeType: (type: DashboardScopeType) => void;
  setManagerId: (id: string) => void;
  setLevel: (level: EmployeeLevel) => void;
}

export function AppLayout() {
  const location = useLocation();
  const [orgEmployees, setOrgEmployees] = useState<Employee[]>([]);
  const [scopeType, setScopeType] = useState<DashboardScopeType>("org");
  const [managerId, setManagerId] = useState("d1");
  const [level, setLevel] = useState<EmployeeLevel>("ic");

  useEffect(() => {
    fetchOrgDirectory().then(setOrgEmployees);
  }, []);

  useEffect(() => {
    const nextManagerId = resolveDashboardManagerId(orgEmployees, managerId);
    if (nextManagerId !== managerId) setManagerId(nextManagerId);
  }, [managerId, orgEmployees]);

  const hierarchyScope: HierarchyScope = scopeType === "manager" ? { type: "manager", id: managerId } : { type: "org" };
  const selectedHierarchyEmployee =
    hierarchyScope.type === "manager" ? orgEmployees.find((employee) => employee.id === hierarchyScope.id) : undefined;
  const hierarchyLabel = selectedHierarchyEmployee
    ? `${LEVEL_LABELS[selectedHierarchyEmployee.level]} Dashboard`
    : "Organization Dashboard";

  function selectHierarchyScope(scope: HierarchyScope) {
    if (scope.type === "org") {
      setScopeType("org");
      return;
    }

    setManagerId(scope.id);
    setScopeType("manager");
  }

  const outletContext: DashboardScopeContext = {
    scopeType,
    managerId,
    level,
    orgEmployees,
    hierarchyLabel,
    setScopeType,
    setManagerId,
    setLevel,
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <DashboardSidebar
          hierarchy={
            location.pathname === "/dashboard"
              ? { employees: orgEmployees, selectedScope: hierarchyScope, onSelect: selectHierarchyScope }
              : undefined
          }
        />
        <main className="app-main">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
