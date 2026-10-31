import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Async, Card, ErrorNotice, PageHeader, pct, Stat, TrendBadge } from "../components/layout/ui.jsx";
import { useApi } from "../hooks/useApi.js";

function ReadinessTiles() {
  const readiness = useApi(() => api.readiness());
  if (readiness.error) return <ErrorNotice error={readiness.error} onRetry={readiness.reload} />;
  const data = readiness.data;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Readiness now" value={pct(data?.now)} hint="Forecast demand covered by supply" />
      <Stat label="In 4 quarters, no action" value={pct(data?.no_action)} hint="With 3% attrition per quarter" />
      <Stat label="In 4 quarters, with plans" value={pct(data?.with_plans)} hint="If recommended plans complete" />
    </div>
  );
}

function RisingSkills() {
  const rising = useApi(() => api.risingSkills(10));
  return (
    <Card title="Biggest rising skills (4-quarter growth, %)">
      <Async state={rising} isEmpty={(data) => data.length === 0} emptyText="No forecasts stored yet.">
        {(data) => (
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
        )}
      </Async>
    </Card>
  );
}

function AccuracyCard() {
  const accuracy = useApi(() => api.forecastAccuracy());
  return (
    <Card title="Forecast accuracy (backtest)">
      <Async state={accuracy}>
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
              The model beat the naive forecast on {pct(data.win_rate)} of backtests. Version {data.version}. Measured on dummy data.
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
            <p className="text-sm leading-6 text-slate-700">{data.summary}</p>
            <p className="mt-2 text-xs text-slate-500">
              {data.source === "gemini" ? "Written by Gemini from stored data" : "Template text, Gemini not used"}
            </p>
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
            {[...data]
              .sort((a, b) => b.growth_pct - a.growth_pct)
              .map((item) => (
                <li key={item.skill_id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{item.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-slate-600">
                      {item.growth_pct > 0 ? "+" : ""}
                      {item.growth_pct}%
                    </span>
                    <TrendBadge status={item.trend_status} />
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
