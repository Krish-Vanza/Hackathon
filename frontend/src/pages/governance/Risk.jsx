import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { Async, Card, fieldClass, PageHeader, Stat } from "../../components/layout/ui.jsx";
import ExplanationPanel from "../../components/shared/ExplanationPanel.jsx";
import RiskBadge from "../../components/shared/RiskBadge.jsx";
import { useApi } from "../../hooks/useApi.js";

const BAR_COLORS = { high: "bg-red-600", medium: "bg-amber-500", low: "bg-slate-400" };

const FILTERS = [
  ["all", "All levels"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
];

const COLUMNS = [
  ["Skill", "text-left"],
  ["Score", "text-left"],
  ["Level", "text-left"],
  ["Shortage", "text-right"],
  ["Concentration", "text-right"],
  ["Market growth", "text-right"],
  ["Centrality", "text-right"],
  ["Details", "text-right"],
];

function RiskRow({ row, open, onToggle }) {
  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="py-2 pr-3 font-medium">{row.name}</td>
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            <span className="w-10 text-right font-semibold tabular-nums">{row.score.toFixed(1)}</span>
            <div aria-hidden className="h-2 w-20 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${BAR_COLORS[row.level]}`} style={{ width: `${Math.min(100, row.score)}%` }} />
            </div>
          </div>
        </td>
        <td className="py-2 pr-3">
          <RiskBadge level={row.level} />
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">{row.shortage.toFixed(0)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{row.concentration.toFixed(0)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{row.market_growth.toFixed(0)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{row.centrality.toFixed(0)}</td>
        <td className="py-2 text-right">
          <button onClick={onToggle} aria-expanded={open} className="text-brand-700 underline">
            {open ? "Hide" : "Why?"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={COLUMNS.length} className="pb-3">
            <ExplanationPanel explanation={row.explanation} open />
            <p className="mt-2 text-slate-600">
              Exposed departments: {row.exposed_departments.join(", ") || "None"}.{" "}
              <Link to={`/forecast/${row.skill_id}`} className="text-brand-700 underline">
                View forecast
              </Link>
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function RiskTable({ rows }) {
  const [level, setLevel] = useState("all");
  const [openId, setOpenId] = useState(null);
  const visible = level === "all" ? rows : rows.filter((row) => row.level === level);

  return (
    <Card
      title={`Skills by risk (${visible.length})`}
      action={
        <select
          aria-label="Filter by risk level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          className={fieldClass}
        >
          {FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      }
    >
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No skills at this risk level.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[46rem] text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                {COLUMNS.map(([label, align]) => (
                  <th key={label} scope="col" className={`py-1 pr-3 font-medium ${align}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <RiskRow key={row.skill_id} row={row} open={openId === row.skill_id} onToggle={() => setOpenId(openId === row.skill_id ? null : row.skill_id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function Risk() {
  const risk = useApi(() => api.risk());

  return (
    <>
      <PageHeader title="Workforce Risk" subtitle="Skill risk from 0 to 100, combining shortage, expert concentration, market growth and graph centrality. Dummy data." />
      <Async state={risk} isEmpty={(data) => data.length === 0} emptyText="No risk scores yet. Forecasts need to be stored first.">
        {(rows) => {
          const count = (level) => rows.filter((row) => row.level === level).length;
          return (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Stat label="High risk skills" value={count("high")} hint="Score of 70 or more" />
                <Stat label="Medium risk skills" value={count("medium")} hint="Score from 40 to 69" />
                <Stat label="Highest risk" value={rows[0].name} hint={`Score ${rows[0].score.toFixed(1)} of 100`} />
              </div>
              <RiskTable rows={rows} />
            </>
          );
        }}
      </Async>
    </>
  );
}
