import type { CSSProperties } from "react";
import type { SurveyOption } from "../../types/survey";

interface SingleSelectQuestionProps {
  legend: string;
  options: SurveyOption[];
  value: string | null;
  onChange: (code: string) => void;
  error?: boolean;
  errorLabel?: string;
  layout?: "row" | "grid";
}

export function SingleSelectQuestion({
  legend,
  options,
  value,
  onChange,
  error,
  errorLabel = "Select one",
  layout = "row",
}: SingleSelectQuestionProps) {
  return (
    <div className="field">
      <div className="field-label">
        {legend}
        <span className="required-mark">*</span>
        {error ? <span className="error-inline">{errorLabel}</span> : null}
      </div>
      <div className={layout === "grid" ? "option-grid" : "option-row"}>
        {options.map((option) => {
          const isOn = value === option.code;
          return (
            <button
              key={option.code}
              type="button"
              className="radio-option"
              onClick={() => onChange(option.code)}
              aria-pressed={isOn}
              style={
                {
                  "--dot-border": isOn ? "var(--color-accent)" : "var(--color-idle)",
                  "--dot-fill": isOn ? "var(--color-accent)" : "transparent",
                } as CSSProperties
              }
            >
              <span className="radio-dot-outer">
                <span className="radio-dot-inner" />
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
