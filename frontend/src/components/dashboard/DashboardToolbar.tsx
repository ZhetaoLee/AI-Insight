import { LEVEL_LABELS, type EmployeeLevel } from "../../types/employee";

const LEVEL_ORDER: EmployeeLevel[] = ["senior_director", "director", "manager", "ic"];
type ScopeType = "org" | "manager" | "level";

interface DashboardToolbarProps {
  scopeType: ScopeType;
  level: EmployeeLevel;
  hierarchyLabel: string;
  onScopeTypeChange: (type: ScopeType) => void;
  onLevelChange: (level: EmployeeLevel) => void;
}

export function DashboardToolbar({ scopeType, level, hierarchyLabel, onScopeTypeChange, onLevelChange }: DashboardToolbarProps) {
  return (
    <div className="dashboard-toolbar">
      <div className="toolbar-mode-row">
        <div className="toggle-group">
          <button
            type="button"
            className={scopeType === "level" ? "toggle-btn" : "toggle-btn active"}
            onClick={() => onScopeTypeChange("org")}
          >
            {hierarchyLabel}
          </button>
          <button
            type="button"
            className={scopeType === "level" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => onScopeTypeChange("level")}
          >
            Level
          </button>
        </div>

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
    </div>
  );
}
