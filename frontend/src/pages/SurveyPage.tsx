import { useEffect, useState } from "react";
import { fetchEmployees } from "../api/employees";
import { submitSurveyResponse } from "../api/survey";
import { EmployeePicker } from "../components/survey/EmployeePicker";
import { RankQuestion } from "../components/survey/RankQuestion";
import { SingleSelectQuestion } from "../components/survey/SingleSelectQuestion";
import type { Employee } from "../types/employee";
import {
  AI_USAGE_FREQUENCY,
  BIGGEST_BARRIER,
  BIGGEST_BENEFIT,
  CORRECTION_FREQUENCY,
  EMPTY_ANSWERS,
  MOST_IMPACTED_WORKFLOW,
  QUALITY_CHANGE,
  TOP_VALUE_AREAS,
  WEEKLY_TIME_SAVED,
  WEEKLY_WORK_ITEMS,
  WORK_OUTPUT_CHANGE,
  type SurveyAnswers,
} from "../types/survey";
import "./SurveyPage.css";

const TOP_VALUE_AREA_RANK_COUNT = 3;

type FieldErrors = Partial<Record<"employee" | keyof SurveyAnswers, boolean>>;

export function SurveyPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const [topValueAreaCodes, setTopValueAreaCodes] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees()
      .then(setEmployees)
      .finally(() => setLoadingEmployees(false));
  }, []);

  function setAnswer<K extends keyof SurveyAnswers>(key: K, value: SurveyAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  function toggleTopValueArea(code: string) {
    setTopValueAreaCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= TOP_VALUE_AREA_RANK_COUNT) return prev;
      return [...prev, code];
    });
    setErrors((prev) => ({ ...prev, top_value_areas: false }));
  }

  function resetForm() {
    setEmployeeId(null);
    setAnswers(EMPTY_ANSWERS);
    setTopValueAreaCodes([]);
    setErrors({});
    setSubmitted(false);
  }

  async function handleSubmit() {
    const nextErrors: FieldErrors = {
      employee: !employeeId,
      ai_usage_frequency: !answers.ai_usage_frequency,
      top_value_areas: topValueAreaCodes.length !== TOP_VALUE_AREA_RANK_COUNT,
      weekly_time_saved: !answers.weekly_time_saved,
      work_output_change: !answers.work_output_change,
      quality_change: !answers.quality_change,
      correction_frequency: !answers.correction_frequency,
      biggest_benefit: !answers.biggest_benefit,
      biggest_barrier: !answers.biggest_barrier,
      weekly_work_items: !answers.weekly_work_items,
      most_impacted_workflow: !answers.most_impacted_workflow,
    };
    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    if (hasErrors || !employeeId) return;

    setSubmitting(true);
    try {
      await submitSurveyResponse({
        employee_id: employeeId,
        answers: {
          ...answers,
          top_value_areas: topValueAreaCodes.map((area, i) => ({ area, rank: i + 1 })),
        },
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const rankedAreas = topValueAreaCodes.map((area, i) => ({ area, rank: i + 1 }));

  return (
    <div className="survey-shell">
      <div className="survey-card">
        <div className="survey-head">
          <div className="survey-head-row">
            <h1 className="survey-title">AI productivity survey</h1>
            <span className="survey-meta">10 questions · about 5 minutes</span>
          </div>
          <p className="survey-subtitle">
            Responses are reported in aggregate and used to prioritise AI tooling, training, and investment.{" "}
            <span style={{ color: "var(--color-muted-2)" }}>*required fields</span>
          </p>
        </div>

        {submitted && (
          <div className="confirmation-banner">
            <div>
              <div className="confirmation-title">Your response is recorded</div>
              <div className="confirmation-sub">Aggregate findings will be shared with all participants.</div>
            </div>
            <button type="button" className="confirmation-reset" onClick={resetForm}>
              Start another
            </button>
          </div>
        )}

        <div className="survey-group">
          <h2 className="group-title">About you</h2>
          <p className="group-subtitle">Used to route your response to the correct hierarchy.</p>
          <EmployeePicker
            employees={employees}
            loading={loadingEmployees}
            value={employeeId}
            onChange={(id) => {
              setEmployeeId(id);
              setErrors((prev) => ({ ...prev, employee: false }));
            }}
            error={errors.employee}
          />
        </div>

        <div className="survey-group">
          <h2 className="group-title">Adoption</h2>
          <p className="group-subtitle">How AI shows up in your day-to-day work today.</p>
          <SingleSelectQuestion
            legend="How often do you currently use AI for work?"
            options={AI_USAGE_FREQUENCY}
            value={answers.ai_usage_frequency}
            onChange={(v) => setAnswer("ai_usage_frequency", v)}
            error={errors.ai_usage_frequency}
          />
          <RankQuestion
            legend="Rank the top 3 areas where AI provides the most value in your workflow."
            options={TOP_VALUE_AREAS}
            ranked={rankedAreas}
            onToggle={toggleTopValueArea}
            requiredCount={TOP_VALUE_AREA_RANK_COUNT}
            error={errors.top_value_areas}
          />
        </div>

        <div className="survey-group">
          <h2 className="group-title">Impact</h2>
          <p className="group-subtitle">Time saved, throughput, and quality of output.</p>
          <SingleSelectQuestion
            legend="In a typical week, approximately how much work time does AI save you?"
            options={WEEKLY_TIME_SAVED}
            value={answers.weekly_time_saved}
            onChange={(v) => setAnswer("weekly_time_saved", v)}
            error={errors.weekly_time_saved}
          />
          <SingleSelectQuestion
            legend="Compared with working without AI, how has AI affected the amount of work you can complete in the same amount of time?"
            options={WORK_OUTPUT_CHANGE}
            value={answers.work_output_change}
            onChange={(v) => setAnswer("work_output_change", v)}
            error={errors.work_output_change}
          />
          <SingleSelectQuestion
            legend="How has AI affected the quality of your work?"
            options={QUALITY_CHANGE}
            value={answers.quality_change}
            onChange={(v) => setAnswer("quality_change", v)}
            error={errors.quality_change}
          />
          <SingleSelectQuestion
            legend="How often do you need to substantially correct or rewrite AI-generated output before using it?"
            options={CORRECTION_FREQUENCY}
            value={answers.correction_frequency}
            onChange={(v) => setAnswer("correction_frequency", v)}
            error={errors.correction_frequency}
          />
        </div>

        <div className="survey-group">
          <h2 className="group-title">Barriers and opportunities</h2>
          <p className="group-subtitle">What's in the way, and where AI has become load-bearing.</p>
          <SingleSelectQuestion
            legend="What is the biggest benefit AI provides in your day-to-day work?"
            options={BIGGEST_BENEFIT}
            value={answers.biggest_benefit}
            onChange={(v) => setAnswer("biggest_benefit", v)}
            error={errors.biggest_benefit}
            layout="grid"
          />
          <SingleSelectQuestion
            legend="What is the biggest barrier preventing you from getting more value from AI?"
            options={BIGGEST_BARRIER}
            value={answers.biggest_barrier}
            onChange={(v) => setAnswer("biggest_barrier", v)}
            error={errors.biggest_barrier}
            layout="grid"
          />
          <SingleSelectQuestion
            legend="In a typical week, approximately how many meaningful work items does AI help you complete or move forward?"
            options={WEEKLY_WORK_ITEMS}
            value={answers.weekly_work_items}
            onChange={(v) => setAnswer("weekly_work_items", v)}
            error={errors.weekly_work_items}
          />
          <SingleSelectQuestion
            legend="If AI tools were unavailable tomorrow, which part of your work would be most negatively affected?"
            options={MOST_IMPACTED_WORKFLOW}
            value={answers.most_impacted_workflow}
            onChange={(v) => setAnswer("most_impacted_workflow", v)}
            error={errors.most_impacted_workflow}
            layout="grid"
          />
        </div>

        <div className="survey-footer">
          {hasErrors && <div className="footer-error">Some required questions are still unanswered.</div>}
          <button type="button" className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit response"}
          </button>
        </div>
      </div>
    </div>
  );
}
