# AI Productivity Survey

This is the canonical survey question source for implementation. Frontend constants,
backend validation, API payloads, and metric calculations must use these answer codes.

## Employee Context

The employee name picker lists only employees who have not submitted a response
for the active survey cycle. Once an employee submits, their name is hidden from
new survey submissions for that cycle. The submitted-employee list is refreshed
periodically while the page is open, when the page becomes active again, before
another employee selection, and when starting another response.
After a successful submission, the form clears the selected employee and all
answer fields so the next respondent cannot inherit the prior respondent's
answers.

### Level [Read-only]

The employee's level is loaded from the selected employee record. It is not submitted
as a survey answer.

- `senior_director`: Senior Director
- `director`: Director
- `manager`: Manager
- `ic`: Individual Contributor

## Q1. AI Usage Frequency [Single Choice]

How often do you currently use AI for work?

- `never`: Never
- `few_times_month`: A few times per month
- `few_times_week`: A few times per week
- `daily`: Daily
- `multiple_times_day`: Multiple times per day

## Q2. Top 3 AI Value Areas [Ranking]

Rank 3 areas, where rank `1` is most valuable. Exactly three unique areas are required.

- `planning`: Planning
- `research`: Research
- `design`: Design
- `implementation`: Implementation
- `testing`: Testing
- `troubleshooting`: Troubleshooting
- `review`: Review
- `communication`: Communication
- `management`: Management
- `administration`: Administration
- `other`: Other

If `other` is selected, `other_text` is required.

## Q3. Weekly Time Saved [Single Choice]

Compared with working without AI, approximately how much work time does AI save you in a typical week?

- `no_noticeable_time_saved`: No noticeable time saved
- `less_than_1_hour`: Less than 1 hour
- `1_5_hours`: 1-5 hours
- `more_than_5_hours`: More than 5 hours
- `not_sure`: Not sure

## Q4. Work Output Impact [Single Choice]

Compared with working without AI, how has AI affected the amount of work you can
complete in the same amount of time?

- `much_less`: Much less
- `slightly_less`: Slightly less
- `same`: Same
- `slightly_more`: Slightly more
- `significantly_more`: Significantly more
- `not_sure`: Not sure

## Q5. Work Quality Impact [Single Choice]

How has AI affected the quality of your work?

- `much_worse`: Much worse
- `slightly_worse`: Slightly worse
- `no_meaningful_change`: No meaningful change
- `slightly_better`: Slightly better
- `much_better`: Much better
- `not_sure`: Not sure

## Q6. AI Rework Frequency [Single Choice]

How often do you need to substantially correct or rewrite AI-generated output before
using it?

- `almost_never`: Almost never
- `rarely`: Rarely
- `sometimes`: Sometimes
- `often`: Often
- `almost_always`: Almost always
- `not_sure`: Not sure

## Q7. Biggest AI Benefit [Single Choice]

What is the biggest benefit AI provides in your day-to-day work?

- `saves_time`: Saves time
- `reduces_repetitive_work`: Reduces repetitive work
- `helps_get_unstuck`: Helps me get unstuck
- `improves_work_quality`: Improves work quality
- `supports_better_decisions`: Supports better decisions
- `helps_explore_ideas`: Helps explore ideas
- `helps_learn_faster`: Helps me learn faster
- `other`: Other

If `other` is selected, `other_text` is required.

## Q8. Barriers to Effective AI Use [Multiple Choice]

What barriers limit your effective use of AI at work?

- `tool_access`: Tool access
- `lack_of_training`: Lack of training
- `reliability_concerns`: Reliability concerns
- `review_effort`: Review effort
- `security_privacy_concerns`: Security and privacy concerns
- `lack_of_internal_context`: Lack of internal context
- `poor_workflow_fit`: Poor workflow fit
- `no_major_barriers`: No major barriers
- `other`: Other

If `other` is selected, `other_text` is required. `no_major_barriers` is mutually
exclusive with every other barrier option.
