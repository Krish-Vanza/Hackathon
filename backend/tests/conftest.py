import os

# Must run before app imports: tests stay on sample data, even with a real URI in .env.
os.environ["MONGODB_URI"] = ""

import pytest
from fastapi.testclient import TestClient

from app import store
from app.main import app


@pytest.fixture(autouse=True)
def fresh_data():
    store.reset_memory()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def hr():
    return {"X-Demo-Role": "hr"}
