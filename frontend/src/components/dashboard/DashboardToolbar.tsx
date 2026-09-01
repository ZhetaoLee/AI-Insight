import { LEVEL_LABELS, type Employee, type EmployeeLevel } from "../../types/employee";
import { subtreeOf } from "../../lib/metricsEngine";

const LEVEL_ORDER: EmployeeLevel[] = ["senior_director", "director", "manager", "ic"];

interface DashboardToolbarProps {
  scopeType: "org" | "manager" | "level";
  managerId: string;
  level: EmployeeLevel;
  orgEmployees: Employee[];
  onScopeTypeChange: (type: "org" | "manager" | "level") => void;
  onManagerChange: (id: string) => void;
  onLevelChange: (level: EmployeeLevel) => void;
}

export function DashboardToolbar({
  scopeType,
  managerId,
  level,
  orgEmployees,
  onScopeTypeChange,
  onManagerChange,
  onLevelChange,
}: DashboardToolbarProps) {
  const leaders = orgEmployees.filter((e) => e.level !== "ic");

  return (
    <div className="dashboard-toolbar">
      <div className="toolbar-search">
        <div className="toolbar-search-dot" />
        <div className="toolbar-search-text">Search metric, team, or person</div>
      </div>

      <div className="toggle-group">
        {(["org", "manager", "level"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={scopeType === t ? "toggle-btn active" : "toggle-btn"}
            onClick={() => onScopeTypeChange(t)}
          >
            {t === "org" ? "Organization" : t === "manager" ? "Manager" : "Level"}
          </button>
        ))}
      </div>

      {scopeType === "manager" && (
        <select className="toolbar-picker" value={managerId} onChange={(e) => onManagerChange(e.target.value)}>
          {leaders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {LEVEL_LABELS[p.level]} · {p.department} ({subtreeOf(orgEmployees, p.id).length - 1} reports)
            </option>
          ))}
        </select>
      )}

      {scopeType === "level" && (
        <select className="toolbar-picker" value={level} onChange={(e) => onLevelChange(e.target.value as EmployeeLevel)}>
          {LEVEL_ORDER.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
