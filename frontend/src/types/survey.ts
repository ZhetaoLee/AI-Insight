export interface SurveyOption {
  code: string;
  label: string;
}

export interface TopValueArea {
  area: string;
  rank: number;
}

export interface SurveyAnswers {
  ai_usage_frequency: string | null;
  top_value_areas: TopValueArea[];
  weekly_time_saved: string | null;
  work_output_change: string | null;
  quality_change: string | null;
  correction_frequency: string | null;
  biggest_benefit: string | null;
  biggest_barrier: string | null;
  weekly_work_items: string | null;
  most_impacted_workflow: string | null;
}

export const EMPTY_ANSWERS: SurveyAnswers = {
  ai_usage_frequency: null,
  top_value_areas: [],
  weekly_time_saved: null,
  work_output_change: null,
  quality_change: null,
  correction_frequency: null,
  biggest_benefit: null,
  biggest_barrier: null,
  weekly_work_items: null,
  most_impacted_workflow: null,
};

export interface SurveyResponseSubmission {
  employee_id: string;
  answers: SurveyAnswers;
}

// Option sets and codes follow PRD.md §8 (question text/options) and the
// answer codes implied by the §22 Survey Response example and §24 dashboard
// breakdowns (e.g. usage_frequency keys, "3_5_hours", "sometimes").

export const AI_USAGE_FREQUENCY: SurveyOption[] = [
  { code: "never", label: "Never" },
  { code: "few_times_month", label: "A few times per month" },
  { code: "few_times_week", label: "A few times per week" },
  { code: "daily", label: "Daily" },
  { code: "multiple_times_day", label: "Multiple times per day" },
];

export const TOP_VALUE_AREAS: SurveyOption[] = [
  { code: "planning_requirements", label: "Planning / requirements" },
  { code: "design_solution_development", label: "Design / solution development" },
  { code: "implementation_creation", label: "Implementation / creation" },
  { code: "testing_validation", label: "Testing / validation" },
  { code: "troubleshooting_debugging", label: "Troubleshooting / debugging" },
  { code: "review_quality_assurance", label: "Review / quality assurance" },
  { code: "documentation", label: "Documentation" },
  { code: "research_analysis", label: "Research / analysis" },
  { code: "communication", label: "Communication" },
  { code: "administrative_repetitive_work", label: "Administrative / repetitive work" },
  { code: "other", label: "Other" },
];

export const WEEKLY_TIME_SAVED: SurveyOption[] = [
  { code: "no_noticeable_time_saved", label: "No noticeable time saved" },
  { code: "less_than_1_hour", label: "Less than 1 hour" },
  { code: "1_2_hours", label: "1–2 hours" },
  { code: "3_5_hours", label: "3–5 hours" },
  { code: "6_10_hours", label: "6–10 hours" },
  { code: "more_than_10_hours", label: "More than 10 hours" },
  { code: "not_sure", label: "Not sure" },
];

export const WORK_OUTPUT_CHANGE: SurveyOption[] = [
  { code: "much_less", label: "Much less" },
  { code: "slightly_less", label: "Slightly less" },
  { code: "about_the_same", label: "About the same" },
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
  { code: "reduces_repetitive_manual_work", label: "Reduces repetitive/manual work" },
  { code: "helps_get_unstuck_faster", label: "Helps me get unstuck or solve problems faster" },
  { code: "improves_quality_of_work", label: "Improves the quality of my work" },
  { code: "helps_explore_alternatives", label: "Helps me explore more alternatives / ideas" },
  { code: "helps_work_independently", label: "Helps me work more independently" },
  { code: "helps_learn_faster", label: "Helps me learn unfamiliar topics faster" },
  { code: "other", label: "Other" },
];

export const BIGGEST_BARRIER: SurveyOption[] = [
  { code: "lack_of_access", label: "Lack of access to the right AI tools" },
  { code: "need_more_training", label: "Need more training or guidance" },
  { code: "output_not_reliable", label: "AI output is not reliable enough" },
  { code: "too_much_review_time", label: "Too much time is required to review or correct AI output" },
  { code: "security_privacy_restrictions", label: "Security / privacy restrictions" },
  { code: "ai_lacks_context", label: "AI lacks enough context about our systems or projects" },
  { code: "does_not_fit_workflow", label: "AI does not fit well into my workflow" },
  { code: "no_major_barriers", label: "No major barriers" },
  { code: "other", label: "Other" },
];

export const WEEKLY_WORK_ITEMS: SurveyOption[] = [
  { code: "0", label: "0" },
  { code: "1_2", label: "1–2" },
  { code: "3_5", label: "3–5" },
  { code: "6_10", label: "6–10" },
  { code: "10_plus", label: "10+" },
  { code: "not_sure", label: "Not sure" },
];

export const MOST_IMPACTED_WORKFLOW: SurveyOption[] = [
  { code: "planning_understanding_requirements", label: "Planning / understanding requirements" },
  { code: "coding", label: "Coding" },
  { code: "testing", label: "Testing" },
  { code: "debugging", label: "Debugging" },
  { code: "code_review", label: "Code review" },
  { code: "documentation", label: "Documentation" },
  { code: "research", label: "Research" },
  { code: "communication", label: "Communication" },
  { code: "little_or_no_impact", label: "Little or no impact" },
];
