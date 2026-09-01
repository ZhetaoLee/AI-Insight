export interface SurveyOption {
  code: string;
  label: string;
}

export interface RankedArea {
  area: string;
  rank: number;
  other_text: string | null;
}

export interface OptionWithOtherText {
  option: string;
  other_text: string | null;
}

export interface SurveyAnswers {
  ai_usage_frequency: string | null;
  top_value_areas: RankedArea[];
  weekly_time_saved: string | null;
  work_output_change: string | null;
  quality_change: string | null;
  correction_frequency: string | null;
  biggest_benefit: OptionWithOtherText | null;
  barriers: OptionWithOtherText[];
}

export const EMPTY_ANSWERS: SurveyAnswers = {
  ai_usage_frequency: null,
  top_value_areas: [],
  weekly_time_saved: null,
  work_output_change: null,
  quality_change: null,
  correction_frequency: null,
  biggest_benefit: null,
  barriers: [],
};

export interface SurveyResponseSubmission {
  employee_id: string;
  answers: SurveyAnswers;
}

// Canonical question text, option lists, and answer codes follow Questions.md
// and PRD.md §8 exactly (both must stay in sync per CLAUDE.md); the §22
// Survey Response example fixes the nested shapes for ranked/"other" answers.

export const AI_USAGE_FREQUENCY: SurveyOption[] = [
  { code: "never", label: "Never" },
  { code: "few_times_month", label: "A few times per month" },
  { code: "few_times_week", label: "A few times per week" },
  { code: "daily", label: "Daily" },
  { code: "multiple_times_day", label: "Multiple times per day" },
];

export const TOP_VALUE_AREAS: SurveyOption[] = [
  { code: "planning", label: "Planning" },
  { code: "research", label: "Research" },
  { code: "design", label: "Design" },
  { code: "implementation", label: "Implementation" },
  { code: "testing", label: "Testing" },
  { code: "troubleshooting", label: "Troubleshooting" },
  { code: "review", label: "Review" },
  { code: "communication", label: "Communication" },
  { code: "management", label: "Management" },
  { code: "administration", label: "Administration" },
  { code: "other", label: "Other" },
];

export const WEEKLY_TIME_SAVED: SurveyOption[] = [
  { code: "no_noticeable_time_saved", label: "No noticeable time saved" },
  { code: "less_than_1_hour", label: "Less than 1 hour" },
  { code: "1_5_hours", label: "1-5 hours" },
  { code: "more_than_5_hours", label: "More than 5 hours" },
  { code: "not_sure", label: "Not sure" },
];

export const WORK_OUTPUT_CHANGE: SurveyOption[] = [
  { code: "much_less", label: "Much less" },
  { code: "slightly_less", label: "Slightly less" },
  { code: "same", label: "Same" },
  { code: "slightly_more", label: "Slightly more" },
  { code: "significantly_more", label: "Significantly more" },
];

export const QUALITY_CHANGE: SurveyOption[] = [
  { code: "much_worse", label: "Much worse" },
  { code: "slightly_worse", label: "Slightly worse" },
  { code: "no_meaningful_change", label: "No meaningful change" },
  { code: "slightly_better", label: "Slightly better" },
  { code: "much_better", label: "Much better" },
];

export const CORRECTION_FREQUENCY: SurveyOption[] = [
  { code: "almost_never", label: "Almost never" },
  { code: "rarely", label: "Rarely" },
  { code: "sometimes", label: "Sometimes" },
  { code: "often", label: "Often" },
  { code: "almost_always", label: "Almost always" },
];

export const BIGGEST_BENEFIT: SurveyOption[] = [
  { code: "saves_time", label: "Saves time" },
  { code: "reduces_repetitive_work", label: "Reduces repetitive work" },
  { code: "helps_get_unstuck", label: "Helps me get unstuck" },
  { code: "improves_work_quality", label: "Improves work quality" },
  { code: "supports_better_decisions", label: "Supports better decisions" },
  { code: "helps_explore_ideas", label: "Helps explore ideas" },
  { code: "helps_learn_faster", label: "Helps me learn faster" },
  { code: "other", label: "Other" },
];

export const BARRIERS: SurveyOption[] = [
  { code: "tool_access", label: "Tool access" },
  { code: "lack_of_training", label: "Lack of training" },
  { code: "reliability_concerns", label: "Reliability concerns" },
  { code: "review_effort", label: "Review effort" },
  { code: "security_privacy_concerns", label: "Security and privacy concerns" },
  { code: "lack_of_internal_context", label: "Lack of internal context" },
  { code: "poor_workflow_fit", label: "Poor workflow fit" },
  { code: "no_major_barriers", label: "No major barriers" },
  { code: "other", label: "Other" },
];
