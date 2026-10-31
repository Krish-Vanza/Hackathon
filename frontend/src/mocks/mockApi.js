// Dummy responses for `npm run dev:mock`. Shapes mirror the FastAPI backend, which is the source of truth.
// Fractions (role readiness, confidence, win_rate, growth) are 0 to 1. /api/readiness and *_mape are percentages.

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
const PENDING_REVIEW = { review_status: "pending", review_label: "Awaiting HR review", review_comment: "" };

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
  return {
    employee_id: employee.employee_id,
    role_id: employee.role_id,
    role_title: ROLES[employee.role_id].title,
    department: employee.department,
    skills: Object.entries(employee.levels).map(([skillId, level]) => {
      const skill = skillById(skillId);
      return {
        skill_id: skillId,
        name: skill.name,
        category: skill.category,
        effective_level: level,
        evidence_strength: 0.8,
        evidence: [
          { source: "manager", level: Math.min(5, level + 0.2), date: "2026-06-12" },
          { source: "project", level, date: "2026-02-03" },
          { source: "self", level: Math.min(5, level + 0.5), date: "2024-09-20" },
        ],
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
  return { matches, explanation: explanation(`Found ${matches.length} known skills in the text.`, [], 0.75, "Skill extraction", "template") };
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
  const forecast = Array.from({ length: 4 }, (_, offset) => demandAt(20 + offset));
  return {
    skill_id: skill.skill_id,
    name: skill.name,
    current_demand: history.at(-1).demand_fte,
    forecast_demand: forecast.at(-1),
    growth: skill.growth_pct / 100,
    trend_status: trendStatus(skill.growth_pct),
    history,
    quarters: forecast.map((_, offset) => quarterLabel(20 + offset)),
    forecast,
    low: forecast.map((value, offset) => round(value * (1 - 0.03 * (offset + 1)))),
    high: forecast.map((value, offset) => round(value * (1 + 0.03 * (offset + 1)))),
    flag: flaggedForecasts.has(skill.skill_id) ? { review_id: `RV-${skill.skill_id}`, ...PENDING_REVIEW } : null,
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
      const { skill_id, name, current_demand, forecast_demand, growth, trend_status } = forecastFor(skill);
      return { skill_id, name, current_demand, forecast_demand, growth, trend_status };
    });
}

function forecastGaps() {
  return SKILLS.map((skill) => {
    const item = forecastFor(skill);
    const supply = round(item.current_demand * 0.885);
    return {
      skill_id: skill.skill_id,
      name: skill.name,
      current_demand: item.current_demand,
      forecast_demand: item.forecast_demand,
      projected_supply: supply,
      future_gap: round(item.forecast_demand - supply),
    };
  }).sort((a, b) => b.future_gap - a.future_gap);
}

function learning(employeeId) {
  const employee = findEmployee(employeeId);
  const targetRole = employee.employee_id === "E-0007" ? "R-ML" : employee.role_id;
  const gapIds = new Set(gapsFor(employee, targetRole).map((gap) => gap.skill_id));
  const courses = COURSES.filter((course) => course.skills_taught.some((skillId) => gapIds.has(skillId))).map((course) => {
    const closes = course.skills_taught.filter((skillId) => gapIds.has(skillId));
    const names = closes.map((skillId) => skillById(skillId).name).join(" and ");
    return { ...course, score: 0.81, closes_gaps: closes, reason: `Closes your ${names} gap, and forecast demand for it is rising.` };
  });
  const totalHours = courses.reduce((sum, course) => sum + course.hours, 0);
  return {
    employee_id: employeeId,
    role_id: targetRole,
    role_title: ROLES[targetRole].title,
    courses,
    total_hours: totalHours,
    weeks: round(totalHours / 6),
    hidden: false,
    ...PENDING_REVIEW,
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

function missingSkills(employee, roleId) {
  return gapsFor(employee, roleId).map(({ skill_id, name, required, effective }) => {
    const course = COURSES.find((item) => item.skills_taught.includes(skill_id));
    return { skill_id, name, current: effective, required, course_id: course?.course_id ?? null, course_title: course?.title ?? null, hours: course?.hours ?? 0 };
  });
}

function matchFor(employee, roleId) {
  const missing = missingSkills(employee, roleId);
  const hours = missing.reduce((sum, skill) => sum + skill.hours, 0);
  return { role_id: roleId, role_title: ROLES[roleId].title, readiness: roleReadiness(employee, roleId), missing_skills: missing, bridge_hours: hours, bridge_weeks: round(hours / 6) };
}

function mobility(employeeId) {
  const employee = findEmployee(employeeId);
  const matches = Object.keys(ROLES)
    .filter((roleId) => roleId !== employee.role_id)
    .map((roleId) => {
      const match = matchFor(employee, roleId);
      const { readiness, missing_skills: missing } = match;
      return {
        ...match,
        ...PENDING_REVIEW,
        explanation: explanation(
          `${Math.round(readiness * 100)}% of the criticality-weighted skill levels for ${ROLES[roleId].title} are met.`,
          missing.slice(0, 3).map((gap) => [gap.name, `${gap.current} of ${gap.required} required`, 0.3]),
          0.8,
          "Role readiness",
        ),
      };
    })
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, 3);
  return { employee_id: employeeId, matches, decision_support: true };
}

function roleCandidates(roleId, role) {
  if (role !== "hr") throw new MockError(403, "HR role required");
  if (!ROLES[roleId]) throw new MockError(404, `Role ${roleId} not found`);
  const candidates = EMPLOYEES.filter((employee) => employee.role_id !== roleId)
    .map((employee) => ({ ...matchFor(employee, roleId), employee_id: employee.employee_id, department: employee.department }))
    .sort((a, b) => b.readiness - a.readiness);
  return { role_id: roleId, role_title: ROLES[roleId].title, candidates };
}

function career(employeeId) {
  const employee = findEmployee(employeeId);
  const step = (roleId, weeks) => ({ role_id: roleId, role_title: ROLES[roleId].title, missing_skills: missingSkills(employee, roleId), weeks });
  return {
    employee_id: employeeId,
    current_role_id: employee.role_id,
    paths: [
      {
        target_role_id: "R-AI",
        target_title: ROLES["R-AI"].title,
        steps: [step("R-ML", 12), step("R-AI", 26)],
        total_weeks: 38,
        ...PENDING_REVIEW,
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
        target_role_id: "R-DE",
        target_title: ROLES["R-DE"].title,
        steps: [step("R-DE", 16)],
        total_weeks: 16,
        ...PENDING_REVIEW,
        explanation: explanation("A single move that reuses SQL and Python strengths.", [["Skill distance", "1 role move", 0.7]], 0.71, "Role graph shortest path"),
      },
    ],
  };
}

function marketBrief() {
  const brief = "Agentic AI (SK-007) leads demand growth, followed by Prompt Engineering (SK-008) and MLOps (SK-006). Manual Testing (SK-011) continues to decline.";
  return { brief, skills: [], explanation: explanation(brief, [["Agentic AI", "+26% over four quarters", 1]], 0.7, "Summary of stored forecasts", "template") };
}

function riskRows() {
  return forecastGaps()
    .map((gap, index) => {
      const skill = skillById(gap.skill_id);
      const shortage = round(Math.max(0, gap.future_gap / gap.forecast_demand) * 100);
      const market_growth = Math.max(0, Math.min(100, skill.growth_pct * 2));
      const concentration = skill.skill_id === "SK-007" ? 100 : 25;
      const centrality = round(skill.criticality * 100);
      const score = round(0.4 * shortage + 0.25 * concentration + 0.2 * market_growth + 0.15 * centrality);
      return {
        skill_id: skill.skill_id,
        name: skill.name,
        score,
        level: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
        shortage,
        concentration,
        market_growth,
        centrality,
        exposed_departments: skill.skill_id === "SK-007" ? ["Data & AI"] : [],
        explanation: explanation(
          `${skill.name} scores ${score} out of 100.`,
          [
            ["Shortage", `${shortage}% of demand unmet`, 0.4],
            ["Concentration", `${concentration}% of departments exposed`, 0.25],
            ["Market growth", `${skill.growth_pct}% over four quarters`, 0.2],
            ["Graph centrality", `${centrality} of 100`, 0.15],
          ],
          0.75 + index * 0.001,
          "Weighted risk score",
        ),
      };
    })
    .sort((a, b) => b.score - a.score);
}

const reviewQueue = [
  ["RV-1", "mobility", "E-0007", "R-ML", "E-0007 to ML Engineer", { role_id: "R-ML", role_title: "ML Engineer", readiness: 0.84, bridge_weeks: 7 }],
  ["RV-2", "learning_plan", "E-0007", "R-BE", "Learning plan for E-0007", { role_id: "R-BE", course_ids: ["C-102"], weeks: 2.3 }],
  ["RV-3", "career_plan", "E-0007", "R-AI", "E-0007 career path to AI Solutions Architect", { target_role_id: "R-AI", total_weeks: 38 }],
  ["RV-4", "skill_claim", "E-0023", "SK-006", "Skill claim: MLOps", { skill_id: "SK-006", confidence: 0.62 }],
].map(([review_id, type, subject_id, key, title, payload]) => ({
  review_id,
  type,
  subject_id,
  key,
  title,
  payload,
  status: "pending",
  comment: "",
  decided_by: null,
  decided_at: null,
  created_at: "2026-10-31T09:00:00Z",
  explanation: explanation(`${title}, waiting for HR.`, [["Suggested by", "workforce rules", 1]], 0.8, "Role readiness"),
}));

const auditEvents = reviewQueue.map((review) => ({
  event: "review_submitted",
  actor: "system",
  entity: review.review_id,
  detail: { type: review.type, subject_id: review.subject_id },
  at: review.created_at,
}));

function listReviews(status, type) {
  return reviewQueue.filter((review) => (!status || review.status === status) && (!type || review.type === type));
}

function decideReview(reviewId, body, role) {
  if (role !== "hr") throw new MockError(403, "HR role required");
  const review = reviewQueue.find((item) => item.review_id === reviewId);
  if (!review) throw new MockError(404, `Review ${reviewId} not found`);
  if (review.status !== "pending") throw new MockError(409, `Review ${reviewId} is already ${review.status}`);
  const at = new Date().toISOString();
  Object.assign(review, {
    status: body.decision,
    comment: body.comment,
    decided_by: role,
    decided_at: at,
    payload: { ...review.payload, ...body.override },
  });
  auditEvents.unshift({ event: `review_${body.decision}`, actor: role, entity: reviewId, detail: { type: review.type, comment: body.comment }, at });
  return review;
}

function workforceReport() {
  const pipeline = { pending: 0, approved: 0, rejected: 0, overridden: 0 };
  listReviews(null, "mobility").forEach((review) => (pipeline[review.status] += 1));
  return {
    generated_at: new Date().toISOString(),
    data_source: "mock",
    note: "Generated from dummy data.",
    readiness: {
      now: 74.2,
      no_action: 61.3,
      with_plans: 79.1,
      explanation: explanation(
        "Readiness is 74.2% now, 61.3% in four quarters with no action, and 79.1% with recommended plans.",
        [
          ["Attrition", "3% per quarter", 0.5, "down"],
          ["Recommended plans", "70% assumed completion", 0.5],
        ],
        0.7,
        "Demand-weighted coverage, capped per skill",
      ),
    },
    top_gaps: forecastGaps().filter((gap) => gap.future_gap > 0).slice(0, 10),
    top_risks: riskRows().slice(0, 10),
    mobility_pipeline: pipeline,
    accuracy: { available: true, model_mape: 6.4, naive_mape: 9.8, win_rate: 0.75, note: "Backtest on dummy data, not real workforce data." },
  };
}

function workforceCsv() {
  const { note, top_risks: risks } = workforceReport();
  return [note, "Skill ID,Skill,Risk score,Risk level", ...risks.map((row) => `${row.skill_id},${row.name},${row.score},${row.level}`)].join("\n");
}

const routes = [
  ["GET", /^\/api\/health$/, () => ({ status: "ok", database: "ok", data_source: "mock", llm_mode: "mock" })],
  ["GET", /^\/api\/me$/, (_, __, { role }) => ({ role })],
  ["GET", /^\/api\/skills$/, () => SKILLS],
  ["GET", /^\/api\/employees$/, () => EMPLOYEES.map(({ employee_id, role_id, department }) => ({ employee_id, role_id, role_title: ROLES[role_id].title, department }))],
  ["GET", /^\/api\/employees\/([^/]+)\/profile$/, ([employeeId]) => profile(employeeId)],
  ["GET", /^\/api\/employees\/([^/]+)\/gaps$/, ([employeeId], query) => gaps(employeeId, query.get("role_id"))],
  ["GET", /^\/api\/gaps\/org$/, orgGaps],
  ["GET", /^\/api\/graph$/, (_, query) => graph(query.get("focus"))],
  ["POST", /^\/api\/skills\/extract$/, (_, __, { body }) => extractSkills(body?.text)],
  [
    "GET",
    /^\/api\/market\/trends$/,
    () =>
      [...SKILLS]
        .sort((a, b) => b.growth_pct - a.growth_pct)
        .map(({ skill_id, name, category, growth_pct }) => ({ skill_id, name, category, yoy_growth: growth_pct / 100, status: trendStatus(growth_pct) })),
  ],
  ["GET", /^\/api\/market\/brief$/, marketBrief],
  ["GET", /^\/api\/forecast\/skills$/, (_, query) => risingSkills(Number(query.get("top")) || 10)],
  ["GET", /^\/api\/forecast\/accuracy$/, () => ({ version: "mock-1", trained_at: "2026-10-31T09:00:00Z", model_mape: 6.4, naive_mape: 9.8, win_rate: 0.75, available: true, beats_naive: true, note: "Backtest on dummy data, not real workforce data." })],
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
      return { review_id: `RV-${skillId}`, ...PENDING_REVIEW };
    },
  ],
  ["GET", /^\/api\/readiness$/, () => ({ now: 74.2, no_action: 61.3, with_plans: 79.1 })],
  ["GET", /^\/api\/courses$/, () => COURSES],
  ["GET", /^\/api\/learning\/([^/]+)$/, ([employeeId]) => learning(employeeId)],
  ["GET", /^\/api\/mobility\/roles\/([^/]+)\/candidates$/, ([roleId], _, { role }) => roleCandidates(roleId, role)],
  ["GET", /^\/api\/mobility\/([^/]+)$/, ([employeeId]) => mobility(employeeId)],
  ["GET", /^\/api\/career\/([^/]+)$/, ([employeeId]) => career(employeeId)],
  ["GET", /^\/api\/risk$/, riskRows],
  ["GET", /^\/api\/reviews$/, (_, query) => listReviews(query.get("status"), query.get("type"))],
  ["POST", /^\/api\/reviews\/([^/]+)\/decision$/, ([reviewId], _, { body, role }) => decideReview(reviewId, body, role)],
  ["GET", /^\/api\/audit$/, () => auditEvents],
  ["GET", /^\/api\/reports\/workforce$/, workforceReport],
  ["GET", /^\/api\/reports\/workforce\.csv$/, workforceCsv],
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
