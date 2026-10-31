"""Skills knowledge graph, built in memory with NetworkX from MongoDB.

Nodes are skills and roles. Edges:
  prerequisite_of  skill -> skill   (must learn the source first)
  related_to       skill -- skill   (stored once, shown undirected)
  required_by      skill -> role    (with the required level)

Public functions: get_graph(focus=None), centrality(skill_id),
prerequisite_order(skill_ids), refresh_graph().
"""

import networkx as nx

from app import db as dbm

_graph = None
_centrality = None


def build_graph(skills: list[dict], roles: list[dict]) -> nx.DiGraph:
    g = nx.DiGraph()
    for s in skills:
        g.add_node(s["skill_id"], type="skill", label=s["name"], category=s["category"], criticality=s["criticality"])
    for r in roles:
        g.add_node(r["role_id"], type="role", label=r["title"], category="Role", criticality=None)
    for s in skills:
        for pre in s.get("prerequisites", []):
            g.add_edge(pre, s["skill_id"], type="prerequisite_of")
        for rel in s.get("related", []):
            if rel != s["skill_id"] and not g.has_edge(rel, s["skill_id"]):
                g.add_edge(s["skill_id"], rel, type="related_to")
    for r in roles:
        for req in r["required_skills"]:
            g.add_edge(req["skill_id"], r["role_id"], type="required_by", level=req["level"])
    return g


def compute_centrality(g: nx.DiGraph) -> dict[str, float]:
    """Betweenness on the undirected graph, scaled so the top skill is 1.0.

    A high score means many roles and skills connect through this skill, so
    losing people with it hurts more. Harshit's risk score uses it.
    """
    between = nx.betweenness_centrality(g.to_undirected())
    skills = [n for n, d in g.nodes(data=True) if d["type"] == "skill"]
    top = max((between[n] for n in skills), default=0) or 1.0
    return {n: round(between[n] / top, 4) for n in skills}


def _load():
    global _graph, _centrality
    if _graph is None:
        db = dbm.get_db()
        skills = list(db[dbm.SKILLS].find({}, {"_id": 0}))
        roles = list(db[dbm.ROLES].find({}, {"_id": 0}))
        _graph = build_graph(skills, roles)
        _centrality = compute_centrality(_graph)
    return _graph, _centrality


def refresh_graph() -> None:
    """Rebuild on next use, for example after reseeding."""
    global _graph, _centrality
    _graph, _centrality = None, None


def centrality(skill_id: str) -> float:
    _, cent = _load()
    return cent.get(skill_id, 0.0)


def get_graph(focus: str | None = None) -> dict:
    """Nodes and edges for the frontend. With focus, only that node and its neighbours."""
    g, cent = _load()
    if focus:
        if focus not in g:
            raise KeyError(focus)
        keep = {focus} | set(g.predecessors(focus)) | set(g.successors(focus))
        g = g.subgraph(keep)
    nodes = [
        {
            "id": n,
            "label": d["label"],
            "type": d["type"],
            "category": d["category"],
            "criticality": d["criticality"],
            "centrality": cent.get(n, 0.0),
            "degree": g.degree(n),
        }
        for n, d in g.nodes(data=True)
    ]
    edges = [
        {"source": u, "target": v, "type": d["type"], **({"level": d["level"]} if "level" in d else {})}
        for u, v, d in g.edges(data=True)
    ]
    return {"nodes": nodes, "edges": edges, "focus": focus}


def prerequisite_order(skill_ids: list[str]) -> list[str]:
    """Order skills so prerequisites come first. Unrelated skills keep their input order."""
    g, _ = _load()
    wanted = list(dict.fromkeys(skill_ids))
    pre = nx.DiGraph()
    pre.add_nodes_from(wanted)
    prereq_edges = [(u, v) for u, v, d in g.edges(data=True) if d["type"] == "prerequisite_of"]
    prereq_graph = nx.DiGraph(prereq_edges)
    for a in wanted:
        for b in wanted:
            if a != b and a in prereq_graph and b in prereq_graph and nx.has_path(prereq_graph, a, b):
                pre.add_edge(a, b)
    position = {s: i for i, s in enumerate(wanted)}
    return list(nx.lexicographical_topological_sort(pre, key=lambda s: position[s]))
