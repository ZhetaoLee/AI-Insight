# Architecture Decision Record — AI Productivity Insights

## ADR-001: System Architecture and Analytics Design

### Status

Accepted

### Date

August 31, 2026

---

# 1. Context

AI Productivity Insights collects employee survey responses and converts them into leadership-level AI productivity metrics.

The application must support:

- A real organizational context of approximately 50 employees.
- A realistic organizational hierarchy.
- Senior Director → Director → Manager → Individual Contributor relationships.
- Multiple organizational branches.
- Survey submission.
- Organization-wide aggregation.
- Manager subtree aggregation.
- Level aggregation.
- Executive metrics and charts.
- Exactly 10 seeded mock employees for the take-home implementation.

The system must remain simple enough for a take-home project while demonstrating correct architectural separation, maintainability, and analytical correctness.

The seeded dataset intentionally represents a smaller sample of the real organization. It must still include every level and enough branching to verify Individual Contributor → Manager → Director → Senior Director → org-wide aggregation.

A particularly important requirement is:

> The dashboard should correctly aggregate up the hierarchy.

Additionally, leadership metrics should provide meaningful signal rather than simply presenting raw survey response distributions.

---

# 2. Decision Summary

The system will use:

```text
React + TypeScript
        ↓
FastAPI
        ↓
Service Layer
        ↓
MongoDB
```

The backend will contain three primary logical responsibilities:

```text
Survey Service
Hierarchy / Scope Resolver
Metrics Engine
```

Architecture:

```text
                 React Application
                 ┌───────────────┐
                 │               │
            Survey Page     Dashboard Page
                 │               │
                 └───────┬───────┘
                         │
                         ▼
                     FastAPI
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     Survey Service  Scope Resolver  Metrics Service
          │              │              │
          │              │         Signal Calculator
          │              │              │
          │              │        Metrics Aggregator
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                       MongoDB
                 ┌───────┴────────┐
                 │                │
             Employees      Survey Responses
```

---

# 3. Decision 1 — Use One React Application for Both Workflows

## Decision

The frontend will be a single React application containing two primary routes:

```text
/dashboard
/survey
```

The application will use a shared layout and navigation.

---

## Rationale

Survey submission and dashboard visualization are two workflows over the same domain and backend.

Separate frontend applications would introduce unnecessary complexity around:

- deployment,
- routing,
- shared types,
- API clients,
- styling,
- development workflow.

A single frontend also provides a better demo experience.

Example:

```text
Dashboard
    ↓
Submit Survey
    ↓
Return to Dashboard
    ↓
Observe updated metrics
```

---

## Consequences

### Positive

- Simpler deployment.
- Shared components and types.
- Faster implementation.
- Easier demo flow.
- Clear separation remains possible through routes and component boundaries.

### Negative

- Real production deployments may eventually require separate authorization rules for employees and executives.

That requirement is outside the scope of this implementation.

---

# 4. Decision 2 — Use FastAPI as the Backend

## Decision

FastAPI will provide the HTTP API and application service layer.

---

## Rationale

FastAPI provides:

- Strong request validation through Pydantic.
- Automatic OpenAPI documentation.
- Clear dependency injection patterns.
- Good fit for analytics-oriented Python business logic.
- Low implementation overhead for the project size.

The application contains more business-rule complexity than infrastructure complexity, making Python well suited for transparent metrics computation.

---

# 5. Decision 3 — Use MongoDB for Persistence

## Decision

MongoDB will store:

```text
employees
survey_responses
```

Required indexes:

```text
unique employees(id)
employees(manager_id)
employees(level)
survey_responses(survey_cycle)
unique survey_responses(employee_id, survey_cycle)
```

---

## Rationale

Survey responses naturally contain a document-shaped collection of answers.

Example:

```json
{
  "employee_id": "emp_101",
  "answers": {
    "ai_usage_frequency": "daily",
    "weekly_time_saved": "1_5_hours",
    "quality_change": "slightly_better"
  }
}
```

MongoDB allows survey responses to evolve without requiring frequent relational schema migrations.

The organizational hierarchy itself is small enough that advanced relational recursive query capabilities are not required.

---

## Alternatives Considered

### PostgreSQL

PostgreSQL would also be a strong choice and would provide excellent relational integrity.

However, for this implementation:

- the organizational data set is very small,
- the survey schema may evolve,
- the assignment explicitly allows MongoDB,
- document storage reduces implementation overhead.

MongoDB therefore provides an appropriate tradeoff.

---

# 6. Decision 4 — Organizational Context Belongs to Employee Records

## Decision

Level and manager will be stored in the employee collection rather than submitted as survey answers. Department is intentionally absent from this version's employee data model.

Employee:

```json
{
  "id": "emp_101",
  "name": "Alice Chen",
  "level": "ic",
  "manager_id": "emp_201"
}
```

---

## Rationale

Organizational attributes describe the employee, not their survey response.

Allowing employees to submit these values creates possible inconsistencies:

```text
Employee record:
Manager

Survey:
Director
```

The survey form therefore only asks the user to select their identity.

The frontend may display level and manager as read-only context.

---

# 7. Decision 5 — Store Raw Survey Answers as the Source of Truth

## Decision

The database will persist raw answers rather than only storing derived metric scores.

Example:

```json
{
  "employee_id": "emp_101",
  "survey_cycle": "2026-Q3",
  "survey_version": 1,
  "answers": {
    "ai_usage_frequency": "daily",
    "weekly_time_saved": "1_5_hours",
    "work_output_change": "significantly_more",
    "quality_change": "slightly_better"
  }
}
```

---

## Rationale

Metric definitions may evolve.

For example:

Version 1 may define meaningful AI adoption as:

```text
AI use >= A few times per week
```

A later definition may require:

```text
AI use >= A few times per week
```

If only the derived `adoption_score` had been stored, historical responses would need to be rewritten.

Persisting raw answers allows metrics to be recalculated under new definitions.

---

## Consequences

### Positive

- Metrics can evolve.
- Historical data remains auditable.
- Leadership metrics can always be traced back to survey answers.

### Negative

- Metrics must be recalculated when requested.

For exactly 10 seeded employees in the take-home build, and for the approximately 50-person real org context, this computational cost is negligible.

---

# 8. Decision 6 — Add Survey Version and Survey Cycle

## Decision

Each response will include:

```text
survey_version
survey_cycle
```

Example:

```json
{
  "survey_version": 1,
  "survey_cycle": "2026-Q3"
}
```

---

## Rationale

Survey questions and metric definitions may change over time.

Without versioning, historical responses could become ambiguous.

A survey cycle also allows future comparison such as:

```text
2026 Q3
vs
2026 Q4
```

without changing the core data model.

For the take-home implementation, the active cycle should be configured in the backend, for example `2026-Q3`, and shared by survey submission and metrics aggregation.

---

# 9. Decision 7 — Resolve Organizational Hierarchy in the Application Layer

## Decision

Manager scope will be resolved recursively through the FastAPI service layer.

Example:

```python
async def get_descendant_ids(manager_id: str) -> set[str]:
    result = {manager_id}
    queue = [manager_id]

    while queue:
        current = queue.pop(0)

        reports = await employee_repository.find_by_manager(current)

        for report in reports:
            if report.id not in result:
                result.add(report.id)
                queue.append(report.id)

    return result
```

---

## Rationale

The take-home implementation contains exactly 10 seeded employees, while the target organization context is approximately 50 employees.

At this scale:

- recursive traversal is inexpensive,
- application-level logic is easy to understand,
- behavior is straightforward to test,
- implementation is independent of database-specific graph syntax.

---

## Alternative Considered

MongoDB `$graphLookup` could resolve the hierarchy inside MongoDB.

This was rejected for the initial implementation because it adds database-specific complexity without meaningful performance benefit at the expected scale.

---

## Consequences

If the organization eventually contains tens or hundreds of thousands of nodes, a different hierarchy representation or database-level graph strategy may become appropriate.

---

# 10. Decision 8 — Use a Unified Scope Resolver

## Decision

All dashboard aggregation will begin by resolving a requested scope into employee IDs.

Conceptually:

```python
resolve_scope(
    scope_type,
    scope_id
) -> list[str]
```

Supported scopes:

```text
org
manager
level
```

Examples:

```text
org
→ all employee IDs

manager = David Kim
→ David + every descendant

level = Individual Contributor (scope_id=ic)
→ every Individual Contributor
```

Department is not part of this version's employee data model or a required metrics scope for the take-home API.

---

## Rationale

Without a unified scope abstraction, each metrics endpoint would duplicate filtering and aggregation logic.

The selected design creates a reusable pipeline:

```text
Scope
  ↓
Employee Population
  ↓
Survey Responses
  ↓
Derived Signals
  ↓
Leadership Metrics
```

---

# 11. Decision 9 — Calculate Metrics from Individual Responses

## Decision

Higher-level metrics will always be recomputed from individual responses.

They will never be calculated by averaging lower-level percentages.

---

## Example

Manager A:

```text
2 employees
100% AI adoption
```

Manager B:

```text
8 employees
50% AI adoption
```

Incorrect Director calculation:

```text
(100% + 50%) / 2
= 75%
```

Correct:

```text
2 adopters
+
4 adopters
---------
10 employees

= 60%
```

---

## Rationale

Percentages and averages are population-weighted metrics.

Averaging already-aggregated metrics produces incorrect results whenever group sizes differ.

Therefore the aggregation pipeline is:

```text
Hierarchy
   ↓
Individual employee population
   ↓
Individual survey responses
   ↓
Metric calculation
```

not:

```text
Individual Contributor metric
   ↓
Manager metric
   ↓
Director metric
```

---

# 12. Decision 10 — Backend Owns Metric Business Logic

## Decision

Leadership metric definitions will exist only in the backend.

The React application will receive computed metrics and render them.

---

## Rationale

If React contains logic such as:

```typescript
q1 === "daily" &&
q3 === "1_5_hours" &&
q5 === "slightly_better"
```

then business rules become duplicated between frontend and backend.

This creates consistency problems.

Instead:

```text
Backend:
"How is AI Adoption Rate calculated?"

Frontend:
"How should AI Adoption Rate be displayed?"
```

---

# 13. Decision 11 — Use Transparent Metric Definitions

## Decision

The initial implementation will use transparent counts, percentages, distributions, and selectable filters rather than opaque composite scores.

Example:

```text
AI Adoption Rate = active_ai_users / respondents

Q3 Weekly Time Saved Distribution =
option_count / respondents_who_answered_Q3

Dynamic Q3-Q5 Analysis =
respondents matching selected Q3, Q4, and Q5 values / valid analysis denominator
```

---

## Alternative Considered

Example weighted score:

```text
AI Value Score =
Q1 × 20%
+
Q3 × 25%
+
Q4 × 20%
+
Q5 × 15%
+
...
```

---

## Why Rejected

Although mathematically convenient, arbitrary weighting creates problems:

- difficult to explain,
- weights have no empirical calibration,
- small weighting changes may materially alter classifications,
- leadership cannot easily understand why a score is high or low.

Explicit formulas provide stronger auditability for the initial implementation. `docs/metrics.md` is the canonical metric contract.

---

# 14. Decision 12 — Preserve "Not Sure" as Missing Information

## Decision

Survey values such as:

```text
Not sure
```

will be represented internally as unknown rather than zero.

Example:

```python
weekly_time_saved = "not_sure"
```

not:

```python
weekly_time_saved = "no_noticeable_time_saved"
```

---

## Rationale

These statements are different:

```text
AI saves me 0 hours.
```

and:

```text
I am not sure how many hours AI saves me.
```

Treating both as zero or "no noticeable time saved" would systematically distort
the Q3 distribution and Q3-Q5 analysis denominator.

Calculations will therefore include a valid-response denominator specific to the metric being computed.

---

# 15. Decision 13 — Keep Time Saved as Survey Bands

## Decision

Q3 ranges will remain categorical survey answers. The dashboard will display the
selected-band distribution and will not convert bands into midpoint-derived hour
estimates.

---

## Rationale

Q3 uses ranges rather than exact hours. Converting those ranges into precise
hour values would introduce arbitrary assumptions, for example treating every
`1-5 hours` answer as the same exact number of hours.

Leadership should see the distribution directly:

```text
37% selected "1-5 hours"
```

---

## Consequence

The number is an estimate rather than direct measurement.

The API and frontend should identify it accordingly.

---

# 16. Decision 14 — Stacked Ranking for AI Value Areas

## Decision

Q2 ranking will be displayed as a horizontal stacked bar chart:

```text
Rank #1 → dark blue segment
Rank #2 → medium blue segment
Rank #3 → light blue segment
```

Categories are sorted by total votes, then rank 1 votes, rank 2 votes, and rank 3 votes.

---

## Rationale

Leaders need to see both total interest in a value area and the intensity of that preference.

The stacked chart keeps rank detail visible without collapsing the answers into a single opaque score.

---

# 17. Decision 15 — Keep Workflow Dimensions Separate

## Decision

Q2, Q7, and Q8 will not be merged into one numerical "AI value score."

They represent different concepts:

```text
Q2
Where does AI create value?

Q7
Why does AI create value?

Q8
What limits effective AI use?
```

---

## Rationale

Combining them would destroy useful distinctions.

Instead the dashboard can tell a richer story:

```text
Where AI creates value
        ↓
Implementation and research

Why
        ↓
Time savings and better decisions

What blocks more value
        ↓
Training, reliability, context, and workflow fit
```

---

# 18. Decision 16 — Always Include Response Coverage

## Decision

Every metrics response includes:

```text
eligible_employees
respondents
response_rate
```

---

## Rationale

Consider:

```text
Engineering AI Adoption: 90%
```

If only:

```text
2 / 20 employees
```

responded, the number is not strongly representative.

Coverage therefore provides essential context for leadership interpretation.

---

# 19. Decision 17 — Dashboard API Returns Presentation-Ready Aggregate Data

## Decision

The API will return structured aggregate results suitable for direct visualization.

Example:

```json
{
  "coverage": {},
  "population": {},
  "headline_metrics": {},
  "usage_frequency": {},
  "weekly_time_saved": [],
  "work_output": [],
  "work_quality": [],
  "ai_rework_frequency": [],
  "q3_q5_analysis": {},
  "workflow_value": [],
  "benefits": [],
  "barriers": []
}
```

---

## Rationale

The frontend should not need to download every survey response and perform analytics itself.

Backend aggregation provides:

- consistent formulas,
- simpler frontend code,
- smaller API payloads,
- stronger separation of concerns.

---

# 20. Service Design

Recommended services:

```text
EmployeeRepository

SurveyResponseRepository

HierarchyService

ScopeResolver

SignalCalculator

MetricsAggregator

MetricsService
```

Example:

```python
class MetricsService:

    async def get_metrics(
        self,
        scope_type: ScopeType,
        scope_id: str | None,
        q3: str,
        q4: str,
        q5: str
    ) -> MetricsResponse:

        employee_ids = await self.scope_resolver.resolve(
            scope_type,
            scope_id
        )

        responses = await self.response_repository.find_by_employee_ids(
            employee_ids
        )

        signals = [
            self.signal_calculator.calculate(response)
            for response in responses
        ]

        return self.metrics_aggregator.aggregate(
            employee_ids,
            responses,
            signals,
            q3_q5_criteria=(q3, q4, q5)
        )
```

---

# 21. Signal Model

Each survey response can be normalized into an internal representation.

Example:

```python
EmployeeAISignals(
    meaningful_adopter=True,
    positive_productivity=True,
    quality_preserved=True,
    manageable_rework=True,
    high_value_user=True,
    weekly_time_saved_band="1_5_hours",
)
```

This object does not need to be persisted.

It is derived from raw survey answers.

---

# 22. API Design

Required endpoints:

```http
GET /api/employees

GET /api/survey-responses/submitted-employee-ids

POST /api/survey-responses

GET /api/metrics?scope=org&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better

GET /api/metrics?scope=manager&scope_id=emp_201&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better

GET /api/metrics?scope=level&scope_id=ic&q3=more_than_5_hours&q4=slightly_more&q5=slightly_better
```

The metrics endpoint contract is:

```text
scope      required: org | manager | level
scope_id   required for manager and level scopes; omitted for org
q3         optional, default more_than_5_hours; cannot be not_sure
q4         optional, default slightly_more
q5         optional, default slightly_better
```

`group_breakdown` is always grouped by `level`. Department is intentionally absent from this version's employee data model and is not a supported dashboard grouping dimension.

The API must return `422` for `q3=not_sure` because `not_sure` is missing data and is excluded from numeric and criteria-based analysis.

The backend owns the dynamic Q3-Q5 analysis calculation. The frontend sends criteria and renders the returned `q3_q5_analysis`; it must not filter raw responses locally once the backend is available.

`GET /api/employees` remains a static employee directory. Active-cycle response state is exposed separately through `GET /api/survey-responses/submitted-employee-ids`, which returns employees who already submitted for the configured survey cycle. The survey page uses that response to hide submitted employees from the name picker.

---

# 23. Error Handling

The API should return structured errors.

Examples:

### Employee not found

```http
404
```

### Invalid survey option

```http
422
```

### Duplicate active-cycle survey response

```http
409
```

### Invalid manager scope

```http
400
```

### Invalid metrics query parameter

```http
422
```

---

# 24. Data Integrity Rules

The system should enforce:

1. Employee IDs must exist before survey submission.

2. Manager IDs must reference valid employees.

3. Employees cannot manage themselves.

4. Hierarchy traversal must protect against cycles.

5. Q2 must contain exactly three unique ranked areas.

6. Ranking positions must be unique.

7. Survey answer values must match defined enums.

8. One employee should have at most one active response per survey cycle; repeat `POST /api/survey-responses` submissions for the same employee and active cycle must be rejected with `409 Conflict`.

9. Q8 `no_major_barriers` must be mutually exclusive with every other barrier choice.

---

# 25. Testing Strategy

The system will be built with test-driven development. For every behavior that affects survey validity, hierarchy resolution, metric correctness, or API compatibility, contributors should first write a failing test, then implement the smallest production change needed to pass it, then refactor while keeping the test suite green.

Recommended loop:

```text
Write failing test
      ↓
Run targeted test and confirm failure
      ↓
Implement smallest behavior
      ↓
Run targeted test and confirm pass
      ↓
Run related suite
      ↓
Refactor only with tests passing
```

Tests should use deterministic fixtures with explicit employees and responses. Do not rely on generated demo data for formula assertions.

## Unit Tests

### SignalCalculator

Test:

```text
AI Adoption
Estimated Hours Saved
Not Sure handling
Dynamic Q3-Q5 analysis matching
Multiple-choice barrier handling
Other free-text handling
```

### HierarchyService

Test:

```text
Individual Contributor
Manager
Director
Senior Director
Multiple branches
Cycle protection
```

### MetricsAggregator

Test:

```text
Correct denominators
Stacked ranking counts
Unknown-value exclusion
Response coverage
Population counts
```

---

## Critical Aggregation Test

Explicitly test:

```text
Manager A
2 employees
100% adoption

Manager B
8 employees
50% adoption
```

Director should return:

```text
60%
```

not:

```text
75%
```

---

## API Tests

Test:

```text
POST survey response

GET organization metrics

GET manager subtree metrics

GET level metrics

GET metrics with scope, q3, q4, and q5 query parameters

Omitted q3, q4, and q5 query parameters use documented defaults

q3=not_sure returns 422

Invalid query parameters return 422

Submitted response updates are reflected in later metrics responses

Required MongoDB indexes are created
```

## Frontend Tests

Frontend behavior should be covered at the component or integration level once a test runner is added.

Test:

```text
Survey requires Q1-Q8

Q2 requires exactly three ranked areas

Other text is required when Other is selected

Q8 no_major_barriers is mutually exclusive

Dashboard sends scope, q3, q4, and q5 to /api/metrics

Dashboard refetches metrics when scope or Q3-Q5 criteria change
```

Recommended tools:

```text
Backend: pytest, pytest-asyncio, httpx AsyncClient
Frontend: Vitest, React Testing Library, Playwright for one smoke flow
```

Local verification is required before implementation is considered complete. Contributors may add Dockerfiles and a `docker compose` workflow for MongoDB, FastAPI, and the frontend so automated tests and manual end-to-end checks run consistently on a local machine.

---

# 26. Performance Considerations

Expected organization size:

```text
10 seeded employees in the take-home implementation
~50 employees in the target organization context
up to one survey response per employee per survey cycle
```

At this scale:

- application-level hierarchy traversal is inexpensive,
- runtime metric computation is inexpensive,
- complex caching is unnecessary.

The architecture deliberately optimizes for simplicity and correctness rather than premature scalability.

---

# 27. Future Scalability

If the product expands to thousands of employees, potential improvements include:

- cached descendant relationships,
- MongoDB `$graphLookup`,
- materialized hierarchy paths,
- precomputed analytics snapshots,
- Redis caching,
- asynchronous aggregation,
- dedicated analytics storage.

These optimizations are intentionally deferred until justified by actual scale.

---

# 28. Security Considerations

The assignment specifies no authentication.

Therefore the take-home version will not implement login.

In a production implementation:

```text
Employees
→ submit or modify their own response

Managers
→ view authorized organizational subtree

Executives
→ view organization-wide metrics
```

This would require RBAC and authenticated employee identity.

---

# 29. Privacy Considerations

Although individual responses must be stored to perform hierarchy aggregation, the executive dashboard should emphasize aggregate data.

A production version should consider suppressing small groups.

Example:

```text
Do not display aggregate survey results
when respondent count < 3
```

This reduces the likelihood that an individual response can be inferred.

This threshold is not required for the take-home implementation but should be documented as a production consideration.

---

# 30. Observability

The backend should log:

- survey submission success/failure,
- metrics endpoint requests,
- scope resolution failures,
- invalid hierarchy detection,
- unexpected aggregation errors.

No survey-answer content needs to be written to application logs.

---

# 31. Key Architectural Principle

The architecture deliberately separates four concerns:

```text
WHO
Hierarchy / Scope Resolver

WHAT THEY SAID
Raw Survey Responses

WHAT IT MEANS
Signal Calculator / Metrics Engine

HOW IT IS SHOWN
React Dashboard
```

This allows each part of the application to evolve independently.

---

# 32. Final Architecture

```text
                    ┌────────────────────────┐
                    │      React App         │
                    │                        │
                    │ Dashboard   Survey     │
                    └───────────┬────────────┘
                                │
                                │ REST
                                ▼
                    ┌────────────────────────┐
                    │        FastAPI         │
                    └───────────┬────────────┘
                                │
             ┌──────────────────┼───────────────────┐
             │                  │                   │
             ▼                  ▼                   ▼
       Survey Service     Scope Resolver      Metrics Service
             │                  │                   │
             │            Hierarchy Service         ▼
             │                                  Signal
             │                                 Calculator
             │                                     │
             │                                     ▼
             │                                  Metrics
             │                                 Aggregator
             │                                     │
             └──────────────────┬──────────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │   MongoDB   │
                         ├─────────────┤
                         │ Employees   │
                         │ Responses   │
                         └─────────────┘
```

---

# 33. Architectural Principle

The application is intentionally designed around:

> **Raw employee input → transparent derived signals → population-correct hierarchy aggregation → actionable leadership insight.**

The backend does not simply average survey responses.

It determines the requested organizational population, retrieves the corresponding individual responses, converts those answers into explainable productivity and quality signals, and calculates executive metrics directly from the underlying employee population.
