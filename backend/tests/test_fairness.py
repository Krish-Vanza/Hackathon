import pytest

from app import sample_data
from app.fairness import SensitiveDataError, assert_clean


def test_sample_data_is_clean():
    assert_clean(sample_data.build())


@pytest.mark.parametrize("field", ["gender", "age", "date_of_birth", "Ethnicity", "tenure", "location"])
def test_sensitive_field_is_rejected(field):
    with pytest.raises(SensitiveDataError):
        assert_clean({"rows": [{"employee_id": "E-1", field: "x"}]})


def test_person_name_is_rejected():
    with pytest.raises(SensitiveDataError):
        assert_clean({"employee_id": "E-1", "name": "x"})


def test_skill_name_is_allowed():
    assert_clean({"skill_id": "S-PY", "name": "Python"})


def test_labelled_text_is_rejected():
    with pytest.raises(SensitiveDataError):
        assert_clean("Employee E-1, gender: x, skills: Python")


def test_ordinary_text_is_allowed():
    assert_clean("Agentic AI demand is rising across the agency.")
