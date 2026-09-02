# Product Requirements Document — AI Productivity Insights

## 1. Overview

### Product Name

**AI Productivity Insights**

### Purpose

AI Productivity Insights is an internal application for collecting employee feedback on how AI affects day-to-day work and translating those responses into actionable executive-level metrics.

The system serves two primary users:

1. **Employees**, who submit a short AI productivity survey.
2. **Leadership**, who view aggregated insights across the organization and management hierarchy.

The goal is not simply to measure whether employees use AI. The system should help leadership understand:

- Whether AI adoption is meaningful and sustained.
- Whether AI saves measurable work time.
- Whether AI increases employee throughput.
- Whether productivity gains are achieved without reducing quality.
- Which workflows receive the most value from AI.
- Where teams are becoming dependent on AI.
- What barriers prevent employees from receiving more value.
- How AI impact differs across managers, organizational levels, and the full organization.

---

# 2. Problem Statement

The real organization has approximately 50 employees arranged in a management hierarchy:

```text
Senior Director
      ↓
Director
      ↓
Manager
      ↓
Individual Contributor
```

Leadership currently lacks a systematic way to understand how AI affects employee productivity.

For this take-home build, seed exactly 10 mock employees that represent this hierarchy across multiple branches. The seeded dataset should be small enough to review quickly while still proving manager, level, and org-wide rollups.

Raw AI usage statistics alone provide limited signal.

For example:

> "80% of employees use AI"

does not tell leadership whether AI:

- saves meaningful time,
- increases output,
- improves or reduces quality,
- creates excessive rework,
- provides value in important workflows,
- or is blocked by tooling, training, reliability, security, or missing organizational context.

The system therefore needs to convert employee survey responses into transparent, explainable leadership metrics.

---

# 3. Product Goals

The system should enable leadership to answer five core questions.

### 3.1 Are employees meaningfully adopting AI?

Measure sustained AI usage rather than occasional experimentation.

### 3.2 Is AI actually improving productivity?

Measure both perceived output improvement and estimated time savings.

### 3.3 Are productivity gains quality-adjusted?

Identify whether employees are completing more work without sacrificing quality or creating excessive rework.

### 3.4 Where does AI create the most value?

Identify workflows such as implementation, research, debugging, planning, testing, and documentation where AI provides the greatest benefit.

### 3.5 What should leadership do next?

Surface barriers such as:

- insufficient training,
- poor AI reliability,
- missing internal context,
- security constraints,
- workflow integration problems,
- insufficient tool access.

---

# 4. Non-Goals

The first version will not attempt to:

- Measure employee performance.
- Rank individual employees.
- Replace objective engineering or business KPIs.
- Calculate financial ROI from salary information.
- Validate self-reported productivity against external systems.
- Provide authentication or authorization.
- Integrate directly with Jira, GitHub, Slack, or other work-management systems.
- Perform statistical causal inference proving that AI caused productivity improvements.

Survey results are directional organizational signals rather than employee performance measurements.

---

# 5. Users

## 5.1 Employee

An employee can:

- Select their name from the seeded employee list.
- View their level and manager.
- Complete the survey.
- Submit their response.

No login is required for the take-home implementation.

## 5.2 Executive / Leadership User

A leadership user can:

- View organization-wide AI productivity metrics.
- View metrics for a specific manager's organizational subtree.
- Compare results by organizational level.
- View response coverage.
- Understand which workflows receive the most AI value.
- Understand the largest barriers to additional AI adoption.

---

# 6. Information Architecture

The frontend is one React application with two primary workflows.

```text
AI Productivity Insights
│
├── Executive Dashboard
│
└── Submit Survey
```

Recommended routes:

```text
/dashboard
/survey
```

The dashboard is the primary landing experience.

Navigation:

```text
Persistent sidebar

Dashboard
Survey
```

The sidebar should be shared by `/dashboard` and `/survey`; the two destinations
should not also be duplicated in a separate top navigation bar.

---

# 7. Survey Submission Experience

## 7.1 Employee Selection

The employee first selects their name.

Example:

```text
Your Name

[Alice Chen ▼]

Individual Contributor
Manager: David Kim
```

Level and manager are retrieved from the employee record and are not editable.

This prevents inconsistent organizational data from being submitted through the survey.

---

# 8. Survey Questions

The survey options must match `docs/Questions.md`. Level appears in that question set, but the application should populate it from the selected employee record and display it as read-only context. Employees should not manually submit level or manager values.

## Q1. AI Usage Frequency

**How often do you currently use AI for work?**

Options:

- Never
- A few times per month
- A few times per week
- Daily
- Multiple times per day

Purpose:

Measure AI adoption intensity.

---

## Q2. Top AI Value Areas

**Rank the top 3 areas where AI provides the most value in your workflow.**

Rank #1 through #3.

Options:

- Planning
- Research
- Design
- Implementation
- Testing
- Troubleshooting
- Review
- Communication
- Management
- Administration
- Other, please specify [text]

Purpose:

Identify where AI creates the greatest workflow value.

---

## Q3. Weekly Time Saved

**In a typical week, approximately how much work time does AI save you?**

Options:

- No noticeable time saved
- Less than 1 hour
- 1-5 hours
- More than 5 hours
- Not sure

Purpose:

Estimate measurable employee capacity created by AI.

---

## Q4. Work Output

**Compared with working without AI, how has AI affected the amount of work you can complete in the same amount of time?**

Options:

- Much less
- Slightly less
- Same
- Slightly more
- Significantly more

Purpose:

Measure perceived throughput impact.

---

## Q5. Work Quality

**How has AI affected the quality of your work?**

Options:

- Much worse
- Slightly worse
- No meaningful change
- Slightly better
- Much better

Purpose:

Determine whether productivity gains come with positive or negative quality effects.

---

## Q6. AI Rework

**How often do you need to substantially correct or rewrite AI-generated output before using it?**

Options:

- Almost never
- Rarely
- Sometimes
- Often
- Almost always

Purpose:

Measure hidden productivity cost caused by AI rework.

---

## Q7. Primary AI Benefit

**What is the biggest benefit AI provides in your day-to-day work?**

Options:

- Saves time
- Reduces repetitive work
- Helps me get unstuck
- Improves work quality
- Supports better decisions
- Helps explore ideas
- Helps me learn faster
- Other, please specify [text]

Purpose:

Explain why AI creates value.

---

## Q8. Barriers to Effective AI Use

**What barriers limit your effective use of AI at work?**

Options:

- Tool access
- Lack of training
- Reliability concerns
- Review effort
- Security and privacy concerns
- Lack of internal context
- Poor workflow fit
- No major barriers
- Other, please specify [text]

Purpose:

Identify leadership actions that could unlock additional value.

---

# 9. Leadership Metrics

The backend derives leadership metrics from raw survey responses.

Metric definitions must remain transparent and explainable.

All metrics are returned for one resolved scope:

- `org`: every seeded employee.
- `manager`: the selected manager and every descendant in that manager's subtree.
- `level`: every employee with the requested level.

Department is intentionally absent from this version's employee data model and is not a supported rolled-up metrics scope.

---

## 9.1 Response Coverage

### Formula

```text
Respondents / Eligible Employees
```

Take-home seed example:

```text
8 / 10 employees
80% response coverage
```

### Leadership Signal

Indicates how representative the dashboard results are.

A productivity metric should never be presented without response coverage.

## 9.2 Basic Population Metrics

Every metrics response should include simple counts so leadership can judge scale before interpreting percentages:

```text
eligible_employees = number of employees in resolved scope
respondents = employees in scope with a submitted response
non_respondents = eligible_employees - respondents
response_rate = respondents / eligible_employees
active_ai_users = respondents whose Q1 is not Never
```

For level-scoped metrics, also return the selected level. For manager-scoped metrics, return the selected manager and descendant employee count.

---

# 10. AI Adoption Rate

### Questions Used

Q1

### Definition

An employee is considered an active AI user when:

```text
AI usage frequency != Never
```

### Formula

```text
Active AI Users
---------------
Respondents
```

### Leadership Signal

Shows how many respondents use AI at least occasionally.

---

# 11. Weekly Time Saved Distribution

Q3 response bands are shown as selected, without converting the bands into
approximate hour values.

Example distribution:

```text
No noticeable time saved  10%
Less than 1 hour          20%
1-5 hours                 45%
More than 5 hours         15%
Not sure                  10%
```

The dashboard must not calculate average weekly hours saved or estimated
organizational capacity from Q3 midpoint assumptions.

---

# 12. Survey Distributions and Analysis

Questions:

- Q2: Where AI creates value.
- Q7: Why AI creates value.
- Q8: What barriers limit effective AI use.
- Q3-Q5: Dynamic combined analysis across time saved, output, and quality.

These dimensions should remain separate rather than being reduced into one opaque score.

---

## 12.1 AI Value Area Ranking

Q2 is displayed as a horizontal stacked bar chart with separate segments for rank 1, rank 2, and rank 3.

```text
Rank #1 → dark blue
Rank #2 → medium blue
Rank #3 → light blue
```

Sort categories by total votes, then rank 1 votes, then rank 2 votes, then rank 3 votes. The `Other` bar should display as `Other`, with submitted free-text details shown on hover.

---

## 12.2 Primary Benefits

Q7 is displayed as a horizontal bar chart sorted by count descending.

For each option, calculate `option_count / respondents_who_answered_Q7`. The `Other` bar should display as `Other`, with submitted free-text details shown on hover.

---

## 12.3 Barriers

Q8 is multiple choice and displayed as a horizontal bar chart sorted by count descending.

```text
barrier_percentage = barrier_count / respondents_who_answered_Q8
```

One respondent may contribute to multiple barrier counts. `No major barriers` should be mutually exclusive with other choices. The `Other` bar should display as `Other`, with submitted free-text details shown on hover.

## 12.4 Dynamic Q3-Q5 Analysis

Leadership can combine selected values from Q3, Q4, and Q5 to find matching respondents.

```text
matching_count = respondents matching all selected criteria
analysis_denominator = respondents with valid answers for all selected questions
matching_rate = matching_count / analysis_denominator
```

If Q3 is part of the analysis, exclude `Not sure` from the denominator.

---

# 13. Dashboard Requirements

The Executive Dashboard should prioritize insight over raw survey data.

---

## 13.1 Header Metrics

Standalone header cards for the initial dashboard:

```text
Employees
Respondents
Active AI Users
```

These cards should display plain counts for the selected dashboard scope. Each
card should include a hover-triggered help icon explaining the count. Rates such
as response rate and AI adoption rate remain available in the dashboard's
coverage, chart, analysis, and records sections rather than as cluttered top-row
cards.

---

## 13.2 Response Coverage

Display:

```text
8 / 10 employees responded
80% response coverage
```

Coverage should remain visible so leadership can judge metric reliability.

---

## 13.3 Usage Frequency Chart

Display the distribution of Q1.

Example:

```text
Multiple times/day     26%
Daily                  38%
Few times/week         19%
Few times/month        10%
Never                   7%
```

---

## 13.4 AI Value Area Ranking

Display Q2 as a horizontal stacked bar chart with rank 1, rank 2, and rank 3 segments.

---

## 13.5 Weekly Time Saved

Display Q3 as a bar chart with percentages. Do not display an average estimated
weekly time-saved metric.

---

## 13.6 Work Output, Quality, and Rework

Display Q4, Q5, and Q6 as bar charts with percentages.

---

## 13.7 Dynamic Q3-Q5 Analysis

Allow leadership to choose one value from Q3, Q4, and Q5 and show the matching count, denominator, and matching rate.

---

## 13.8 Primary Benefits

Display Q7 primary benefits.

Recommended visualization:

Horizontal bar chart sorted from highest to lowest.

---

## 13.9 Barrier Distribution

Display Q8 barriers.

Recommended visualization:

Horizontal bar chart sorted from highest to lowest.

---

## 13.10 Level Comparison

Leadership should be able to compare organizational groups.

Example:

```text
Level                   Adoption   Avg Time Saved   Response Rate

Senior Director         100%       4.8h             100%
Director                80%        4.1h             83%
Manager                 75%        3.7h             80%
Individual Contributor  67%        3.2h             70%
```

---

# 18. Dashboard Scope Filtering

The dashboard must support:

```text
Organization
Level
Manager
```

Examples:

```text
Organization
```

returns all employees.

```text
Level = Individual Contributor (scope_id=ic)
```

returns all Individual Contributor responses.

```text
Manager = David Kim
```

returns David Kim and all descendants under David Kim.

---

# 19. Hierarchy Requirements

The organizational hierarchy must support:

```text
Senior Director
      │
    Director
      │
    Manager
      │
Individual Contributor
```

The seeded implementation must include exactly 10 employees. Use a realistic hierarchy with multiple branches, for example:

```text
1 Senior Director
2 Directors
3 Managers
4 Individual Contributors
```

Example:

```text
Michael Wang — Senior Director
│
├── Sarah Lee — Director
│   │
│   ├── David Kim — Manager
│   │   ├── Alice Chen — Individual Contributor
│   │   └── Bob Smith — Individual Contributor
│   │
│   └── Emily Zhang — Manager
│       └── Chris Patel — Individual Contributor
│
└── Priya Raman — Director
    │
    └── Noah Patel — Manager
        └── Grace Liu — Individual Contributor
```

If leadership selects Sarah Lee, metrics must include:

```text
Sarah Lee
David Kim
Alice Chen
Bob Smith
Emily Zhang
Chris Patel
```

not only Sarah's direct reports.

If leadership selects Michael Wang, metrics must include all 10 seeded employees.

---

# 20. Aggregation Correctness

Metrics must always be calculated from individual employee responses in the resolved scope.

The system must never calculate a higher-level percentage by averaging manager percentages.

Example:

```text
Manager A:
2 employees
100% adoption

Manager B:
8 employees
50% adoption
```

Incorrect:

```text
(100% + 50%) / 2 = 75%
```

Correct:

```text
6 adopters / 10 employees = 60%
```

Therefore:

```text
Hierarchy determines population
        ↓
Retrieve individual responses
        ↓
Derive individual signals
        ↓
Aggregate signals
```

## 20.1 Scope Resolution

```text
org scope
→ all employee IDs

manager scope
→ selected manager ID + all descendant employee IDs

level scope
→ all employee IDs where employee.level equals requested level
```

Only employees in the resolved scope are eligible for that metrics response.

## 20.2 Denominators

Use explicit denominators for each metric:

```text
Coverage metrics
→ eligible employees in scope

Survey-answer distributions
→ respondents who answered that question

Dynamic Q3-Q5 analysis
→ respondents with valid answers for the selected criteria
```

Do not treat `Not sure` as zero. Exclude it from the Dynamic Q3-Q5 analysis
denominator and return the valid denominator.

## 20.3 Question-Level Aggregations

The metrics endpoint should aggregate every question from `docs/Questions.md`:

```text
Q1 usage frequency
→ count and percentage by option

Q2 ranked value areas
→ horizontal stacked bar with rank 1, rank 2, and rank 3 counts

Q3 weekly time saved
→ distribution by option, average estimated hours, total estimated hours

Q4 work output
→ distribution by option and positive-output count

Q5 work quality
→ distribution by option and quality-preserved count

Q6 correction/rework frequency
→ distribution by option and manageable-rework count

Q7 biggest benefit
→ count and percentage by option

Q8 barriers
→ multiple-choice count and percentage by option
```

Derived metrics should be calculated from these individual answer signals, not from already-aggregated percentages.

---

# 21. Backend Requirements

Technology:

```text
FastAPI
MongoDB
```

Core responsibilities:

- Employee management.
- Organizational hierarchy resolution.
- Survey response validation.
- Survey response persistence.
- Individual signal calculation.
- Leadership metric calculation.
- Scope-based aggregation.
- Dashboard API responses.

---

# 22. Data Model

## Employee

```json
{
  "id": "emp_101",
  "name": "Alice Chen",
  "level": "ic",
  "manager_id": "emp_201"
}
```

---

## Survey Response

API payloads must use stable answer codes, not display labels. These codes must match the frontend constants in `frontend/src/types/survey.ts`, `docs/Questions.md`, and `docs/metrics.md`.

```json
{
  "id": "response_001",
  "employee_id": "emp_101",
  "survey_cycle": "2026-Q3",
  "survey_version": 1,
  "answers": {
    "ai_usage_frequency": "daily",
    "top_value_areas": [
      {
        "area": "implementation",
        "rank": 1,
        "other_text": null
      },
      {
        "area": "research",
        "rank": 2,
        "other_text": null
      },
      {
        "area": "troubleshooting",
        "rank": 3,
        "other_text": null
      }
    ],
    "weekly_time_saved": "more_than_5_hours",
    "work_output_change": "significantly_more",
    "quality_change": "slightly_better",
    "correction_frequency": "sometimes",
    "biggest_benefit": {
      "option": "saves_time",
      "other_text": null
    },
    "barriers": [
      {
        "option": "lack_of_internal_context",
        "other_text": null
      },
      {
        "option": "review_effort",
        "other_text": null
      }
    ]
  },
  "submitted_at": "2026-08-31T20:00:00Z"
}
```

For the take-home build, the active `survey_cycle` should be a backend configuration value, for example `2026-Q3`. All submissions and metrics queries should use that active cycle unless a future version explicitly adds cycle selection.

---

# 23. API Requirements

The required API surface is intentionally small: submit survey responses and fetch rolled-up metrics by organization, manager, and level. Employee lookup is included to support the no-login name picker.

## Employees

```http
GET /api/employees
```

Returns employee selector and dashboard filter data.

Example response item:

```json
{
  "id": "emp_101",
  "name": "Alice Chen",
  "level": "ic",
  "manager_id": "emp_201"
}
```

---

## Submit Survey

```http
POST /api/survey-responses
```

Submits the employee's response for the active survey cycle. If a response already exists for that employee and cycle, replace it rather than creating a duplicate.

Request body:

```json
{
  "employee_id": "emp_301",
  "answers": {
    "q1_ai_usage_frequency": "daily",
    "q2_top_ai_value_areas": [],
    "q3_weekly_time_saved": "one_to_five_hours",
    "q4_work_output_change": "slightly_more",
    "q5_work_quality_impact": "slightly_better",
    "q6_ai_rework_frequency": "sometimes",
    "q7_biggest_ai_benefit": "saves_time",
    "q8_barriers": ["lack_of_training"]
  }
}
```

The server populates `id`, `survey_cycle`, `survey_version`, and `submitted_at`. Submission is an upsert keyed by `(employee_id, survey_cycle)`, so resubmitting replaces that employee's active-cycle response.

---

## Dashboard Metrics

Unified endpoint:

```http
GET /api/metrics?scope=org&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better

GET /api/metrics?scope=manager&scope_id=emp_201&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better

GET /api/metrics?scope=level&scope_id=ic&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better
```

Query parameters:

```text
scope      required: org | manager | level
scope_id   required for manager and level scopes; omitted for org
q3         optional, default more_than_5_hours; cannot be not_sure
q4         optional, default slightly_more
q5         optional, default slightly_better
```

The `q3=not_sure` criterion must return `422` because `not_sure` is missing data, not a numeric or analytical bucket.

The backend must recompute all metrics from individual responses for the resolved scope. It should also return `group_breakdown` rows, grouped by `level`, so the dashboard can render comparison charts and tables without recomputing metric business logic. Department is not part of this version's employee data model or a supported grouping dimension (see §7).

---

# 24. Dashboard API Response

Example:

```json
{
  "scope": {
    "type": "manager",
    "id": "emp_201",
    "name": "David Kim"
  },

  "coverage": {
    "eligible_employees": 7,
    "respondents": 6,
    "response_rate": 0.857
  },

  "population": {
    "eligible_employees": 7,
    "respondents": 6,
    "non_respondents": 1,
    "active_ai_users": 5
  },

  "headline_metrics": {
    "ai_adoption_rate": {
      "value": 0.83,
      "count": 5,
      "denominator": 6
    },
    "reports_more_output": {
      "value": 0.67,
      "count": 4,
      "denominator": 6
    }
  },

  "usage_frequency": {
    "denominator": 6,
    "rows": [
      { "code": "never", "label": "Never", "count": 1, "pct": 17 },
      { "code": "daily", "label": "Daily", "count": 3, "pct": 50 }
    ]
  },

  "workflow_value": {
    "denominator": 6,
    "rows": [
      {
        "code": "implementation",
        "label": "Implementation",
        "rank1": 3,
        "rank2": 1,
        "rank3": 0,
        "total": 4,
        "otherTexts": {}
      }
    ]
  },

  "weekly_time_saved": { "denominator": 6, "rows": [] },

  "work_output": { "denominator": 6, "rows": [] },

  "work_quality": { "denominator": 6, "rows": [] },

  "ai_rework_frequency": { "denominator": 6, "rows": [] },

  "q3_q5_analysis": {
    "criteria": {
      "weekly_time_saved": "more_than_5_hours",
      "work_output_change": "slightly_more",
      "quality_change": "slightly_better"
    },
    "matching_count": 2,
    "analysis_denominator": 5,
    "matching_rate": 0.4
  },

  "benefits": {
    "denominator": 6,
    "rows": [
      { "code": "saves_time", "label": "Saves time", "count": 3, "pct": 50, "otherTexts": {} }
    ]
  },

  "barriers": {
    "denominator": 6,
    "rows": [
      { "code": "lack_of_training", "label": "Lack of training", "count": 2, "pct": 33, "otherTexts": {} }
    ]
  },

  "group_breakdown": {
    "group_by": "level",
    "rows": [
      {
        "key": "ic",
        "label": "Individual Contributor",
        "eligible_employees": 4,
        "respondents": 3,
        "adoption_rate": 67,
        "more_output_rate": 67,
        "frequent_rework_rate": 33,
        "top_barrier": { "code": "lack_of_training", "label": "Lack of training" }
      }
    ]
  }
}
```

Numeric unit conventions:

- `RateMetric.value` fields are fractions from `0` to `1`.
- `DistributionRow.pct` and `group_breakdown` rate fields are whole percentages from `0` to `100`.
- Counts and denominators are integers.

The response shape must remain compatible with `frontend/src/types/metrics.ts`. The frontend should not duplicate business metric calculations.

---

# 25. Frontend Requirements

Technology:

```text
React
TypeScript
React Router
```

Recommended component structure:

```text
src/
│
├── pages/
│   ├── SurveyPage.tsx
│   └── DashboardPage.tsx
│
├── components/
│   ├── layout/
│   ├── survey/
│   └── dashboard/
│
├── api/
│   ├── employees.ts
│   ├── survey.ts
│   └── metrics.ts
│
├── hooks/
│
└── types/
```

---

# 26. Survey Submission Flow

```text
GET employees
      ↓
Employee selects name
      ↓
Complete Q1-Q8
      ↓
Validate form
      ↓
POST survey response
      ↓
Success confirmation
      ↓
Return to Dashboard
```

---

# 27. Executive Dashboard Flow

```text
Open Dashboard
      ↓
scope = Organization
      ↓
GET /api/metrics?scope=org&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better
      ↓
Display executive KPIs
      ↓
Display charts
      ↓
User changes scope
      ↓
Fetch new aggregated metrics
      ↓
User changes Q3-Q5 analysis criteria
      ↓
Fetch metrics with updated q3, q4, and q5 query values
      ↓
Dashboard updates
```

---

# 28. Suggested Demo Flow

The application should make the core product story easy to demonstrate.

### Step 1

Reviewer opens Executive Dashboard.

They immediately see:

- AI Adoption
- Response Rate
- Active AI Users
- Time Saved
- Basic population counts

### Step 2

Reviewer changes organizational scope.

Example:

```text
Organization
↓
Sarah Lee
↓
David Kim
```

Metrics update correctly for each population.

### Step 3

Reviewer selects **Submit Survey**.

### Step 4

Reviewer selects an employee and submits a new response.

### Step 5

Reviewer returns to the dashboard.

### Step 6

Dashboard metrics update to include the new response.

This demonstrates the complete product lifecycle:

```text
Employee Input
      ↓
Survey Storage
      ↓
Signal Calculation
      ↓
Hierarchy Aggregation
      ↓
Leadership Insight
```

---

# 29. Acceptance Criteria

The product is complete when:

1. Core behavior is implemented test-first: each backend service/API behavior and high-risk frontend workflow has a failing test before production code is added.

2. Exactly 10 realistic mock employees are seeded across multiple hierarchy branches.

3. Employees can select themselves and submit Q1-Q8.

4. Level and manager are derived from employee data rather than survey input.

5. Responses are persisted in the database.

6. Organization-wide metrics can be retrieved.

7. Manager-level metrics include the complete descendant subtree.

8. Level-based metrics can be retrieved.

9. Higher-level metrics are calculated from individual responses rather than averages of lower-level aggregates.

10. Response coverage and basic population counts are shown for every dashboard scope.

11. AI Adoption Rate is calculated from Q1.

12. Weekly time saved is displayed as the Q3 percentage distribution without midpoint-derived hour estimates.

13. Q4 work output, Q5 work quality, and Q6 AI rework are displayed as percentage distributions.

14. Dynamic Q3-Q5 analysis returns matching count, denominator, and matching rate.

15. AI value area ranking uses horizontal stacked bars with rank 1, rank 2, and rank 3 counts.

16. Q7 primary benefits and Q8 barriers use horizontal bar charts sorted by count.

17. `Other` chart categories show submitted free-text details on hover.

18. "Not sure" responses are excluded from applicable calculations rather than interpreted as zero.

19. Dashboard metrics update when the organizational scope changes.

20. Dashboard metrics update after a new survey response is submitted.

21. The frontend does not duplicate leadership metric business logic.

22. Metric definitions are documented in `docs/metrics.md` and understandable to a non-technical leadership audience.

23. Backend unit and API tests pass before the feature is considered complete.

24. Frontend type-check, build, and critical workflow tests pass before the feature is considered complete.

---

# 30. TDD Delivery Requirements

Implementation should follow test-driven development for behavior that affects correctness.

Required test-first areas:

- employee seed shape and hierarchy traversal,
- survey submission validation and replacement by employee/cycle,
- all formulas in `docs/metrics.md`,
- manager, level, and org scope resolution,
- dynamic Q3-Q5 query behavior,
- Q8 `no_major_barriers` exclusivity,
- frontend survey validation,
- dashboard refetching when scope or Q3-Q5 criteria change.

Use small deterministic fixtures rather than random data in tests. Each metric test should assert exact counts, denominators, percentages, and sort order.

---

# 31. Product Principle

The product should optimize for:

> **Decision signal, not survey volume.**

Every dashboard component should help leadership answer:

```text
What is happening?

Why is it happening?

Where is it happening?

Is the gain real?

What should we do next?
```

The success of the product is therefore not measured by the number of questions or charts it contains, but by how clearly employee feedback is transformed into actionable organizational insight.
