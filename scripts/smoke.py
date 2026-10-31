"""Call every API endpoint on a running backend. Run from the repo root:

    python scripts/smoke.py [base_url]

Safe on the shared database: POST calls target missing IDs or change nothing. Opening
the learning, mobility and career endpoints does queue pending HR reviews, as in normal use.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"
failures = 0


def call(path, expected=200, role="hr", body=None):
    global failures
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"X-Demo-Role": role, "Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    ok = status == expected
    failures += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {status} {'POST' if body is not None else 'GET '} {path}")
    try:
        return json.loads(raw)
    except ValueError:
        return None


def main():
    call("/api/health")
    call("/api/me")
    skills = call("/api/skills") or []
    employees = call("/api/employees") or []
    if not skills or not employees:
        print("FAIL no skills or employees returned, so the remaining checks cannot run")
        return 1
    employee, skill = employees[0]["employee_id"], skills[0]["skill_id"]
    role = employees[0]["role_id"]

    for path in (
        f"/api/employees/{employee}/profile",
        f"/api/employees/{employee}/gaps",
        f"/api/employees/{employee}/gaps?role_id={role}",
        "/api/gaps/org",
        "/api/graph",
        f"/api/graph?focus={skill}",
        "/api/market/trends",
        "/api/market/brief",
        "/api/forecast/skills?top=10",
        f"/api/forecast/skills/{skill}",
        "/api/forecast/accuracy",
        "/api/forecast/gaps",
        "/api/readiness",
        "/api/courses",
        f"/api/learning/{employee}",
        f"/api/mobility/{employee}",
        f"/api/mobility/roles/{role}/candidates",
        f"/api/career/{employee}",
        "/api/risk",
        "/api/reviews",
        "/api/reviews?status=pending",
        "/api/audit",
        "/api/reports/workforce",
        "/api/reports/workforce.csv",
    ):
        call(path)

    call("/api/skills/extract", body={"text": "Python and SQL"})
    call("/api/forecast/skills/__smoke__/flag", 404, body={"reason": "smoke"})
    call("/api/reviews/__smoke__/decision", 404, body={"decision": "approved"})
    call("/api/reviews/__smoke__/decision", 403, role="employee", body={"decision": "approved"})
    call(f"/api/mobility/roles/{role}/candidates", 403, role="employee")
    for path in ("/api/risk", "/api/reviews", "/api/audit", "/api/gaps/org", "/api/reports/workforce", "/api/reports/workforce.csv"):
        call(path, 403, role="employee")

    print(f"\n{failures} failed" if failures else "\nAll endpoints passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
