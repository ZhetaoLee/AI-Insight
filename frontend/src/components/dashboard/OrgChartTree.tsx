import { buildChildrenMap, subtreeOf } from "../../lib/dashboardScope";
import { LEVEL_LABELS, type Employee } from "../../types/employee";

export type HierarchyScope = { type: "org" } | { type: "manager"; id: string };

interface OrgChartTreeProps {
  employees: Employee[];
  selectedScope: HierarchyScope;
  onSelect: (scope: HierarchyScope) => void;
}

export function OrgChartTree({ employees, selectedScope, onSelect }: OrgChartTreeProps) {
  const childrenByManager = buildChildrenMap(employees);
  const roots = employees.filter((employee) => employee.manager_id === null);

  function renderEmployee(employee: Employee): JSX.Element {
    const children = childrenByManager.get(employee.id) ?? [];
    const isLeaf = employee.level === "ic";
    const isSelected = selectedScope.type === "manager" && selectedScope.id === employee.id;
    const reportCount = isLeaf ? 0 : Math.max(subtreeOf(employees, employee.id).length - 1, 0);

    return (
      <li className="org-tree-item" key={employee.id}>
        {isLeaf ? (
          <div className="org-tree-node org-tree-leaf">
            <span className="org-tree-dot" aria-hidden="true" />
            <span className="org-tree-copy">
              <span className="org-tree-name">{employee.name}</span>
              <span className="org-tree-meta">{LEVEL_LABELS[employee.level]}</span>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className={isSelected ? "org-tree-node org-tree-button selected" : "org-tree-node org-tree-button"}
            onClick={() => onSelect({ type: "manager", id: employee.id })}
          >
            <span className="org-tree-dot" aria-hidden="true" />
            <span className="org-tree-copy">
              <span className="org-tree-name">{employee.name}</span>
              <span className="org-tree-meta">
                {LEVEL_LABELS[employee.level]} - {reportCount} reports
              </span>
            </span>
          </button>
        )}
        {children.length > 0 && <ul className="org-tree-branch">{children.map((child) => renderEmployee(child))}</ul>}
      </li>
    );
  }

  return (
    <div className="org-tree" aria-label="Organization hierarchy">
      <button
        type="button"
        className={selectedScope.type === "org" ? "org-tree-root selected" : "org-tree-root"}
        onClick={() => onSelect({ type: "org" })}
      >
        <span className="org-tree-name">Organization</span>
        <span className="org-tree-meta">{employees.length} employees</span>
      </button>
      <ul className="org-tree-branch org-tree-top">{roots.map((employee) => renderEmployee(employee))}</ul>
    </div>
  );
}
