import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Async, Card, ErrorNotice, PageHeader, TrendBadge } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { useApi } from "../hooks/useApi.js";

function chartRows(data) {
  const rows = data.history.map((point) => ({ quarter: point.quarter, history: point.demand_fte }));
  // Start the forecast line at the last actual so the two lines join.
  rows[rows.length - 1].forecast = data.history.at(-1).demand_fte;
  data.forecast.forEach((point, index) => {
    rows.push({ quarter: point.quarter, forecast: point.demand_fte, range: [data.low[index], data.high[index]] });
  });
  return rows;
}

function formatTooltip(value, name) {
  return [Array.isArray(value) ? `${value[0]} to ${value[1]}` : value, name];
}

function FlagButton({ skillId, status, onFlagged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (status) return <StatusBadge status={status} />;

  const flag = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.flagForecast(skillId);
      onFlagged();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={flag} disabled={busy} className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Sending..." : "Flag for HR"}
      </button>
      {error && (
        <div className="mt-2">
          <ErrorNotice error={error} />
        </div>
      )}
    </div>
  );
}

export default function SkillForecast() {
  const { skillId } = useParams();
  const forecast = useApi(() => api.skillForecast(skillId), [skillId]);

  return (
    <>
      <Link to="/forecast" className="mb-3 inline-block text-sm text-teal-700 underline">
        Back to forecast
      </Link>
      <Async state={forecast} isEmpty={(data) => data.history.length === 0} emptyText="No forecast is stored for this skill.">
        {(data) => (
          <>
            <PageHeader title={data.name} subtitle={`${data.skill_id} · demand in FTE, dummy data`}>
              <div className="flex items-center gap-3">
                <TrendBadge status={data.trend_status} />
                <FlagButton skillId={data.skill_id} status={data.review_status} onFlagged={forecast.reload} />
              </div>
            </PageHeader>
            <Card title="Demand history and 4-quarter forecast, with 80% range">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows(data)} margin={{ right: 16 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
                    <Tooltip formatter={formatTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area dataKey="range" name="80% range" stroke="none" fill="#0f766e" fillOpacity={0.15} isAnimationActive={false} />
                    <Line dataKey="history" name="Actual" stroke="#475569" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line dataKey="forecast" name="Forecast" stroke="#0f766e" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <ExplanationPanel explanation={data.explanation} />
            </Card>
          </>
        )}
      </Async>
    </>
  );
}
