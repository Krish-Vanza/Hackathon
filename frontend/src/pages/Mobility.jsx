import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useRole } from "../components/layout/RoleContext.jsx";
import { Async, Card, PageHeader, pct } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { useApi } from "../hooks/useApi.js";

function RoleCard({ role }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{role.role_title}</h2>
        <span className="text-xl font-semibold tabular-nums text-teal-700">{pct(role.readiness)}</span>
      </div>
      <div className="mt-2">
        <StatusBadge status={role.review_status} />
      </div>
      {role.review_comment && <p className="mt-2 text-sm text-slate-600">HR comment: {role.review_comment}</p>}
      <p className="mt-3 text-xs font-medium text-slate-500">Missing skills</p>
      {role.missing_skills.length ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {role.missing_skills.map((skill) => (
            <li key={skill.skill_id} className="flex justify-between gap-3">
              <span>{skill.name}</span>
              <span className="tabular-nums text-slate-500">
                {skill.current.toFixed(1)} of {skill.required}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-600">None</p>
      )}
      <p className="mt-3 text-sm text-slate-600">Bridge time: about {role.bridge_weeks} weeks</p>
      <ExplanationPanel explanation={role.explanation} />
    </Card>
  );
}

function Candidates({ roles }) {
  const [roleId, setRoleId] = useState(roles[0].role_id);
  const candidates = useApi(() => api.roleCandidates(roleId), [roleId]);

  return (
    <Card
      title="Candidates for a role"
      action={
        <select
          aria-label="Target role"
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.role_title}
            </option>
          ))}
        </select>
      }
    >
      <p className="mb-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
        Decision support only. Nothing here assigns or rejects anyone. HR makes every decision.
      </p>
      <Async state={candidates} isEmpty={(data) => data.candidates.length === 0} emptyText="No candidates for this role.">
        {(data) => (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1 font-medium">
                    Employee
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Department
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Readiness
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Missing skills
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((candidate) => (
                  <tr key={candidate.employee_id} className="border-t border-slate-100">
                    <td className="py-1.5">
                      <Link to={`/profile/${candidate.employee_id}`} className="text-teal-700 underline">
                        {candidate.employee_id}
                      </Link>
                    </td>
                    <td>{candidate.department}</td>
                    <td className="text-right tabular-nums">{pct(candidate.readiness)}</td>
                    <td className="text-right tabular-nums">{candidate.missing_skills.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
    </Card>
  );
}

const TABS = [
  ["roles", "Role matches"],
  ["candidates", "HR candidates"],
];

export default function Mobility() {
  const { id } = useParams();
  const { role } = useRole();
  const [selectedTab, setSelectedTab] = useState("roles");
  const mobility = useApi(() => api.mobility(id), [id]);
  const tab = role === "hr" ? selectedTab : "roles";

  return (
    <>
      <PageHeader title={`Internal Mobility: ${id}`} subtitle="Best-fit roles by skill readiness. Every match needs HR review." />
      {role === "hr" && (
        <div role="tablist" aria-label="Mobility views" className="mb-4 flex gap-1 border-b border-slate-200">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setSelectedTab(value)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === value ? "border-teal-700 font-medium text-teal-800" : "border-transparent text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <Async state={mobility} isEmpty={(data) => data.matches.length === 0} emptyText="No role matches to show.">
        {(data) =>
          tab === "roles" ? (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              {data.matches.map((item) => (
                <RoleCard key={item.role_id} role={item} />
              ))}
            </div>
          ) : (
            <Candidates key={data.employee_id} roles={data.matches} />
          )
        }
      </Async>
    </>
  );
}
