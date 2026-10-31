import { useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Compass,
  FileText,
  Grid3x3,
  LayoutDashboard,
  ListChecks,
  Menu,
  Route,
  ScrollText,
  Share2,
  ShieldAlert,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, ROLES } from "../../api.js";
import { useApi } from "../../hooks/useApi.js";
import EmployeeTabs from "./EmployeeTabs.jsx";
import { useRole } from "./RoleContext.jsx";
import { fieldClass, PageBoundary } from "./ui.jsx";

const EMPLOYEE_SECTIONS =["profile", "learning", "mobility", "career"];

const TOUR_STEPS = 10;

const HR_NAV = [
  {
    label: "Organization",
    links: [
      ["Overview", "overview", LayoutDashboard],
      ["Employees", "employees", Users],
    ],
  },
  {
    label: "Analytics",
    links: [
      ["Forecast", "forecast", BarChart3],
      ["Gap Heatmap", "gaps", Grid3x3],
      ["Knowledge Graph", "graph", Share2],
    ],
  },
  {
    label: "Governance",
    links: [
      ["Risk", "risk", ShieldAlert],
      ["HR Review", "review", ClipboardCheck],
      ["Audit Log", "audit", ScrollText],
      ["Report", "report", FileText],
    ],
  },
  {
    label: "Presenter",
    links: [["Requirements Tour", "requirements", ListChecks]],
  },
];

const EMPLOYEE_NAV = [
  {
    label: "My workspace",
    links: [
      ["My Profile", "profile", User],
      ["My Learning Path", "learning", BookOpen],
      ["Internal Mobility", "mobility", Compass],
      ["Career Paths", "career", Route],
    ],
  },
];

const VIEWS = {
  hr: ["HR", Users],
  employee: ["Employee", User],
};

function employeeFromPath(pathname) {
  const [, section, id] = pathname.split("/");
  return EMPLOYEE_SECTIONS.includes(section) && id ? decodeURIComponent(id) : null;
}

// Shown on pages opened from the Requirements Tour, so the presenter can step back or onward.
function TourBanner({ step }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-900 print:hidden lg:px-8">
      <span>Requirements Tour: FR-{String(step).padStart(2, "0")}</span>
      <span className="flex gap-3 font-medium">
        <Link to={`/requirements?step=${step}`} className="underline">
          Back to tour
        </Link>
        {step < TOUR_STEPS && (
          <Link to={`/requirements?step=${step + 1}`} className="underline">
            Next requirement
          </Link>
        )}
      </span>
    </div>
  );
}

function ViewSwitch({ role, onChange }) {
  return (
    <div role="group" aria-label="View as" className="flex rounded-lg bg-slate-100 p-0.5">
      {ROLES.map((item) => {
        const [label, Icon] = VIEWS[item];
        const active = role === item;
        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon aria-hidden size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SideNav({ groups, pathFor, isPersonPage, pendingCount, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold tracking-wider text-slate-500 uppercase">{group.label}</p>
          <div className="space-y-0.5">
            {group.links.map(([label, section, Icon]) => (
              <NavLink
                key={section}
                to={pathFor(section)}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive || (section === "employees" && isPersonPage)
                      ? "bg-white/10 font-medium text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon aria-hidden size={17} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {section === "review" && pendingCount > 0 && (
                  <span className="rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white tabular-nums">
                    <span className="sr-only">Pending reviews: </span>
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { role, setRole, personaId, setPersonaId } = useRole();
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHr = role === "hr";
  const employees = useApi(() => api.employees());
  // Refreshed on each page change, so the badge drops after HR decides an item.
  const pending = useApi(() => (isHr ? api.reviews("pending") : Promise.resolve([])), [pathname]);

  const employeeList = employees.data || [];
  const persona = employeeList.find((item) => item.employee_id === personaId);
  const personId = employeeFromPath(pathname);

  const pathFor = (section) => (EMPLOYEE_SECTIONS.includes(section) ? `/${section}/${personaId}` : `/${section}`);

  const changeView = (next) => {
    if (next === role) return;
    setRole(next);
    navigate(next === "hr" ? "/overview" : `/profile/${personaId}`);
  };

  const changePersona = (id) => {
    const [, section] = pathname.split("/");
    setPersonaId(id);
    navigate(`/${EMPLOYEE_SECTIONS.includes(section) ? section : "profile"}/${id}`);
  };

  const viewAsEmployee = (id) => {
    const [, section] = pathname.split("/");
    setPersonaId(id);
    setRole("employee");
    navigate(`/${section}/${id}`);
  };

  return (
    <div data-view={role} className="min-h-screen lg:flex">
      {menuOpen && <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
      <aside
        className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col bg-slate-900 lg:sticky lg:top-0 lg:flex lg:h-screen`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Activity size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Workforce Intelligence</p>
            <p className="truncate text-xs text-slate-400">Skill gap predictor</p>
          </div>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="text-slate-400 lg:hidden">
            <X size={20} />
          </button>
        </div>
        <SideNav
          groups={isHr ? HR_NAV : EMPLOYEE_NAV}
          pathFor={pathFor}
          isPersonPage={Boolean(personId)}
          pendingCount={pending.data?.length ?? 0}
          onNavigate={() => setMenuOpen(false)}
        />
        <div className="m-3 flex gap-2 rounded-lg bg-white/5 p-3 text-xs text-slate-300">
          <Sparkles aria-hidden size={15} className="mt-px shrink-0 text-brand-400" />
          <p>Demo data. All employees and figures are generated.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:px-8">
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="text-slate-600 lg:hidden">
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{isHr ? "HR workspace" : `Signed in as ${personaId}`}</p>
            <p className="truncate text-xs text-slate-500">
              {isHr
                ? `Organization view${employeeList.length ? ` of all ${employeeList.length} employees` : ""}`
                : persona
                  ? `${persona.role_title} · ${persona.department}`
                  : "Employee workspace"}
            </p>
          </div>
          {!isHr && (
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Demo persona
              <select value={personaId} onChange={(event) => changePersona(event.target.value)} className={fieldClass}>
                {!persona && <option>{personaId}</option>}
                {employeeList.map((item) => (
                  <option key={item.employee_id} value={item.employee_id}>
                    {item.employee_id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ViewSwitch role={role} onChange={changeView} />
        </header>
        {state?.tourStep && <TourBanner step={state.tourStep} />}
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          {isHr && personId && <EmployeeTabs employeeId={personId} onViewAs={viewAsEmployee} />}
          <PageBoundary key={pathname}>
            <Outlet />
          </PageBoundary>
        </main>
      </div>
    </div>
  );
}
