import type { CSSProperties } from "react";
import type { SurveyOption } from "../../types/survey";

interface MultiSelectQuestionProps {
  legend: string;
  hint?: string;
  options: SurveyOption[];
  value: string[];
  onToggle: (code: string) => void;
  error?: boolean;
  errorLabel?: string;
}

export function MultiSelectQuestion({
  legend,
  hint,
  options,
  value,
  onToggle,
  error,
  errorLabel = "Select at least one",
}: MultiSelectQuestionProps) {
  return (
    <div className="field">
      <div className="field-label" style={{ marginBottom: hint ? 4 : 12 }}>
        {legend}
        <span className="required-mark">*</span>
        {error ? <span className="error-inline">{errorLabel}</span> : null}
      </div>
      {hint ? <div className="rank-hint">{hint}</div> : null}
      <div className="option-grid">
        {options.map((option) => {
          const isOn = value.includes(option.code);
          return (
            <button
              key={option.code}
              type="button"
              className="checkbox-option"
              onClick={() => onToggle(option.code)}
              aria-pressed={isOn}
              style={
                {
                  "--dot-border": isOn ? "var(--color-accent)" : "var(--color-idle)",
                  "--dot-fill": isOn ? "var(--color-accent)" : "transparent",
                } as CSSProperties
              }
            >
              <span className="checkbox-box" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
