import { ArrowRight, Gauge, Rocket, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Async, buttonClass, Card, Meter, PageHeader, pct, Stat } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import { percent, REVIEW_TYPES } from "../components/shared/format.js";
import RiskBadge from "../components/shared/RiskBadge.jsx";
import { useApi } from "../hooks/useApi.js";

const RISK_BARS = { high: "bg-red-600", medium: "bg-amber-500", low: "bg-slate-400" };

function Readiness() {
  const readiness = useApi(() => api.readiness());
  return (
    <Async state={readiness}>
      {(data) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Readiness today" value={percent(data.now)} hint="Skill demand covered by qualified staff" icon={Gauge} />
            <Stat label="In 4 quarters, no action" value={percent(data.no_action)} hint="With 3% attrition per quarter" icon={TrendingDown} />
            <Stat label="In 4 quarters, with plans" value={percent(data.with_plans)} hint="If recommended plans complete" icon={TrendingUp} />
          </div>
          <ExplanationPanel explanation={data.explanation} />
        </>
      )}
    </Async>
  );
}

function SeeAll({ to, label }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
      {label}
      <ArrowRight aria-hidden size={14} />
    </Link>
  );
}

function TopRisks() {
  const risk = useApi(() => api.risk());
  return (
    <Card title="Highest workforce risks" action={<SeeAll to="/risk" label="All risks" />}>
      <Async state={risk} isEmpty={(rows) => rows.length === 0} emptyText="No risk scores yet.">
        {(rows) => (
          <ul className="space-y-3">
            {rows.slice(0, 5).map((row) => (
              <li key={row.skill_id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Link to={`/forecast/${row.skill_id}`} className="font-medium text-slate-800 hover:underline">
                    {row.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-slate-600">{row.score.toFixed(1)}</span>
                    <RiskBadge level={row.level} />
                  </span>
                </div>
                <div className="mt-1.5">
                  <Meter value={row.score / 100} className={RISK_BARS[row.level]} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}

function RisingSkills() {
  const rising = useApi(() => api.risingSkills(5));
  return (
    <Card title="Fastest rising skills" action={<SeeAll to="/forecast" label="Forecast" />}>
      <Async state={rising} isEmpty={(rows) => rows.length === 0} emptyText="No forecasts stored yet.">
        {(rows) => (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.skill_id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <Link to={`/forecast/${row.skill_id}`} className="font-medium text-slate-800 hover:underline">
                  {row.name}
                </Link>
                <span className="tabular-nums text-slate-600">
                  {row.growth > 0 ? "+" : ""}
                  {pct(row.growth)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}

function PendingReviews() {
  const reviews = useApi(() => api.reviews("pending"));
  return (
    <Card title="Waiting for HR">
      <Async state={reviews}>
        {(rows) => {
          const counts = Object.entries(REVIEW_TYPES)
            .map(([type, label]) => [label, rows.filter((row) => row.type === type).length])
            .filter(([, count]) => count > 0);
          return (
            <>
              <p className="text-[1.65rem] leading-tight font-semibold tracking-tight text-slate-900 tabular-nums">{rows.length}</p>
              <p className="text-xs text-slate-500">AI suggestions need a human decision</p>
              <dl className="mt-3 space-y-1 text-sm">
                {counts.map(([label, count]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="tabular-nums">{count}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/review" className={`${buttonClass()} mt-4 w-full`}>
                <Rocket aria-hidden size={15} />
                Open HR Review
              </Link>
            </>
          );
        }}
      </Async>
    </Card>
  );
}

export default function Overview() {
  return (
    <>
      <PageHeader title="Workforce Overview" subtitle="Are we ready for the skills we will need next year, and what should we do about it?" />
      <Readiness />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <TopRisks />
        <RisingSkills />
        <PendingReviews />
      </div>
    </>
  );
}
