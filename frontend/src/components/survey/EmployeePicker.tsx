import { LEVEL_LABELS, type Employee } from "../../types/employee";

interface EmployeePickerProps {
  employees: Employee[];
  contextEmployees?: Employee[];
  loading: boolean;
  value: string | null;
  onChange: (employeeId: string) => void;
  onFocus?: () => void;
  error?: boolean;
}

export function EmployeePicker({
  employees,
  contextEmployees = employees,
  loading,
  value,
  onChange,
  onFocus,
  error,
}: EmployeePickerProps) {
  const selected = contextEmployees.find((e) => e.id === value) ?? null;
  const hasAvailableEmployees = employees.length > 0;

  return (
    <div className="field">
      <label className="field-label" htmlFor="employee-picker">
        Your name
        <span className="required-mark">*</span>
        {error ? <span className="error-inline">Select your name</span> : null}
      </label>
      <select
        id="employee-picker"
        className="employee-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        disabled={loading || !hasAvailableEmployees}
      >
        <option value="" disabled>
          {loading ? "Loading employees…" : hasAvailableEmployees ? "Select your name" : "No employees remaining"}
        </option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="employee-context">
          <strong>{LEVEL_LABELS[selected.level]}</strong>
        </div>
      ) : null}
    </div>
  );
}
