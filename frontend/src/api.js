// Single entry point for backend calls. Every request sends X-Demo-Role (demo-only, not real auth).
// `npm run dev:mock` serves src/mocks/mockApi.js instead of calling FastAPI.
const USE_MOCK = import.meta.env.MODE === "mock";
const ROLE_KEY = "demo-role";
const PERSONA_KEY = "demo-persona";
const UNREACHABLE = "Cannot reach the API. Is the backend running on port 8000?";

export const ROLES = ["hr", "employee"];

// The employee the demo signs in as by default. This is the planted demo story.
export const DEFAULT_EMPLOYEE = "E-0007";

function readStoredRole() {
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    return ROLES.includes(stored) ? stored : "hr";
  } catch {
    return "hr";
  }
}

let currentRole = readStoredRole();

export function getRole() {
  return currentRole;
}

export function setRole(role) {
  currentRole = role;
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Storage can be blocked; the role still applies for this session.
  }
}

export function getPersona() {
  try {
    return localStorage.getItem(PERSONA_KEY) || DEFAULT_EMPLOYEE;
  } catch {
    return DEFAULT_EMPLOYEE;
  }
}

export function setPersona(employeeId) {
  try {
    localStorage.setItem(PERSONA_KEY, employeeId);
  } catch {
    // Storage can be blocked; the persona still applies for this session.
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, text = false } = {}) {
  if (USE_MOCK) {
    const { mockRequest } = await import("./mocks/mockApi.js");
    return mockRequest(path, { method, body, role: currentRole });
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        "X-Demo-Role": currentRole,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }

  // The Vite proxy answers 502 when FastAPI is not running.
  if (response.status === 502) throw new ApiError(502, UNREACHABLE);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return text ? response.text() : response.json();
}

const id = encodeURIComponent;

function queryString(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return query ? `?${query}` : "";
}

export const api = {
  health: () => request("/api/health"),
  me: () => request("/api/me"),
  skills: () => request("/api/skills"),
  employees: () => request("/api/employees"),
  profile: (employeeId) => request(`/api/employees/${id(employeeId)}/profile`),
  gaps: (employeeId, roleId) =>
    request(`/api/employees/${id(employeeId)}/gaps${roleId ? `?role_id=${id(roleId)}` : ""}`),
  orgGaps: () => request("/api/gaps/org"),
  graph: (focus) => request(`/api/graph${focus ? `?focus=${id(focus)}` : ""}`),
  extractSkills: (text, employeeId) => request("/api/skills/extract", { method: "POST", body: { text, employee_id: employeeId } }),
  marketTrends: () => request("/api/market/trends"),
  marketBrief: () => request("/api/market/brief"),
  risingSkills: (top = 10) => request(`/api/forecast/skills?top=${top}`),
  skillForecast: (skillId) => request(`/api/forecast/skills/${id(skillId)}`),
  forecastAccuracy: () => request("/api/forecast/accuracy"),
  forecastGaps: () => request("/api/forecast/gaps"),
  flagForecast: (skillId, reason) => request(`/api/forecast/skills/${id(skillId)}/flag`, { method: "POST", body: { reason } }),
  readiness: () => request("/api/readiness"),
  courses: () => request("/api/courses"),
  learning: (employeeId) => request(`/api/learning/${id(employeeId)}`),
  mobility: (employeeId) => request(`/api/mobility/${id(employeeId)}`),
  roleCandidates: (roleId) => request(`/api/mobility/roles/${id(roleId)}/candidates`),
  career: (employeeId) => request(`/api/career/${id(employeeId)}`),
  risk: () => request("/api/risk"),
  reviews: (status, type) => request(`/api/reviews${queryString({ status, type })}`),
  decideReview: (reviewId, decision) => request(`/api/reviews/${id(reviewId)}/decision`, { method: "POST", body: decision }),
  audit: () => request("/api/audit"),
  report: () => request("/api/reports/workforce"),
  reportCsv: () => request("/api/reports/workforce.csv", { text: true }),
};
