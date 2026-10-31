"""Sensitive-attribute guard (plan.md rule 5). Used on seed data and every Gemini payload."""
import re

BLOCKED_FIELDS = {
    "full_name", "first_name", "last_name", "employee_name", "gender", "sex", "age",
    "dob", "date_of_birth", "birth_date", "ethnicity", "race", "religion",
    "marital_status", "disability", "nationality", "citizenship",
    # Proxies for the attributes above.
    "tenure", "tenure_years", "years_of_service", "hire_date", "location", "city",
    "country", "address",
}

_LABELLED_TEXT = re.compile(
    r"\b(gender|sex|age|date of birth|dob|ethnicity|race|religion|marital status"
    r"|disability|nationality|tenure|location)\s*[:=]",
    re.IGNORECASE,
)


class SensitiveDataError(ValueError):
    pass


def _normal(key) -> str:
    return str(key).strip().lower().replace("-", "_").replace(" ", "_")


def assert_clean(data, path: str = "$") -> None:
    """Raise SensitiveDataError if data carries a sensitive field.

    Skills legitimately have a `name`, so `name` is only blocked on a person record,
    meaning any object that also holds an `employee_id`.
    """
    if isinstance(data, dict):
        keys = {_normal(key) for key in data}
        blocked = keys & BLOCKED_FIELDS
        if "employee_id" in keys and "name" in keys:
            blocked = blocked | {"name"}
        if blocked:
            raise SensitiveDataError(f"Sensitive field at {path}: {sorted(blocked)}")
        for key, value in data.items():
            assert_clean(value, f"{path}.{key}")
    elif isinstance(data, (list, tuple, set)):
        for index, value in enumerate(data):
            assert_clean(value, f"{path}[{index}]")
    elif isinstance(data, str) and _LABELLED_TEXT.search(data):
        raise SensitiveDataError(f"Sensitive label in text at {path}")
