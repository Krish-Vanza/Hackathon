import { useState } from "react";
import { api } from "../../api.js";
import { Async, Card, ErrorNotice, PageHeader, pct, Stat } from "../../components/layout/ui.jsx";
import ExplanationPanel from "../../components/shared/ExplanationPanel.jsx";
import { dateTime } from "../../components/shared/format.js";
import RiskBadge from "../../components/shared/RiskBadge.jsx";
import { useApi } from "../../hooks/useApi.js";

const PIPELINE = [
  ["pending", "Awaiting HR review"],
  ["approved", "Approved"],
  ["overridden", "Changed by HR"],
  ["rejected", "Rejected"],
];

// The readiness API already returns percentages, unlike the 0 to 1 fractions elsewhere.
const percent = (value) => `${value.toFixed(1)}%`;

function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            {columns.map(([label, , align]) => (
              <th key={label} scope="col" className={`py-1 pr-3 font-medium ${align || "text-left"}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.skill_id} className="border-t border-slate-100">
              {columns.map(([label, render, align]) => (
                <td key={label} className={`py-1.5 pr-3 tabular-nums ${align || ""}`}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const GAP_COLUMNS = [
  ["Skill", (row) => row.name],
  ["Forecast demand", (row) => row.forecast_demand.toFixed(1), "text-right"],
  ["Projected supply", (row) => row.projected_supply.toFixed(1), "text-right"],
  ["Gap (FTE)", (row) => row.future_gap.toFixed(1), "text-right"],
];

const RISK_COLUMNS = [
  ["Skill", (row) => row.name],
  ["Score", (row) => row.score.toFixed(1), "text-right"],
  ["Level", (row) => <RiskBadge level={row.level} />, "text-right"],
];

function Accuracy({ accuracy }) {
  if (!accuracy.available) return <p className="text-sm text-slate-500">{accuracy.note}</p>;
  return (
    <p className="text-sm text-slate-700">
      Backtest MAPE of {accuracy.model_mape.toFixed(1)}% against {accuracy.naive_mape.toFixed(1)}% for a naive forecast. The model won {pct(accuracy.win_rate)} of comparisons. {accuracy.note}
    </p>
  );
}

function SystemStatus() {
  const health = useApi(() => api.health());
  if (!health.data) return null;
  const { database, data_source: dataSource, llm_mode: llmMode } = health.data;
  return (
    <p className="mt-4 text-xs text-slate-500">
      System status: database {database} · data source {dataSource} · AI text mode {llmMode}
    </p>
  );
}

function ReportBody({ report }) {
  const { readiness } = report;
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
        {report.note} Generated {dateTime(report.generated_at)}. Decision support only: HR makes every workforce decision.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Readiness now" value={percent(readiness.now)} hint="Demand covered by supply" />
        <Stat label="In 4 quarters, no action" value={percent(readiness.no_action)} hint="With 3% attrition per quarter" />
        <Stat label="In 4 quarters, with plans" value={percent(readiness.with_plans)} hint="If recommended plans complete" />
      </div>
      <ExplanationPanel explanation={readiness.explanation} open />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 print:grid-cols-1">
        <Card title="Top future skill gaps">
          {report.top_gaps.length ? <Table columns={GAP_COLUMNS} rows={report.top_gaps} /> : <p className="text-sm text-slate-500">No future gaps.</p>}
        </Card>
        <Card title="Top workforce risks">
          <Table columns={RISK_COLUMNS} rows={report.top_risks} />
        </Card>
      </div>
      <Card title="Internal mobility pipeline">
        <dl className="grid gap-3 sm:grid-cols-4">
          {PIPELINE.map(([status, label]) => (
            <div key={status}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{report.mobility_pipeline[status] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card title="Forecast accuracy">
        <Accuracy accuracy={report.accuracy} />
      </Card>
    </div>
  );
}

function ReportActions() {
  const [error, setError] = useState(null);

  const downloadCsv = async () => {
    setError(null);
    try {
      const url = URL.createObjectURL(new Blob([await api.reportCsv()], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "workforce-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.print()} className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white">
          Print or save as PDF
        </button>
        <button onClick={downloadCsv} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
          Download CSV
        </button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorNotice error={error} />
        </div>
      )}
    </div>
  );
}

export default function Report() {
  const report = useApi(() => api.report());

  return (
    <>
      <PageHeader title="Workforce Analytics Report" subtitle="Readiness, skill gaps, risks and the mobility pipeline.">
        <ReportActions />
      </PageHeader>
      <Async state={report}>{(data) => <ReportBody report={data} />}</Async>
      <SystemStatus />
    </>
  );
}
