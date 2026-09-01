import { useEffect, useState } from "react";
import { fetchEmployees } from "../api/employees";
import { submitSurveyResponse } from "../api/survey";
import { EmployeePicker } from "../components/survey/EmployeePicker";
import { MultiSelectQuestion } from "../components/survey/MultiSelectQuestion";
import { OtherTextInput } from "../components/survey/OtherTextInput";
import { RankQuestion } from "../components/survey/RankQuestion";
import { SingleSelectQuestion } from "../components/survey/SingleSelectQuestion";
import type { Employee } from "../types/employee";
import {
  AI_USAGE_FREQUENCY,
  BARRIERS,
  BIGGEST_BENEFIT,
  CORRECTION_FREQUENCY,
  QUALITY_CHANGE,
  TOP_VALUE_AREAS,
  WEEKLY_TIME_SAVED,
  WORK_OUTPUT_CHANGE,
} from "../types/survey";
import "./SurveyPage.css";

const TOP_VALUE_AREA_RANK_COUNT = 3;
const OTHER_CODE = "other";

type FieldErrors = Partial<
  Record<
    | "employee"
    | "ai_usage_frequency"
    | "top_value_areas"
    | "top_value_area_other"
    | "weekly_time_saved"
    | "work_output_change"
    | "quality_change"
    | "correction_frequency"
    | "biggest_benefit"
    | "biggest_benefit_other"
    | "barriers"
    | "barriers_other",
    boolean
  >
>;

export function SurveyPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [aiUsageFrequency, setAiUsageFrequency] = useState<string | null>(null);
  const [topValueAreaCodes, setTopValueAreaCodes] = useState<string[]>([]);
  const [topValueAreaOtherText, setTopValueAreaOtherText] = useState("");
  const [weeklyTimeSaved, setWeeklyTimeSaved] = useState<string | null>(null);
  const [workOutputChange, setWorkOutputChange] = useState<string | null>(null);
  const [qualityChange, setQualityChange] = useState<string | null>(null);
  const [correctionFrequency, setCorrectionFrequency] = useState<string | null>(null);
  const [biggestBenefit, setBiggestBenefit] = useState<string | null>(null);
  const [biggestBenefitOtherText, setBiggestBenefitOtherText] = useState("");
  const [barrierCodes, setBarrierCodes] = useState<string[]>([]);
  const [barriersOtherText, setBarriersOtherText] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees()
      .then(setEmployees)
      .finally(() => setLoadingEmployees(false));
  }, []);

  function toggleTopValueArea(code: string) {
    setTopValueAreaCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= TOP_VALUE_AREA_RANK_COUNT) return prev;
      return [...prev, code];
    });
    setErrors((prev) => ({ ...prev, top_value_areas: false, top_value_area_other: false }));
  }

  function toggleBarrier(code: string) {
    setBarrierCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    setErrors((prev) => ({ ...prev, barriers: false, barriers_other: false }));
  }

  function resetForm() {
    setEmployeeId(null);
    setAiUsageFrequency(null);
    setTopValueAreaCodes([]);
    setTopValueAreaOtherText("");
    setWeeklyTimeSaved(null);
    setWorkOutputChange(null);
    setQualityChange(null);
    setCorrectionFrequency(null);
    setBiggestBenefit(null);
    setBiggestBenefitOtherText("");
    setBarrierCodes([]);
    setBarriersOtherText("");
    setErrors({});
    setSubmitted(false);
  }

  const includesOtherArea = topValueAreaCodes.includes(OTHER_CODE);
  const showBiggestBenefitOther = biggestBenefit === OTHER_CODE;
  const includesOtherBarrier = barrierCodes.includes(OTHER_CODE);

  async function handleSubmit() {
    const nextErrors: FieldErrors = {
      employee: !employeeId,
      ai_usage_frequency: !aiUsageFrequency,
      top_value_areas: topValueAreaCodes.length !== TOP_VALUE_AREA_RANK_COUNT,
      top_value_area_other: includesOtherArea && !topValueAreaOtherText.trim(),
      weekly_time_saved: !weeklyTimeSaved,
      work_output_change: !workOutputChange,
      quality_change: !qualityChange,
      correction_frequency: !correctionFrequency,
      biggest_benefit: !biggestBenefit,
      biggest_benefit_other: showBiggestBenefitOther && !biggestBenefitOtherText.trim(),
      barriers: barrierCodes.length === 0,
      barriers_other: includesOtherBarrier && !barriersOtherText.trim(),
    };
    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    if (hasErrors || !employeeId || !aiUsageFrequency || !weeklyTimeSaved || !workOutputChange || !qualityChange || !correctionFrequency || !biggestBenefit) {
      return;
    }

    setSubmitting(true);
    try {
      await submitSurveyResponse({
        employee_id: employeeId,
        answers: {
          ai_usage_frequency: aiUsageFrequency,
          top_value_areas: topValueAreaCodes.map((area, i) => ({
            area,
            rank: i + 1,
            other_text: area === OTHER_CODE ? topValueAreaOtherText.trim() : null,
          })),
          weekly_time_saved: weeklyTimeSaved,
          work_output_change: workOutputChange,
          quality_change: qualityChange,
          correction_frequency: correctionFrequency,
          biggest_benefit: {
            option: biggestBenefit,
            other_text: showBiggestBenefitOther ? biggestBenefitOtherText.trim() : null,
          },
          barriers: barrierCodes.map((option) => ({
            option,
            other_text: option === OTHER_CODE ? barriersOtherText.trim() : null,
          })),
        },
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const rankedAreas = topValueAreaCodes.map((area, i) => ({ area, rank: i + 1, other_text: null }));

  return (
    <div className="survey-shell">
      <div className="survey-card">
        <div className="survey-head">
          <div className="survey-head-row">
            <h1 className="survey-title">AI productivity survey</h1>
            <span className="survey-meta">8 questions</span>
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
          <h2 className="group-title">Employee context</h2>
          <p className="group-subtitle">Select your name to load your level.</p>
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
          <h2 className="group-title">Usage and value</h2>
          <p className="group-subtitle">How often you use AI, where it helps most, and time saved.</p>

          <SingleSelectQuestion
            legend="Q1. How often do you currently use AI for work?"
            options={AI_USAGE_FREQUENCY}
            value={aiUsageFrequency}
            onChange={(v) => {
              setAiUsageFrequency(v);
              setErrors((prev) => ({ ...prev, ai_usage_frequency: false }));
            }}
            error={errors.ai_usage_frequency}
          />

          <div className="field">
            <RankQuestion
              legend="Q2. Rank the top 3 areas where AI provides the most value in your workflow."
              options={TOP_VALUE_AREAS}
              ranked={rankedAreas}
              onToggle={toggleTopValueArea}
              requiredCount={TOP_VALUE_AREA_RANK_COUNT}
              error={errors.top_value_areas}
            />
            {includesOtherArea && (
              <OtherTextInput
                value={topValueAreaOtherText}
                onChange={(v) => {
                  setTopValueAreaOtherText(v);
                  setErrors((prev) => ({ ...prev, top_value_area_other: false }));
                }}
                error={errors.top_value_area_other}
              />
            )}
          </div>

          <SingleSelectQuestion
            legend="Q3. In a typical week, approximately how much work time does AI save you?"
            options={WEEKLY_TIME_SAVED}
            value={weeklyTimeSaved}
            onChange={(v) => {
              setWeeklyTimeSaved(v);
              setErrors((prev) => ({ ...prev, weekly_time_saved: false }));
            }}
            error={errors.weekly_time_saved}
          />
        </div>

        <div className="survey-group">
          <h2 className="group-title">Impact on your work</h2>
          <p className="group-subtitle">Output, quality, and how much correction AI output needs.</p>

          <SingleSelectQuestion
            legend="Q4. Compared with working without AI, how has AI affected the amount of work you can complete in the same amount of time?"
            options={WORK_OUTPUT_CHANGE}
            value={workOutputChange}
            onChange={(v) => {
              setWorkOutputChange(v);
              setErrors((prev) => ({ ...prev, work_output_change: false }));
            }}
            error={errors.work_output_change}
            layout="likert"
          />
          <SingleSelectQuestion
            legend="Q5. How has AI affected the quality of your work?"
            options={QUALITY_CHANGE}
            value={qualityChange}
            onChange={(v) => {
              setQualityChange(v);
              setErrors((prev) => ({ ...prev, quality_change: false }));
            }}
            error={errors.quality_change}
            layout="likert"
          />
          <SingleSelectQuestion
            legend="Q6. How often do you need to substantially correct or rewrite AI-generated output before using it?"
            options={CORRECTION_FREQUENCY}
            value={correctionFrequency}
            onChange={(v) => {
              setCorrectionFrequency(v);
              setErrors((prev) => ({ ...prev, correction_frequency: false }));
            }}
            error={errors.correction_frequency}
            layout="likert"
          />
        </div>

        <div className="survey-group">
          <h2 className="group-title">Benefits and barriers</h2>
          <p className="group-subtitle">The single biggest benefit, and what limits effective use.</p>

          <div className="field">
            <SingleSelectQuestion
              legend="Q7. What is the biggest benefit AI provides in your day-to-day work?"
              options={BIGGEST_BENEFIT}
              value={biggestBenefit}
              onChange={(v) => {
                setBiggestBenefit(v);
                setErrors((prev) => ({ ...prev, biggest_benefit: false }));
              }}
              error={errors.biggest_benefit}
              layout="grid"
            />
            {showBiggestBenefitOther && (
              <OtherTextInput
                value={biggestBenefitOtherText}
                onChange={(v) => {
                  setBiggestBenefitOtherText(v);
                  setErrors((prev) => ({ ...prev, biggest_benefit_other: false }));
                }}
                error={errors.biggest_benefit_other}
              />
            )}
          </div>

          <div className="field">
            <MultiSelectQuestion
              legend="Q8. What barriers limit your effective use of AI at work?"
              hint="Select all that apply."
              options={BARRIERS}
              value={barrierCodes}
              onToggle={toggleBarrier}
              error={errors.barriers}
            />
            {includesOtherBarrier && (
              <OtherTextInput
                value={barriersOtherText}
                onChange={(v) => {
                  setBarriersOtherText(v);
                  setErrors((prev) => ({ ...prev, barriers_other: false }));
                }}
                error={errors.barriers_other}
              />
            )}
          </div>
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
