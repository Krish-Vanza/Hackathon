import pytest

from app.ai import graph


def test_graph_has_skills_roles_and_edges(seeded_db):
    g = graph.get_graph()
    types = {n["type"] for n in g["nodes"]}
    assert types == {"skill", "role"}
    assert len(g["nodes"]) == 50
    assert {e["type"] for e in g["edges"]} == {"prerequisite_of", "related_to", "required_by"}


def test_centrality_is_scaled(seeded_db):
    values = [graph.centrality(f"S-{i:03d}") for i in range(1, 41)]
    assert all(0 <= v <= 1 for v in values)
    assert max(values) == 1.0
    assert graph.centrality("S-999") == 0.0


def test_focus_returns_neighbours(seeded_db):
    g = graph.get_graph(focus="S-028")
    ids = {n["id"] for n in g["nodes"]}
    assert {"S-028", "S-026", "R-09"} <= ids
    with pytest.raises(KeyError):
        graph.get_graph(focus="S-999")


def test_prerequisites_come_first(seeded_db):
    assert graph.prerequisite_order(["S-028", "S-024", "S-001"]) == ["S-001", "S-024", "S-028"]
    assert graph.prerequisite_order(["S-034", "S-002"]) == ["S-034", "S-002"]
