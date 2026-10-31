import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Async, Card, ErrorNotice, PageHeader, pct, Stat, TrendBadge } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import { useApi } from "../hooks/useApi.js";

// The readiness API already returns percentages, unlike the 0 to 1 fractions elsewhere.
const percent = (value) => (value === null || value === undefined ? "-" : `${value.toFixed(1)}%`);

function ReadinessTiles() {
  const readiness = useApi(() => api.readiness());
  if (readiness.error) return <ErrorNotice error={readiness.error} onRetry={readiness.reload} />;
  const data = readiness.data;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Readiness now" value={percent(data?.now)} hint="Forecast demand covered by supply" />
        <Stat label="In 4 quarters, no action" value={percent(data?.no_action)} hint="With 3% attrition per quarter" />
        <Stat label="In 4 quarters, with plans" value={percent(data?.with_plans)} hint="If recommended plans complete" />
      </div>
      <ExplanationPanel explanation={data?.explanation} />
    </>
  );
}

function RisingSkills() {
  const rising = useApi(() => api.risingSkills(10));
  return (
    <Card title="Biggest rising skills (4-quarter growth, %)">
      <Async state={rising} isEmpty={(data) => data.length === 0} emptyText="No forecasts stored yet.">
        {(rows) => {
          const data = rows.map((item) => ({ ...item, growth_pct: Math.round(item.growth * 100) }));
          return (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip formatter={(value) => [`${value}%`, "Growth"]} />
                  <Bar dataKey="growth_pct" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {data.map((item) => (
                      <Cell key={item.skill_id} fill={item.growth_pct >= 0 ? "#0f766e" : "#b45309"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {data.map((item) => (
                <Link key={item.skill_id} to={`/forecast/${item.skill_id}`} className="text-teal-700 underline">
                  {item.name}
                </Link>
              ))}
            </div>
          </>
          );
        }}
      </Async>
    </Card>
  );
}

function AccuracyCard() {
  const accuracy = useApi(() => api.forecastAccuracy());
  return (
    <Card title="Forecast accuracy (backtest)">
      <Async state={accuracy} isEmpty={(data) => !data.available} emptyText="The forecast model has not been trained yet.">
        {(data) => (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Model MAPE</dt>
              <dd className="text-xl font-semibold tabular-nums">{data.model_mape.toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-slate-500">Naive MAPE</dt>
              <dd className="text-xl font-semibold tabular-nums">{data.naive_mape.toFixed(1)}%</dd>
            </div>
            <p className="col-span-2 text-slate-600">
              The model beat the naive forecast on {pct(data.win_rate)} of backtests. Version {data.version}. {data.note}
            </p>
          </dl>
        )}
      </Async>
    </Card>
  );
}

function MarketBrief() {
  const brief = useApi(() => api.marketBrief());
  return (
    <Card title="Market brief">
      <Async state={brief}>
        {(data) => (
          <>
            <p className="text-sm leading-6 text-slate-700">{data.brief}</p>
            <ExplanationPanel explanation={data.explanation} />
          </>
        )}
      </Async>
    </Card>
  );
}

function MarketTrends() {
  const trends = useApi(() => api.marketTrends());
  return (
    <Card title="Market trends">
      <Async state={trends} isEmpty={(data) => data.length === 0} emptyText="No market signals yet.">
        {(data) => (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm">
            {data.map((item) => (
              <li key={item.skill_id} className="flex items-center justify-between gap-3 py-1.5">
                <span>{item.name}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-slate-600">
                    {item.yoy_growth > 0 ? "+" : ""}
                    {pct(item.yoy_growth)}
                  </span>
                  <TrendBadge status={item.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}

function FutureGaps() {
  const gaps = useApi(() => api.forecastGaps());
  return (
    <Card title="Future gaps in 4 quarters (FTE)">
      <Async state={gaps} isEmpty={(data) => data.length === 0} emptyText="No future gaps calculated yet.">
        {(data) => (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1 font-medium">
                    Skill
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Demand
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Supply
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Gap
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.map((item) => (
                  <tr key={item.skill_id} className="border-t border-slate-100">
                    <td className="py-1.5">{item.name}</td>
                    <td className="text-right">{item.forecast_demand.toFixed(1)}</td>
                    <td className="text-right">{item.projected_supply.toFixed(1)}</td>
                    <td className="text-right font-medium">{item.future_gap.toFixed(1)}</td>
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

export default function Forecast() {
  return (
    <>
      <PageHeader title="Future Skills Forecast" subtitle="Local Ridge forecast of skill demand. All figures come from dummy data." />
      <ReadinessTiles />
      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <RisingSkills />
        <div className="space-y-4">
          <AccuracyCard />
          <MarketBrief />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MarketTrends />
        <FutureGaps />
      </div>
    </>
  );
}
