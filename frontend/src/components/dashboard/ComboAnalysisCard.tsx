import { QUALITY_CHANGE, WEEKLY_TIME_SAVED, WORK_OUTPUT_CHANGE } from "../../types/survey";
import type { Q3Q5Analysis, Q3Q5Criteria } from "../../types/metrics";

interface ComboAnalysisCardProps {
  analysis: Q3Q5Analysis;
  onChange: (criteria: Q3Q5Criteria) => void;
}

export function ComboAnalysisCard({ analysis, onChange }: ComboAnalysisCardProps) {
  const ratePct = Math.round(analysis.matching_rate * 100);
  const deg = Math.round(ratePct * 3.6);
  const note =
    analysis.criteria.weekly_time_saved === "not_sure"
      ? "Denominator: respondents with valid answers to all three questions."
      : 'Denominator excludes "Not sure" on Q3 and anyone missing an answer to Q3, Q4, or Q5.';

  const selectors = [
    { label: "Q3 · Weekly time saved", options: WEEKLY_TIME_SAVED, value: analysis.criteria.weekly_time_saved, key: "weekly_time_saved" as const },
    { label: "Q4 · Work output impact", options: WORK_OUTPUT_CHANGE, value: analysis.criteria.work_output_change, key: "work_output_change" as const },
    { label: "Q5 · Work quality impact", options: QUALITY_CHANGE, value: analysis.criteria.quality_change, key: "quality_change" as const },
  ];

  return (
    <div className="card combo-card">
      <div>
        <div className="card-title">Dynamic Q3–Q5 analysis</div>
        <div className="card-eyebrow">Combine one option from each question</div>
      </div>
      <div className="combo-selectors">
        {selectors.map((s) => (
          <div className="combo-selector" key={s.key}>
            <div className="combo-selector-label">{s.label}</div>
            <select
              className="combo-select"
              value={s.value}
              onChange={(e) => onChange({ ...analysis.criteria, [s.key]: e.target.value })}
            >
              {s.options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="combo-result">
        <div style={{ flex: 1 }}>
          <div className="combo-rate">{ratePct}%</div>
          <div className="combo-matching">
            {analysis.matching_count} matching of {analysis.analysis_denominator} with valid answers
          </div>
        </div>
        <div className="combo-donut" style={{ background: `conic-gradient(#1f9d7c ${deg}deg, #e6eaed 0)` }}>
          <div className="combo-donut-hole" />
        </div>
      </div>
      <div className="card-hint">{note}</div>
    </div>
  );
}
