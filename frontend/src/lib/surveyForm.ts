import {
  NO_MAJOR_BARRIERS_CODE,
  OTHER_CODE,
  type SurveyResponseSubmission,
} from "../types/survey";

export const TOP_VALUE_AREA_RANK_COUNT = 3;

export type SurveyFieldError =
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
  | "barriers_other";

export type FieldErrors = Partial<Record<SurveyFieldError, boolean>>;

export interface SurveyFormState {
  employeeId: string | null;
  aiUsageFrequency: string | null;
  topValueAreaCodes: string[];
  topValueAreaOtherText: string;
  weeklyTimeSaved: string | null;
  workOutputChange: string | null;
  qualityChange: string | null;
  correctionFrequency: string | null;
  biggestBenefit: string | null;
  biggestBenefitOtherText: string;
  barrierCodes: string[];
  barriersOtherText: string;
}

export function toggleBarrierSelection(current: string[], code: string): string[] {
  if (current.includes(code)) return current.filter((c) => c !== code);
  if (code === NO_MAJOR_BARRIERS_CODE) return [code];
  return [...current.filter((c) => c !== NO_MAJOR_BARRIERS_CODE), code];
}

export function validateSurveyForm(state: SurveyFormState): FieldErrors {
  const includesOtherArea = state.topValueAreaCodes.includes(OTHER_CODE);
  const showBiggestBenefitOther = state.biggestBenefit === OTHER_CODE;
  const includesOtherBarrier = state.barrierCodes.includes(OTHER_CODE);
  const hasConflictingBarriers =
    state.barrierCodes.includes(NO_MAJOR_BARRIERS_CODE) && state.barrierCodes.length > 1;
  const hasDuplicateBarriers = hasDuplicates(state.barrierCodes);

  return {
    employee: !state.employeeId,
    ai_usage_frequency: !state.aiUsageFrequency,
    top_value_areas:
      state.topValueAreaCodes.length !== TOP_VALUE_AREA_RANK_COUNT || hasDuplicates(state.topValueAreaCodes),
    top_value_area_other: missingOtherText(includesOtherArea, state.topValueAreaOtherText),
    weekly_time_saved: !state.weeklyTimeSaved,
    work_output_change: !state.workOutputChange,
    quality_change: !state.qualityChange,
    correction_frequency: !state.correctionFrequency,
    biggest_benefit: !state.biggestBenefit,
    biggest_benefit_other: missingOtherText(showBiggestBenefitOther, state.biggestBenefitOtherText),
    barriers: state.barrierCodes.length === 0 || hasConflictingBarriers || hasDuplicateBarriers,
    barriers_other: missingOtherText(includesOtherBarrier, state.barriersOtherText),
  };
}

export function hasSurveyErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function buildSurveyResponseSubmission(state: SurveyFormState): SurveyResponseSubmission {
  const errors = validateSurveyForm(state);
  if (hasSurveyErrors(errors)) {
    throw new Error("Cannot build survey submission from an incomplete form.");
  }

  return {
    employee_id: state.employeeId!,
    answers: {
      ai_usage_frequency: state.aiUsageFrequency,
      top_value_areas: state.topValueAreaCodes.map((area, i) => ({
        area,
        rank: i + 1,
        other_text: otherTextFor(area, state.topValueAreaOtherText),
      })),
      weekly_time_saved: state.weeklyTimeSaved,
      work_output_change: state.workOutputChange,
      quality_change: state.qualityChange,
      correction_frequency: state.correctionFrequency,
      biggest_benefit: {
        option: state.biggestBenefit!,
        other_text: otherTextFor(state.biggestBenefit!, state.biggestBenefitOtherText),
      },
      barriers: state.barrierCodes.map((option) => ({
        option,
        other_text: otherTextFor(option, state.barriersOtherText),
      })),
    },
  };
}

function missingOtherText(selected: boolean, text: string): boolean {
  return selected && !text.trim();
}

function otherTextFor(code: string, text: string): string | null {
  return code === OTHER_CODE ? text.trim() : null;
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}
