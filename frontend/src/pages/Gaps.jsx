import { api } from "../api.js";
import { Async, Card, PageHeader } from "../components/layout/ui.jsx";
import { useApi } from "../hooks/useApi.js";

// Single-hue ramp: darker means a larger gap.
function cellStyle(severity, max) {
  const strength = max > 0 ? severity / max : 0;
  return {
    backgroundColor: `rgba(67, 56, 202, ${0.05 + strength * 0.9})`,
    color: strength > 0.7 ? "#ffffff" : "#0f172a",
  };
}

export default function Gaps() {
  const gaps = useApi(() => api.orgGaps());

  return (
    <>
      <PageHeader title="Gap Heatmap" subtitle="Average gap severity per person, by department and skill category. Darker cells have larger gaps." />
      <Card>
        <Async state={gaps} isEmpty={(data) => data.cells.length === 0} emptyText="No gap data yet.">
          {(data) => {
            const max = Math.max(...data.cells.map((cell) => cell.severity));
            const lookup = new Map(data.cells.map((cell) => [`${cell.department}|${cell.category}`, cell.severity]));
            return (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-separate border-spacing-1 text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="text-left text-xs font-medium text-slate-500">
                        Department
                      </th>
                      {data.categories.map((category) => (
                        <th key={category} scope="col" className="text-xs font-medium text-slate-500">
                          {category}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.departments.map((department) => (
                      <tr key={department}>
                        <th scope="row" className="whitespace-nowrap pr-2 text-left font-medium">
                          {department}
                        </th>
                        {data.categories.map((category) => {
                          const severity = lookup.get(`${department}|${category}`) ?? 0;
                          return (
                            <td key={category} style={cellStyle(severity, max)} className="rounded-lg p-3 text-center font-medium tabular-nums">
                              {severity.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </Async>
      </Card>
    </>
  );
}
