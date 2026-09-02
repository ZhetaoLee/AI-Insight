import type { SurveyResponseSubmission } from "../types/survey";

const LOCAL_FALLBACK_KEY = "demo_survey_responses";

// Falls back to localStorage when the backend isn't reachable yet, so the
// survey page's submit → confirmation flow is demoable standalone.
export async function submitSurveyResponse(submission: SurveyResponseSubmission): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/survey-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
  } catch {
    const stored = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) ?? "{}");
    stored[submission.employee_id] = { ...submission, submitted_at: new Date().toISOString() };
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(stored));
    return;
  }

  if (!res.ok) {
    throw new Error(`Survey response was rejected by the server (${res.status}).`);
  }
}
