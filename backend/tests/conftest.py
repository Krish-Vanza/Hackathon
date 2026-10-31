import os

# Must run before app imports: tests stay on sample data, even with a real URI in .env.
os.environ["MONGODB_URI"] = ""
os.environ["LLM_MODE"] = "mock"

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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


@pytest.fixture(scope="session")
def seeded_db():
    """In-memory MongoDB with the full seed and a trained forecast. Needs mongomock."""
    mongomock = pytest.importorskip("mongomock")
    from app import db as dbm
    from app.ai import graph
    from ml.train_forecast import train_and_store
    from seed.generate_seed import load

    db = mongomock.MongoClient().db
    load(db)
    run = train_and_store(db, save_model=False)
    dbm.set_db(db)
    graph.refresh_graph()
    yield db, run
    dbm.set_db(None)
    graph.refresh_graph()
