"""Fixed taxonomy for the dummy data: skills, roles, courses and departments.

These IDs are the contract everyone builds against, so change them only after
telling the team.
"""

# (skill_id, name, category, criticality 0-1, prerequisites, related, aliases, market profile)
# Market profile drives the dummy market signals: emerging, rising, stable or declining.
SKILL_ROWS = [
    ("S-001", "Python", "Programming", 0.9, [], ["S-002", "S-011"], ["py"], "stable"),
    ("S-002", "Java", "Programming", 0.7, [], ["S-001", "S-004"], ["jvm"], "declining"),
    ("S-003", "JavaScript", "Programming", 0.7, [], ["S-031"], ["js", "ecmascript"], "stable"),
    ("S-004", "Go", "Programming", 0.6, [], ["S-002"], ["golang"], "rising"),
    ("S-005", "SQL", "Data", 0.8, [], ["S-011", "S-012"], ["postgres", "mysql"], "stable"),
    ("S-006", "REST API Design", "Programming", 0.7, ["S-001"], ["S-007"], ["rest", "fastapi"], "stable"),
    ("S-007", "Microservices", "Programming", 0.7, ["S-006"], ["S-015"], ["service mesh"], "stable"),
    ("S-008", "Git", "Practices", 0.5, [], ["S-017"], ["github", "version control"], "stable"),
    ("S-009", "Unit Testing", "Practices", 0.6, [], ["S-017"], ["pytest", "tdd"], "stable"),
    ("S-010", "System Design", "Practices", 0.8, ["S-006"], ["S-007"], ["architecture"], "rising"),
    ("S-011", "Pandas", "Data", 0.6, ["S-001"], ["S-012"], ["dataframes"], "stable"),
    ("S-012", "Data Engineering", "Data", 0.8, ["S-005", "S-001"], ["S-013", "S-011"], ["etl", "pipelines"], "rising"),
    ("S-013", "Apache Spark", "Data", 0.6, ["S-012"], ["S-012"], ["spark", "pyspark"], "stable"),
    ("S-014", "Data Visualization", "Data", 0.5, ["S-005"], ["S-011"], ["power bi", "tableau", "dashboards"], "stable"),
    ("S-015", "Docker", "Cloud & DevOps", 0.7, [], ["S-016"], ["containers"], "stable"),
    ("S-016", "Kubernetes", "Cloud & DevOps", 0.8, ["S-015"], ["S-018"], ["k8s"], "rising"),
    ("S-017", "CI/CD", "Cloud & DevOps", 0.7, ["S-008"], ["S-015"], ["jenkins", "github actions"], "stable"),
    ("S-018", "AWS", "Cloud & DevOps", 0.8, [], ["S-019", "S-020"], ["amazon web services"], "stable"),
    ("S-019", "Azure", "Cloud & DevOps", 0.7, [], ["S-018"], ["microsoft azure"], "rising"),
    ("S-020", "Terraform", "Cloud & DevOps", 0.6, ["S-018"], ["S-016"], ["infrastructure as code", "iac"], "rising"),
    ("S-021", "On-Prem Server Admin", "Cloud & DevOps", 0.4, [], ["S-018"], ["sysadmin", "data center"], "declining"),
    ("S-022", "Statistics", "AI & ML", 0.7, [], ["S-023"], ["probability"], "stable"),
    ("S-023", "Machine Learning", "AI & ML", 0.9, ["S-001", "S-022"], ["S-024", "S-011"], ["ml", "scikit-learn"], "rising"),
    ("S-024", "Deep Learning", "AI & ML", 0.8, ["S-023"], ["S-025"], ["pytorch", "tensorflow", "neural networks"], "rising"),
    ("S-025", "NLP", "AI & ML", 0.7, ["S-023"], ["S-026"], ["natural language processing"], "rising"),
    ("S-026", "Generative AI", "AI & ML", 0.9, ["S-024"], ["S-027", "S-028"], ["genai", "llm", "large language models"], "emerging"),
    ("S-027", "Prompt Engineering", "AI & ML", 0.6, [], ["S-026"], ["prompting"], "emerging"),
    ("S-028", "Agentic AI", "AI & ML", 1.0, ["S-026", "S-006"], ["S-026", "S-029"], ["ai agents", "multi-agent", "agents"], "emerging"),
    ("S-029", "Vector Databases", "AI & ML", 0.7, ["S-005"], ["S-028"], ["embeddings", "rag", "pinecone"], "emerging"),
    ("S-030", "MLOps", "AI & ML", 0.8, ["S-023", "S-017"], ["S-016"], ["model deployment", "mlflow"], "rising"),
    ("S-031", "React", "Frontend", 0.6, ["S-003"], ["S-032"], ["reactjs"], "stable"),
    ("S-032", "TypeScript", "Frontend", 0.6, ["S-003"], ["S-031"], ["ts"], "rising"),
    ("S-033", "jQuery", "Frontend", 0.3, ["S-003"], ["S-003"], [], "declining"),
    ("S-034", "UX Design", "Frontend", 0.5, [], ["S-031"], ["figma", "user experience"], "stable"),
    ("S-035", "Application Security", "Security", 0.8, ["S-006"], ["S-036"], ["appsec", "owasp"], "rising"),
    ("S-036", "Cloud Security", "Security", 0.8, ["S-018"], ["S-035"], ["iam"], "rising"),
    ("S-037", "AI Governance", "Security", 0.7, ["S-026"], ["S-028"], ["responsible ai", "ai ethics"], "emerging"),
    ("S-038", "Agile Delivery", "Practices", 0.5, [], ["S-039"], ["scrum", "kanban"], "stable"),
    ("S-039", "Stakeholder Communication", "Practices", 0.6, [], ["S-040"], ["communication"], "stable"),
    ("S-040", "Technical Leadership", "Practices", 0.7, ["S-039"], ["S-010"], ["mentoring", "tech lead"], "stable"),
]

SKILL_IDS = [row[0] for row in SKILL_ROWS]
AGENTIC_AI = "S-028"

# (role_id, title, {skill_id: required level 1-5}, next_roles)
ROLE_ROWS = [
    ("R-01", "Backend Engineer", {"S-001": 4, "S-005": 3, "S-006": 4, "S-007": 3, "S-008": 3, "S-009": 3, "S-015": 3}, ["R-05", "R-06", "R-07", "R-09"]),
    ("R-02", "Frontend Engineer", {"S-003": 4, "S-031": 4, "S-032": 3, "S-034": 2, "S-008": 3, "S-009": 3}, ["R-01", "R-10"]),
    ("R-03", "Data Analyst", {"S-005": 4, "S-011": 3, "S-014": 4, "S-022": 3, "S-039": 3}, ["R-04", "R-05"]),
    ("R-04", "Data Engineer", {"S-001": 4, "S-005": 4, "S-012": 4, "S-013": 3, "S-018": 2, "S-017": 2}, ["R-05", "R-07"]),
    ("R-05", "ML Engineer", {"S-001": 4, "S-022": 3, "S-023": 4, "S-024": 3, "S-030": 3, "S-011": 3, "S-006": 3}, ["R-09", "R-10"]),
    ("R-06", "DevOps Engineer", {"S-015": 4, "S-016": 4, "S-017": 4, "S-018": 3, "S-020": 3, "S-008": 3}, ["R-07", "R-08"]),
    ("R-07", "Cloud Architect", {"S-018": 4, "S-019": 3, "S-016": 3, "S-020": 3, "S-010": 4, "S-036": 3}, ["R-10"]),
    ("R-08", "Security Engineer", {"S-035": 4, "S-036": 4, "S-018": 3, "S-006": 2, "S-017": 2}, ["R-07"]),
    ("R-09", "AI Engineer", {"S-001": 4, "S-026": 4, "S-027": 3, "S-028": 4, "S-029": 3, "S-006": 3, "S-037": 2}, ["R-10"]),
    ("R-10", "Engineering Manager", {"S-040": 4, "S-039": 4, "S-038": 3, "S-010": 3}, []),
]

ROLE_IDS = [row[0] for row in ROLE_ROWS]

DEPARTMENTS = ["Product Engineering", "Data & AI", "Cloud Platform", "Digital Services", "Cyber Security"]

# Which roles each department mainly hires for.
DEPARTMENT_ROLES = {
    "Product Engineering": ["R-01", "R-02", "R-10"],
    "Data & AI": ["R-03", "R-04", "R-05", "R-09"],
    "Cloud Platform": ["R-06", "R-07", "R-01"],
    "Digital Services": ["R-01", "R-02", "R-03", "R-09"],
    "Cyber Security": ["R-08", "R-06"],
}

# The planted story: Digital Services relies on one Agentic AI expert.
SINGLE_EXPERT_DEPARTMENT = "Digital Services"
SINGLE_EXPERT_EMPLOYEE = "E-0023"
MOBILITY_STAR = "E-0007"  # Backend Engineer who is a strong fit for ML Engineer

# (course_id, title, [(skill_id, target level)], hours, is_certification)
COURSE_ROWS = [
    ("C-001", "Python for Professionals", [("S-001", 4)], 16, False),
    ("C-002", "SQL Deep Dive", [("S-005", 4)], 12, False),
    ("C-003", "Designing REST APIs with FastAPI", [("S-006", 4)], 10, False),
    ("C-004", "Microservices Patterns", [("S-007", 4), ("S-010", 3)], 14, False),
    ("C-005", "System Design Interview to Practice", [("S-010", 4)], 12, False),
    ("C-006", "Data Wrangling with Pandas", [("S-011", 4)], 8, False),
    ("C-007", "Building Data Pipelines", [("S-012", 4), ("S-013", 3)], 20, False),
    ("C-008", "Dashboards that Drive Decisions", [("S-014", 4)], 6, False),
    ("C-009", "Docker and Kubernetes Essentials", [("S-015", 4), ("S-016", 3)], 18, False),
    ("C-010", "Certified Kubernetes Administrator Prep", [("S-016", 5)], 30, True),
    ("C-011", "CI/CD with GitHub Actions", [("S-017", 4), ("S-008", 4)], 8, False),
    ("C-012", "AWS Solutions Architect Associate", [("S-018", 4), ("S-010", 3)], 35, True),
    ("C-013", "Azure Fundamentals", [("S-019", 3)], 10, True),
    ("C-014", "Terraform from Zero", [("S-020", 4)], 12, False),
    ("C-015", "Practical Statistics", [("S-022", 4)], 14, False),
    ("C-016", "Machine Learning Foundations", [("S-023", 3), ("S-022", 3)], 24, False),
    ("C-017", "Applied Machine Learning", [("S-023", 4)], 20, False),
    ("C-018", "Deep Learning with PyTorch", [("S-024", 4)], 24, False),
    ("C-019", "NLP in Practice", [("S-025", 4)], 16, False),
    ("C-020", "Generative AI for Engineers", [("S-026", 4), ("S-027", 3)], 16, False),
    ("C-021", "Building AI Agents", [("S-028", 4), ("S-029", 3)], 20, False),
    ("C-022", "Agentic AI Professional Certificate", [("S-028", 5), ("S-037", 3)], 30, True),
    ("C-023", "Vector Search and RAG", [("S-029", 4)], 10, False),
    ("C-024", "MLOps in Production", [("S-030", 4), ("S-016", 3)], 18, False),
    ("C-025", "Modern React with TypeScript", [("S-031", 4), ("S-032", 4)], 16, False),
    ("C-026", "Secure Coding and OWASP Top 10", [("S-035", 4)], 12, False),
    ("C-027", "Cloud Security Specialty", [("S-036", 4)], 28, True),
    ("C-028", "Responsible AI and Governance", [("S-037", 4)], 8, False),
    ("C-029", "Leading Engineering Teams", [("S-040", 4), ("S-039", 4)], 12, False),
    ("C-030", "Agile Delivery in Practice", [("S-038", 4)], 6, False),
]

# Quarters of market history: 2021-Q4 to 2026-Q3 (20 quarters).
FIRST_QUARTER = (2021, 4)
N_QUARTERS = 20


def quarter_label(year: int, q: int) -> str:
    return f"{year}-Q{q}"


def quarter_seq(start=FIRST_QUARTER, n=N_QUARTERS) -> list[str]:
    year, q = start
    out = []
    for _ in range(n):
        out.append(quarter_label(year, q))
        q += 1
        if q == 5:
            year, q = year + 1, 1
    return out


def next_quarters(last: str, n: int) -> list[str]:
    year, q = int(last[:4]), int(last[-1])
    q += 1
    if q == 5:
        year, q = year + 1, 1
    return quarter_seq((year, q), n)
