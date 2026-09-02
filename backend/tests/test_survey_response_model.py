import pytest
from pydantic import ValidationError

from app.models.survey_response import NO_MAJOR_BARRIERS, OTHER, SurveyResponseSubmission
from helpers import add_nested, replace_nested


def test_valid_survey_submission_payload_matches_frontend_shape(valid_survey_submission):
    submission = SurveyResponseSubmission.model_validate(valid_survey_submission)

    assert submission.employee_id == "emp_104"
    assert [area.rank for area in submission.answers.top_value_areas] == [1, 2, 3]


@pytest.mark.parametrize(
    ("path", "key", "value"),
    [
        ((), "manager_id", "emp_103"),
        (("answers",), "level", "ic"),
        (("answers", "top_value_areas", 0), "label", "Implementation"),
        (("answers", "biggest_benefit"), "label", "Saves time"),
        (("answers", "barriers", 0), "label", "Internal context"),
    ],
)
def test_survey_submission_rejects_extra_client_fields(valid_survey_submission, path, key, value):
    payload = add_nested(valid_survey_submission, path, key, value)

    with pytest.raises(ValidationError):
        SurveyResponseSubmission.model_validate(payload)


@pytest.mark.parametrize(
    ("path", "value"),
    [
        (("answers", "ai_usage_frequency"), "hourly"),
        (("answers", "weekly_time_saved"), "one_to_five_hours"),
        (("answers", "work_output_change"), "more"),
        (("answers", "quality_change"), "better"),
        (("answers", "correction_frequency"), "frequently"),
        (("answers", "biggest_benefit", "option"), "lack_of_training"),
        (("answers", "barriers", 0, "option"), "saves_time"),
    ],
)
def test_survey_submission_rejects_unknown_answer_codes(valid_survey_submission, path, value):
    payload = replace_nested(valid_survey_submission, path, value)

    with pytest.raises(ValidationError):
        SurveyResponseSubmission.model_validate(payload)


def test_top_value_areas_requires_exactly_three_unique_areas(valid_survey_submission):
    payload = replace_nested(
        valid_survey_submission,
        ("answers", "top_value_areas"),
        [
            {"area": "implementation", "rank": 1, "other_text": None},
            {"area": "implementation", "rank": 2, "other_text": None},
            {"area": "research", "rank": 3, "other_text": None},
        ],
    )

    with pytest.raises(ValidationError, match="unique areas"):
        SurveyResponseSubmission.model_validate(payload)


@pytest.mark.parametrize(
    "areas",
    [
        [
            {"area": "implementation", "rank": 1, "other_text": None},
            {"area": "research", "rank": 2, "other_text": None},
        ],
        [
            {"area": "implementation", "rank": 1, "other_text": None},
            {"area": "research", "rank": 2, "other_text": None},
            {"area": "troubleshooting", "rank": 3, "other_text": None},
            {"area": "testing", "rank": 3, "other_text": None},
        ],
    ],
)
def test_top_value_areas_requires_exactly_three_entries(valid_survey_submission, areas):
    payload = replace_nested(valid_survey_submission, ("answers", "top_value_areas"), areas)

    with pytest.raises(ValidationError, match="exactly 3"):
        SurveyResponseSubmission.model_validate(payload)


def test_top_value_areas_requires_rank_positions_one_two_three(valid_survey_submission):
    payload = replace_nested(
        valid_survey_submission,
        ("answers", "top_value_areas"),
        [
            {"area": "implementation", "rank": 1, "other_text": None},
            {"area": "research", "rank": 1, "other_text": None},
            {"area": "troubleshooting", "rank": 3, "other_text": None},
        ],
    )

    with pytest.raises(ValidationError, match="ranks 1, 2, and 3"):
        SurveyResponseSubmission.model_validate(payload)


@pytest.mark.parametrize(
    "path",
    [
        ("answers", "top_value_areas", 0),
        ("answers", "biggest_benefit"),
        ("answers", "barriers", 0),
    ],
)
def test_other_choices_require_other_text(valid_survey_submission, path):
    payload = replace_nested(valid_survey_submission, (*path, "area" if path[-1] == 0 and path[-2] == "top_value_areas" else "option"), OTHER)
    payload = replace_nested(payload, (*path, "other_text"), " ")

    with pytest.raises(ValidationError, match="other_text"):
        SurveyResponseSubmission.model_validate(payload)


@pytest.mark.parametrize(
    ("path", "text"),
    [
        (("answers", "top_value_areas", 0), "Internal knowledge base search"),
        (("answers", "biggest_benefit"), "Helps with multilingual drafting"),
        (("answers", "barriers", 0), "Procurement approval delay"),
    ],
)
def test_other_choices_accept_other_text(valid_survey_submission, path, text):
    payload = replace_nested(
        valid_survey_submission,
        (*path, "area" if path[-1] == 0 and path[-2] == "top_value_areas" else "option"),
        OTHER,
    )
    payload = replace_nested(payload, (*path, "other_text"), text)

    submission = SurveyResponseSubmission.model_validate(payload)

    if path[-2] == "top_value_areas":
        assert submission.answers.top_value_areas[0].other_text == text
    elif path[-1] == "biggest_benefit":
        assert submission.answers.biggest_benefit.other_text == text
    else:
        assert submission.answers.barriers[0].other_text == text


def test_barriers_reject_duplicate_options(valid_survey_submission):
    payload = replace_nested(
        valid_survey_submission,
        ("answers", "barriers"),
        [
            {"option": "lack_of_training", "other_text": None},
            {"option": "lack_of_training", "other_text": None},
        ],
    )

    with pytest.raises(ValidationError, match="duplicate"):
        SurveyResponseSubmission.model_validate(payload)


def test_no_major_barriers_is_mutually_exclusive(valid_survey_submission):
    payload = replace_nested(
        valid_survey_submission,
        ("answers", "barriers"),
        [
            {"option": NO_MAJOR_BARRIERS, "other_text": None},
            {"option": "lack_of_training", "other_text": None},
        ],
    )

    with pytest.raises(ValidationError, match="mutually exclusive"):
        SurveyResponseSubmission.model_validate(payload)


def test_no_major_barriers_is_valid_when_selected_alone(valid_survey_submission):
    payload = replace_nested(
        valid_survey_submission,
        ("answers", "barriers"),
        [{"option": NO_MAJOR_BARRIERS, "other_text": None}],
    )

    submission = SurveyResponseSubmission.model_validate(payload)

    assert [barrier.option for barrier in submission.answers.barriers] == [NO_MAJOR_BARRIERS]
