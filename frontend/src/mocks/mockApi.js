// Dummy responses for `npm run dev:mock`, written from plan.md sections 4, 5 and 8.
// These shapes are what the pages read, so they double as the proposed contract for the real API.
// Fractions (readiness, confidence, win_rate) are 0 to 1. growth_pct and *_mape are percentages.

const SKILLS = [
  ["SK-001", "Python", "Programming", 0.8, 3],
  ["SK-002", "SQL", "Data", 0.7, 2],
  ["SK-003", "Cloud Architecture", "Cloud", 0.8, 6],
  ["SK-004", "Kubernetes", "Cloud", 0.7, 5],
  ["SK-005", "Machine Learning", "AI", 0.9, 8],
  ["SK-006", "MLOps", "AI", 0.8, 10],
  ["SK-007", "Agentic AI", "AI", 1.0, 26],
  ["SK-008", "Prompt Engineering", "AI", 0.6, 14],
  ["SK-009", "Data Engineering", "Data", 0.8, 7],
  ["SK-010", "Java", "Programming", 0.6, -3],
  ["SK-011", "Manual Testing", "Quality", 0.3, -8],
  ["SK-012", "Stakeholder Management", "Business", 0.5, 1],
].map(([skill_id, name, category, criticality, growth_pct]) => ({
  skill_id,
  name,
  category,
  criticality,
  growth_pct,
}));

const skillById = (skillId) => SKILLS.find((skill) => skill.skill_id === skillId);
const trendStatus = (growth) => (growth >= 8 ? "emerging" : growth <= -2 ? "declining" : "stable");
const round = (value, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

const ROLES = {
  "R-BE": { title: "Backend Engineer", required: { "SK-001": 4, "SK-002": 3, "SK-003": 3, "SK-010": 3 } },
  "R-ML": { title: "ML Engineer", required: { "SK-001": 4, "SK-005": 4, "SK-006": 3, "SK-002": 3 } },
  "R-AI": { title: "AI Solutions Architect", required: { "SK-005": 4, "SK-007": 4, "SK-003": 4, "SK-008": 3 } },
  "R-DE": { title: "Data Engineer", required: { "SK-001": 3, "SK-002": 4, "SK-009": 4, "SK-003": 3 } },
};

const EMPLOYEES = [
  ["E-0007", "R-BE", "Engineering", { "SK-001": 4.3, "SK-002": 3.4, "SK-003": 2.5, "SK-010": 3.2, "SK-005": 3.1, "SK-006": 1.8 }],
  ["E-0012", "R-ML", "Data & AI", { "SK-001": 4.0, "SK-005": 4.2, "SK-006": 3.3, "SK-002": 3.0, "SK-007": 4.6 }],
  ["E-0023", "R-DE", "Data & AI", { "SK-001": 3.3, "SK-002": 4.4, "SK-009": 3.1, "SK-003": 2.1 }],
  ["E-0031", "R-BE", "Platform", { "SK-001": 3.1, "SK-002": 2.4, "SK-003": 3.6, "SK-004": 3.2, "SK-010": 2.2 }],
].map(([employee_id, role_id, department, levels]) => ({ employee_id, role_id, department, levels }));

const COURSES = [
  ["C-101", "MLOps Foundations", ["SK-006"], "Intermediate", 18, false],
  ["C-102", "Cloud Architecture Essentials", ["SK-003"], "Intermediate", 14, false],
  ["C-103", "Applied Machine Learning", ["SK-005"], "Advanced", 22, false],
  ["C-104", "Certified ML Engineer", ["SK-005", "SK-006"], "Advanced", 24, true],
  ["C-105", "Building Agentic AI Systems", ["SK-007"], "Advanced", 16, false],
].map(([course_id, title, skills_taught, level, hours, is_certification]) => ({
  course_id,
  title,
  skills_taught,
  level,
  hours,
  is_certification,
}));

const flaggedForecasts = new Set();

const explanation = (summary, factors, confidence, method, source = "rules") => ({
  summary,
  factors: factors.map(([name, value, weight, direction = "up"]) => ({ name, value, weight, direction })),
  confidence,
  method,
  source,
});

class MockError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function findEmployee(employeeId) {
  const employee = EMPLOYEES.find((item) => item.employee_id === employeeId);
  if (!employee) throw new MockError(404, `Employee ${employeeId} not found`);
  return employee;
}

function roleReadiness(employee, roleId) {
  const required = Object.entries(ROLES[roleId].required);
  const weigh = (skillId) => skillById(skillId).criticality;
  const have = required.reduce((sum, [skillId, level]) => sum + Math.min(employee.levels[skillId] ?? 0, level) * weigh(skillId), 0);
  const need = required.reduce((sum, [skillId, level]) => sum + level * weigh(skillId), 0);
  return round(have / need, 2);
}

function gapsFor(employee, roleId) {
  return Object.entries(ROLES[roleId].required)
    .map(([skillId, required]) => {
      const skill = skillById(skillId);
      const effective = employee.levels[skillId] ?? 0;
      return {
        skill_id: skillId,
        name: skill.name,
        required,
        effective,
        severity: round(Math.max(0, required - effective) * skill.criticality, 2),
      };
    })
    .filter((gap) => gap.severity > 0)
    .sort((a, b) => b.severity - a.severity);
}

function profile(employeeId) {
  const employee = findEmployee(employeeId);
  const required = ROLES[employee.role_id].required;
  const skillIds = [...new Set([...Object.keys(employee.levels), ...Object.keys(required)])];
  return {
    employee_id: employee.employee_id,
    role_id: employee.role_id,
    role_title: ROLES[employee.role_id].title,
    department: employee.department,
    skills: skillIds.map((skillId) => {
      const skill = skillById(skillId);
      const level = employee.levels[skillId] ?? 0;
      return {
        skill_id: skillId,
        name: skill.name,
        category: skill.category,
        effective_level: level,
        required_level: required[skillId] ?? 0,
        evidence: level
          ? [
              { source: "manager", level: Math.min(5, level + 0.2), date: "2026-06-12" },
              { source: "project", level, date: "2026-02-03" },
              { source: "self", level: Math.min(5, level + 0.5), date: "2024-09-20" },
            ]
          : [],
      };
    }),
    explanation: explanation(
      "Levels combine manager, project, certification and self evidence.",
      [
        ["Manager evidence", "weight 0.4", 0.4],
        ["Project evidence", "weight 0.3", 0.3],
        ["Evidence older than 18 months", "counts half", 0.15, "down"],
      ],
      0.84,
      "Weighted evidence",
    ),
  };
}

function gaps(employeeId, roleId) {
  const employee = findEmployee(employeeId);
  const targetRole = ROLES[roleId] ? roleId : employee.role_id;
  const list = gapsFor(employee, targetRole);
  return {
    employee_id: employeeId,
    role_id: targetRole,
    role_title: ROLES[targetRole].title,
    gaps: list,
    explanation: explanation(
      list.length ? `Largest gap: ${list[0].name}.` : "No gaps against this role.",
      list.slice(0, 3).map((gap) => [gap.name, `${(gap.required - gap.effective).toFixed(1)} levels below target`, Math.min(1, gap.severity / 2)]),
      0.88,
      "Gap severity rules",
    ),
  };
}

function orgGaps() {
  const departments = ["Engineering", "Data & AI", "Platform", "Quality"];
  const categories = ["AI", "Cloud", "Data", "Programming", "Quality", "Business"];
  const cells = departments.flatMap((department, row) =>
    categories.map((category, column) => ({
      department,
      category,
      severity: round(((row * 3 + column * 5 + 2) % 13) / 10 + (category === "AI" ? 1.1 : 0), 2),
    })),
  );
  return { departments, categories, cells };
}

function graph(focus) {
  let nodes = [
    ...SKILLS.map((skill) => ({ id: skill.skill_id, label: skill.name, type: "skill", category: skill.category, centrality: round(skill.criticality * 0.7, 2) })),
    ...Object.entries(ROLES).map(([roleId, role]) => ({ id: roleId, label: role.title, type: "role", category: "Role", centrality: 0.35 })),
  ];
  let edges = [
    { source: "SK-001", target: "SK-005", type: "prerequisite_of" },
    { source: "SK-005", target: "SK-006", type: "prerequisite_of" },
    { source: "SK-005", target: "SK-007", type: "prerequisite_of" },
    { source: "SK-008", target: "SK-007", type: "related_to" },
    { source: "SK-003", target: "SK-004", type: "related_to" },
    { source: "SK-002", target: "SK-009", type: "prerequisite_of" },
    ...Object.entries(ROLES).flatMap(([roleId, role]) =>
      Object.keys(role.required).map((skillId) => ({ source: skillId, target: roleId, type: "required_by" })),
    ),
  ];
  if (focus) {
    edges = edges.filter((edge) => edge.source === focus || edge.target === focus);
    const kept = new Set(edges.flatMap((edge) => [edge.source, edge.target]).concat(focus));
    nodes = nodes.filter((node) => kept.has(node.id));
  }
  return { nodes, edges };
}

function extractSkills(text) {
  const lower = (text || "").toLowerCase();
  const matches = SKILLS.filter((skill) => lower.includes(skill.name.toLowerCase())).map((skill, index) => {
    const confidence = index % 3 === 2 ? 0.62 : 0.91;
    return { skill_id: skill.skill_id, name: skill.name, confidence, needs_review: confidence < 0.7 };
  });
  return { matches, source: "template" };
}

// Index 0 is 2021 Q4 and index 19 is 2026 Q3, matching the plan's 20 quarters.
function quarterLabel(index) {
  const absolute = 2021 * 4 + 3 + index;
  return `${Math.floor(absolute / 4)} Q${(absolute % 4) + 1}`;
}

function forecastFor(skill) {
  const quarterly = skill.growth_pct / 100 / 4;
  const base = 30 + (skill.skill_id.charCodeAt(5) % 7) * 8;
  const demandAt = (index) => round(base * (1 + quarterly) ** index * (1 + Math.sin(index * 1.7) * 0.015));
  const history = Array.from({ length: 20 }, (_, index) => ({ quarter: quarterLabel(index), demand_fte: demandAt(index) }));
  const forecast = Array.from({ length: 4 }, (_, offset) => ({ quarter: quarterLabel(20 + offset), demand_fte: demandAt(20 + offset) }));
  return {
    skill_id: skill.skill_id,
    name: skill.name,
    history,
    forecast,
    low: forecast.map((point, offset) => round(point.demand_fte * (1 - 0.03 * (offset + 1)))),
    high: forecast.map((point, offset) => round(point.demand_fte * (1 + 0.03 * (offset + 1)))),
    trend_status: trendStatus(skill.growth_pct),
    review_status: flaggedForecasts.has(skill.skill_id) ? "pending" : null,
    explanation: explanation(
      `${skill.name} demand is forecast to ${skill.growth_pct >= 0 ? "grow" : "fall"} about ${Math.abs(skill.growth_pct)}% over four quarters.`,
      [
        ["Recent demand change", `${(skill.growth_pct / 4).toFixed(1)}% per quarter`, 0.55, skill.growth_pct >= 0 ? "up" : "down"],
        ["Job posting growth", "above rolling average", 0.3],
        ["Skill category", skill.category, 0.15],
      ],
      0.78,
      "Ridge forecast",
      "model",
    ),
  };
}

function risingSkills(top) {
  return [...SKILLS]
    .sort((a, b) => b.growth_pct - a.growth_pct)
    .slice(0, top)
    .map((skill) => {
      const item = forecastFor(skill);
      return {
        skill_id: skill.skill_id,
        name: skill.name,
        current: item.history.at(-1).demand_fte,
        forecast_end: item.forecast.at(-1).demand_fte,
        growth_pct: skill.growth_pct,
        trend_status: item.trend_status,
      };
    });
}

function forecastGaps() {
  return SKILLS.map((skill) => {
    const item = forecastFor(skill);
    const demand = item.forecast.at(-1).demand_fte;
    const supply = round(item.history.at(-1).demand_fte * 0.885);
    return { skill_id: skill.skill_id, name: skill.name, forecast_demand: demand, projected_supply: supply, future_gap: round(demand - supply) };
  }).sort((a, b) => b.future_gap - a.future_gap);
}

function learning(employeeId) {
  const employee = findEmployee(employeeId);
  const targetRole = employee.employee_id === "E-0007" ? "R-ML" : employee.role_id;
  const gapIds = new Set(gapsFor(employee, targetRole).map((gap) => gap.skill_id));
  const plan = COURSES.filter((course) => course.skills_taught.some((skillId) => gapIds.has(skillId))).map((course) => {
    const closes = course.skills_taught.filter((skillId) => gapIds.has(skillId)).map((skillId) => skillById(skillId).name);
    return { ...course, closes, score: 0.81, reason: `Closes your ${closes.join(" and ")} gap, and forecast demand for it is rising.`, source: "template" };
  });
  const totalHours = plan.reduce((sum, course) => sum + course.hours, 0);
  return {
    employee_id: employeeId,
    plan,
    total_hours: totalHours,
    weeks: Math.ceil(totalHours / 6),
    review_status: "pending",
    explanation: explanation(
      "Courses rank by gap coverage, future demand and level fit, then follow prerequisite order.",
      [
        ["Gap coverage", "weight 0.5", 0.5],
        ["Future demand", "weight 0.3", 0.3],
        ["Level fit", "weight 0.2", 0.2],
      ],
      0.81,
      "Course score",
    ),
  };
}

function mobility(employeeId) {
  const employee = findEmployee(employeeId);
  const roles = Object.keys(ROLES)
    .filter((roleId) => roleId !== employee.role_id)
    .map((roleId) => {
      const missing = gapsFor(employee, roleId);
      const readiness = roleReadiness(employee, roleId);
      return {
        role_id: roleId,
        title: ROLES[roleId].title,
        readiness,
        missing_skills: missing.map(({ skill_id, name, required, effective }) => ({ skill_id, name, required, effective })),
        bridge_weeks: Math.ceil((missing.length * 16) / 6),
        status: "pending",
        explanation: explanation(
          `${Math.round(readiness * 100)}% of the criticality-weighted skill levels for ${ROLES[roleId].title} are met.`,
          missing.slice(0, 3).map((gap) => [gap.name, `level ${gap.effective} of ${gap.required}`, 0.3, "down"]),
          0.8,
          "Role readiness",
        ),
      };
    })
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, 3);
  return { employee_id: employeeId, roles };
}

function roleCandidates(roleId, role) {
  if (role !== "hr") throw new MockError(403, "HR role required");
  if (!ROLES[roleId]) throw new MockError(404, `Role ${roleId} not found`);
  const candidates = EMPLOYEES.filter((employee) => employee.role_id !== roleId)
    .map((employee) => ({
      employee_id: employee.employee_id,
      department: employee.department,
      readiness: roleReadiness(employee, roleId),
      missing_count: gapsFor(employee, roleId).length,
    }))
    .sort((a, b) => b.readiness - a.readiness);
  return { role_id: roleId, title: ROLES[roleId].title, candidates };
}

function career(employeeId) {
  const employee = findEmployee(employeeId);
  const step = (roleId, weeks) => ({
    role_id: roleId,
    title: ROLES[roleId].title,
    weeks,
    skills: gapsFor(employee, roleId).map((gap) => gap.name),
    courses: COURSES.filter((course) => course.skills_taught.some((skillId) => ROLES[roleId].required[skillId]))
      .slice(0, 2)
      .map((course) => course.title),
  });
  return {
    employee_id: employeeId,
    paths: [
      {
        path_id: "P-1",
        title: "Machine learning track",
        steps: [step("R-ML", 12), step("R-AI", 26)],
        total_weeks: 38,
        status: "pending",
        explanation: explanation(
          "The shortest path by skill distance on the role graph.",
          [
            ["Skill distance", "2 role moves", 0.6],
            ["Future demand", "AI skills rising", 0.4],
          ],
          0.74,
          "Role graph shortest path",
        ),
      },
      {
        path_id: "P-2",
        title: "Data track",
        steps: [step("R-DE", 16)],
        total_weeks: 16,
        status: "pending",
        explanation: explanation("A single move that reuses SQL and Python strengths.", [["Skill distance", "1 role move", 0.7]], 0.71, "Role graph shortest path"),
      },
    ],
  };
}

const marketBrief = () => ({
  summary: "Agentic AI (SK-007) leads demand growth, followed by Prompt Engineering (SK-008) and MLOps (SK-006). Manual Testing (SK-011) continues to decline.",
  cited_skill_ids: ["SK-007", "SK-008", "SK-006", "SK-011"],
  source: "template",
});

const routes = [
  ["GET", /^\/api\/me$/, (_, __, { role }) => ({ role })],
  ["GET", /^\/api\/skills$/, () => SKILLS],
  ["GET", /^\/api\/employees$/, () => EMPLOYEES.map(({ employee_id, role_id, department }) => ({ employee_id, role_id, role_title: ROLES[role_id].title, department }))],
  ["GET", /^\/api\/employees\/([^/]+)\/profile$/, ([employeeId]) => profile(employeeId)],
  ["GET", /^\/api\/employees\/([^/]+)\/gaps$/, ([employeeId], query) => gaps(employeeId, query.get("role_id"))],
  ["GET", /^\/api\/gaps\/org$/, orgGaps],
  ["GET", /^\/api\/graph$/, (_, query) => graph(query.get("focus"))],
  ["POST", /^\/api\/skills\/extract$/, (_, __, { body }) => extractSkills(body?.text)],
  ["GET", /^\/api\/market\/trends$/, () => SKILLS.map(({ skill_id, name, growth_pct }) => ({ skill_id, name, growth_pct, trend_status: trendStatus(growth_pct) }))],
  ["GET", /^\/api\/market\/brief$/, marketBrief],
  ["GET", /^\/api\/forecast\/skills$/, (_, query) => risingSkills(Number(query.get("top")) || 10)],
  ["GET", /^\/api\/forecast\/accuracy$/, () => ({ version: "mock-1", trained_at: "2026-10-31T09:00:00Z", model_mape: 6.4, naive_mape: 9.8, win_rate: 0.75 })],
  ["GET", /^\/api\/forecast\/gaps$/, forecastGaps],
  [
    "GET",
    /^\/api\/forecast\/skills\/([^/]+)$/,
    ([skillId]) => {
      const skill = skillById(skillId);
      if (!skill) throw new MockError(404, `Skill ${skillId} not found`);
      return forecastFor(skill);
    },
  ],
  [
    "POST",
    /^\/api\/forecast\/skills\/([^/]+)\/flag$/,
    ([skillId]) => {
      flaggedForecasts.add(skillId);
      return { review_id: `RV-${skillId}`, status: "pending" };
    },
  ],
  ["GET", /^\/api\/readiness$/, () => ({ now: 0.74, no_action: 0.61, with_plans: 0.79 })],
  ["GET", /^\/api\/courses$/, () => COURSES],
  ["GET", /^\/api\/learning\/([^/]+)$/, ([employeeId]) => learning(employeeId)],
  ["GET", /^\/api\/mobility\/roles\/([^/]+)\/candidates$/, ([roleId], _, { role }) => roleCandidates(roleId, role)],
  ["GET", /^\/api\/mobility\/([^/]+)$/, ([employeeId]) => mobility(employeeId)],
  ["GET", /^\/api\/career\/([^/]+)$/, ([employeeId]) => career(employeeId)],
];

export async function mockRequest(path, { method, body, role }) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const url = new URL(path, "http://mock.local");
  for (const [routeMethod, pattern, handler] of routes) {
    const match = url.pathname.match(pattern);
    if (match && routeMethod === method) {
      return handler(match.slice(1).map(decodeURIComponent), url.searchParams, { body, role });
    }
  }
  throw new MockError(404, `No mock for ${method} ${url.pathname}`);
}
