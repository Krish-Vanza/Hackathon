// Single entry point for backend calls. Every request sends X-Demo-Role (demo-only, not real auth).
// `npm run dev:mock` serves src/mocks/mockApi.js instead of calling FastAPI.
const USE_MOCK = import.meta.env.MODE === "mock";
const ROLE_KEY = "demo-role";

export const ROLES = ["employee", "hr"];

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

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
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
    throw new ApiError(0, "Cannot reach the API. Is the backend running on port 8000?");
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return response.json();
}

const id = encodeURIComponent;

export const api = {
  me: () => request("/api/me"),
  skills: () => request("/api/skills"),
  employees: () => request("/api/employees"),
  profile: (employeeId) => request(`/api/employees/${id(employeeId)}/profile`),
  gaps: (employeeId, roleId) =>
    request(`/api/employees/${id(employeeId)}/gaps${roleId ? `?role_id=${id(roleId)}` : ""}`),
  orgGaps: () => request("/api/gaps/org"),
  graph: (focus) => request(`/api/graph${focus ? `?focus=${id(focus)}` : ""}`),
  extractSkills: (text) => request("/api/skills/extract", { method: "POST", body: { text } }),
  marketTrends: () => request("/api/market/trends"),
  marketBrief: () => request("/api/market/brief"),
  risingSkills: (top = 10) => request(`/api/forecast/skills?top=${top}`),
  skillForecast: (skillId) => request(`/api/forecast/skills/${id(skillId)}`),
  forecastAccuracy: () => request("/api/forecast/accuracy"),
  forecastGaps: () => request("/api/forecast/gaps"),
  flagForecast: (skillId) => request(`/api/forecast/skills/${id(skillId)}/flag`, { method: "POST" }),
  readiness: () => request("/api/readiness"),
  courses: () => request("/api/courses"),
  learning: (employeeId) => request(`/api/learning/${id(employeeId)}`),
  mobility: (employeeId) => request(`/api/mobility/${id(employeeId)}`),
  roleCandidates: (roleId) => request(`/api/mobility/roles/${id(roleId)}/candidates`),
  career: (employeeId) => request(`/api/career/${id(employeeId)}`),
};
