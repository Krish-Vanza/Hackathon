import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, ROLES } from "../../api.js";
import { useApi } from "../../hooks/useApi.js";
import { useRole } from "./RoleContext.jsx";
import { PageBoundary } from "./ui.jsx";

export const DEFAULT_EMPLOYEE = "E-0007";

const EMPLOYEE_SECTIONS = ["profile", "learning", "mobility", "career"];

const NAV_GROUPS = [
  {
    label: "Employee",
    links: [
      ["Skill Profile", "profile"],
      ["Learning Path", "learning"],
      ["Internal Mobility", "mobility"],
      ["Career Paths", "career"],
    ],
  },
  {
    label: "Analytics",
    links: [
      ["Forecast", "forecast"],
      ["Gap Heatmap", "gaps"],
      ["Knowledge Graph", "graph"],
    ],
  },
  {
    label: "Governance",
    links: [
      ["Risk", "risk"],
      ["HR Review", "review"],
      ["Audit Log", "audit"],
      ["Report", "report"],
    ],
  },
];

function employeeFromPath(pathname) {
  const [, section, id] = pathname.split("/");
  return EMPLOYEE_SECTIONS.includes(section) && id ? decodeURIComponent(id) : null;
}

export default function Layout() {
  const { role, setRole } = useRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const employees = useApi(() => api.employees());
  const employeeId = employeeFromPath(pathname) || DEFAULT_EMPLOYEE;
  const employeeList = employees.data || [];

  const pathFor = (section) => (EMPLOYEE_SECTIONS.includes(section) ? `/${section}/${employeeId}` : `/${section}`);
  const changeEmployee = (id) => {
    const [, section] = pathname.split("/");
    navigate(`/${EMPLOYEE_SECTIONS.includes(section) ? section : "profile"}/${id}`);
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="px-4 py-4 lg:px-5">
          <p className="text-sm font-semibold">Workforce Intelligence</p>
          <p className="text-xs text-slate-500">Skill gap and evolution predictor</p>
        </div>
        <nav aria-label="Main" className="flex gap-4 overflow-x-auto px-4 pb-3 lg:block lg:space-y-5 lg:px-3 lg:pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex shrink-0 items-center gap-1 lg:block">
              <p className="hidden px-2 pb-1 text-xs font-medium text-slate-400 lg:block">{group.label}</p>
              {group.links.map(([label, section]) => (
                <NavLink
                  key={section}
                  to={pathFor(section)}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-md px-2 py-1.5 text-sm ${
                      isActive ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Employee
            <select
              value={employeeId}
              onChange={(event) => changeEmployee(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {!employeeList.some((item) => item.employee_id === employeeId) && <option>{employeeId}</option>}
              {employeeList.map((item) => (
                <option key={item.employee_id} value={item.employee_id}>
                  {item.employee_id}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Demo role" className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Demo role</span>
            <div className="flex rounded-md border border-slate-300 p-0.5">
              {ROLES.map((item) => (
                <button
                  key={item}
                  onClick={() => setRole(item)}
                  aria-pressed={role === item}
                  className={`rounded px-2.5 py-1 text-sm ${role === item ? "bg-teal-700 text-white" : "text-slate-600"}`}
                >
                  {item === "hr" ? "HR" : "Employee"}
                </button>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <PageBoundary key={pathname}>
            <Outlet />
          </PageBoundary>
        </main>
      </div>
    </div>
  );
}
