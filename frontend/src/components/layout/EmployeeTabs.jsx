import { ChevronRight, Eye } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { buttonClass } from "./ui.jsx";

const TABS = [
  ["Profile", "profile"],
  ["Learning", "learning"],
  ["Mobility", "mobility"],
  ["Career", "career"],
];

// HR's view of one person: where they are, the four record pages, and a jump into their view.
export default function EmployeeTabs({ employeeId, onViewAs }) {
  return (
    <div className="mb-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
          <Link to="/employees" className="hover:text-slate-900 hover:underline">
            Employees
          </Link>
          <ChevronRight aria-hidden size={14} />
          <span className="font-medium text-slate-900">{employeeId}</span>
        </nav>
        <button onClick={() => onViewAs(employeeId)} className={buttonClass("secondary")}>
          <Eye aria-hidden size={15} />
          View as this employee
        </button>
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([label, section]) => (
          <NavLink
            key={section}
            to={`/${section}/${employeeId}`}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap ${
                isActive ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
