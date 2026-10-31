"""Sensitive-attribute guard used by the seed script and every Gemini payload.

The team's shared check lives in `app/fairness.py` (Harshit). Until it exists,
this module falls back to a local copy of the same rule so Harin's code runs alone.
"""

SENSITIVE_FIELDS = {
    "name", "first_name", "last_name", "full_name", "gender", "sex", "age", "dob",
    "date_of_birth", "birth_date", "ethnicity", "race", "religion", "marital_status",
    "disability", "nationality", "tenure", "location", "city", "country", "address",
}


def _local_assert_clean(payload, path="payload") -> None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if str(key).lower() in SENSITIVE_FIELDS:
                raise ValueError(f"Sensitive attribute '{key}' found at {path}")
            _local_assert_clean(value, f"{path}.{key}")
    elif isinstance(payload, (list, tuple)):
        for i, item in enumerate(payload):
            _local_assert_clean(item, f"{path}[{i}]")


try:
    from app.fairness import assert_clean  # noqa: F401
except ImportError:
    assert_clean = _local_assert_clean
