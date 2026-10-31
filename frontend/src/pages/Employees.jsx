import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Async, Card, Empty, fieldClass, Meter, PageHeader, pct } from "../components/layout/ui.jsx";
import { useApi } from "../hooks/useApi.js";

const unique = (rows, key) => [...new Set(rows.map((row) => row[key]))].sort();

function Filter({ label, value, onChange, options }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function Directory({ employees }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter(
      (row) =>
        (!department || row.department === department) &&
        (!role || row.role_title === role) &&
        (!term || `${row.employee_id} ${row.role_title} ${row.department}`.toLowerCase().includes(term)),
    );
  }, [employees, search, department, role]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search employees</span>
          <Search aria-hidden size={15} className="absolute top-2.5 left-2.5 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, role or department"
            className={`${fieldClass} w-full pl-8`}
          />
        </label>
        <Filter label="All departments" value={department} onChange={setDepartment} options={unique(employees, "department")} />
        <Filter label="All roles" value={role} onChange={setRole} options={unique(employees, "role_title")} />
        <p role="status" className="text-sm text-slate-500 tabular-nums">
          {visible.length} of {employees.length}
        </p>
      </div>
      {visible.length === 0 ? (
        <Empty>No employees match these filters.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[40rem] text-sm">
            <thead className="text-left">
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Role</th>
                <th scope="col">Department</th>
                <th scope="col" className="w-44">
                  Fit for current role
                </th>
                <th scope="col" className="text-right">
                  Skill gaps
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.employee_id} className="border-t border-slate-100">
                  <td className="py-2 pr-3">
                    <Link to={`/profile/${row.employee_id}`} className="font-medium text-brand-700 hover:underline">
                      {row.employee_id}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{row.role_title}</td>
                  <td className="py-2 pr-3 text-slate-600">{row.department}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 tabular-nums">{pct(row.current_role_readiness)}</span>
                      <Meter value={row.current_role_readiness} />
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.gap_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function Employees() {
  const employees = useApi(() => api.employees());
  return (
    <>
      <PageHeader title="Employees" subtitle="Everyone in the organization. Open a person to see their skills, learning, mobility and career paths." />
      <Async state={employees} isEmpty={(rows) => rows.length === 0} emptyText="No employees yet.">
        {(rows) => <Directory employees={rows} />}
      </Async>
    </>
  );
}
