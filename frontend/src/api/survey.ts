import type { SurveyResponseSubmission } from "../types/survey";
import { fetchJsonWithNetworkFallback } from "./http";

const LOCAL_FALLBACK_KEY = "demo_survey_responses";

interface SubmittedEmployeeIdsResponse {
  employee_ids: string[];
}

type LocalResponseStore = Record<string, unknown>;

function readLocalResponses(): LocalResponseStore {
  if (!("localStorage" in globalThis)) {
    return {};
  }

  try {
    const stored = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalResponses(responses: LocalResponseStore) {
  localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(responses));
}

export async function fetchSubmittedEmployeeIds(): Promise<string[]> {
  const response = await fetchJsonWithNetworkFallback<SubmittedEmployeeIdsResponse>(
    "/api/survey-responses/submitted-employee-ids",
    () => ({ employee_ids: Object.keys(readLocalResponses()) }),
    "GET /api/survey-responses/submitted-employee-ids failed"
  );
  return response.employee_ids;
}

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
    const stored = readLocalResponses();
    if (Object.prototype.hasOwnProperty.call(stored, submission.employee_id)) {
      throw new Error("Survey response already submitted for this employee.");
    }
    stored[submission.employee_id] = { ...submission, submitted_at: new Date().toISOString() };
    writeLocalResponses(stored);
    return;
  }

  if (!res.ok) {
    throw new Error(`Survey response was rejected by the server (${res.status}).`);
  }
}
