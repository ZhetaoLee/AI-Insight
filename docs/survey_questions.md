# Survey Questions Reference

This file is a pushable implementation reference for the local canonical `Questions.md`. Keep the frontend, backend schemas, seed data, and tests aligned to these options and answer codes.

## Employee Context

Level is read-only context loaded from the selected employee record. It is not submitted as a survey answer.

- `senior_director`: Senior Director
- `director`: Director
- `manager`: Manager
- `ic`: IC

## Questions

### Q1. AI Usage Frequency

Single choice.

- `never`: Never
- `few_times_month`: A few times per month
- `few_times_week`: A few times per week
- `daily`: Daily
- `multiple_times_day`: Multiple times per day

### Q2. Top 3 AI Value Areas

Ranking. Exactly three unique areas are required. Rank `1` is most valuable.

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

### Q3. Weekly Time Saved

Single choice.

- `no_noticeable_time_saved`: No noticeable time saved
- `less_than_1_hour`: Less than 1 hour
- `1_5_hours`: 1-5 hours
- `more_than_5_hours`: More than 5 hours
- `not_sure`: Not sure

### Q4. Work Output Impact

Single choice, 5-point Likert scale.

- `much_less`: Much less
- `slightly_less`: Slightly less
- `same`: Same
- `slightly_more`: Slightly more
- `significantly_more`: Significantly more

### Q5. Work Quality Impact

Single choice, 5-point Likert scale.

- `much_worse`: Much worse
- `slightly_worse`: Slightly worse
- `no_meaningful_change`: No meaningful change
- `slightly_better`: Slightly better
- `much_better`: Much better

### Q6. AI Rework Frequency

Single choice, 5-point Likert scale.

- `almost_never`: Almost never
- `rarely`: Rarely
- `sometimes`: Sometimes
- `often`: Often
- `almost_always`: Almost always

### Q7. Biggest AI Benefit

Single choice.

- `saves_time`: Saves time
- `reduces_repetitive_work`: Reduces repetitive work
- `helps_get_unstuck`: Helps me get unstuck
- `improves_work_quality`: Improves work quality
- `supports_better_decisions`: Supports better decisions
- `helps_explore_ideas`: Helps explore ideas
- `helps_learn_faster`: Helps me learn faster
- `other`: Other

If `other` is selected, `other_text` is required.

### Q8. Barriers to Effective AI Use

Multiple choice.

- `tool_access`: Tool access
- `lack_of_training`: Lack of training
- `reliability_concerns`: Reliability concerns
- `review_effort`: Review effort
- `security_privacy_concerns`: Security and privacy concerns
- `lack_of_internal_context`: Lack of internal context
- `poor_workflow_fit`: Poor workflow fit
- `no_major_barriers`: No major barriers
- `other`: Other

If `other` is selected, `other_text` is required. `no_major_barriers` is mutually exclusive with every other barrier option.

## Submission Shape

```json
{
  "employee_id": "emp_104",
  "answers": {
    "ai_usage_frequency": "daily",
    "top_value_areas": [
      { "area": "implementation", "rank": 1, "other_text": null },
      { "area": "testing", "rank": 2, "other_text": null },
      { "area": "other", "rank": 3, "other_text": "Prompt library maintenance" }
    ],
    "weekly_time_saved": "1_5_hours",
    "work_output_change": "slightly_more",
    "quality_change": "slightly_better",
    "correction_frequency": "sometimes",
    "biggest_benefit": { "option": "saves_time", "other_text": null },
    "barriers": [
      { "option": "lack_of_training", "other_text": null },
      { "option": "other", "other_text": "Limited approved tools" }
    ]
  }
}
```
