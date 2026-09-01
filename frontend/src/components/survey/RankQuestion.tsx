import type { CSSProperties } from "react";
import type { RankedArea, SurveyOption } from "../../types/survey";

interface RankQuestionProps {
  legend: string;
  options: SurveyOption[];
  ranked: RankedArea[];
  onToggle: (code: string) => void;
  requiredCount: number;
  error?: boolean;
}

export function RankQuestion({ legend, options, ranked, onToggle, requiredCount, error }: RankQuestionProps) {
  const rankOf = (code: string) => ranked.find((r) => r.area === code)?.rank;

  return (
    <div className="field">
      <div className="field-label" style={{ marginBottom: 4 }}>
        {legend}
        <span className="required-mark">*</span>
        {error ? <span className="error-inline">{`Rank exactly ${requiredCount}`}</span> : null}
      </div>
      <div className="rank-hint">Click in order, most valuable first. Click again to remove.</div>
      <div className="rank-list">
        {options.map((option) => {
          const rank = rankOf(option.code);
          const isOn = rank !== undefined;
          return (
            <button
              key={option.code}
              type="button"
              className="rank-option"
              onClick={() => onToggle(option.code)}
              aria-pressed={isOn}
              style={
                {
                  "--dot-border": isOn ? "var(--color-accent)" : "var(--color-idle)",
                  "--dot-fill": isOn ? "var(--color-accent)" : "transparent",
                  "--rank-fg": isOn ? "#ffffff" : "var(--color-muted-5)",
                  "--rank-bg": isOn ? "var(--color-accent-wash)" : "#ffffff",
                } as CSSProperties
              }
            >
              <span className="rank-badge">{isOn ? rank : ""}</span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
