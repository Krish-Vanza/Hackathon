import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { Async, Card, PageHeader } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { useApi } from "../hooks/useApi.js";

function Step({ step, index }) {
  return (
    <li className="min-w-0 flex-1 rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-500">
        Step {index + 1} · about {step.weeks} weeks
      </p>
      <p className="font-medium">{step.title}</p>
      <p className="mt-2 text-xs font-medium text-slate-500">Skills to build</p>
      <p className="text-sm text-slate-700">{step.skills.join(", ") || "None"}</p>
      <p className="mt-2 text-xs font-medium text-slate-500">Courses</p>
      <p className="text-sm text-slate-700">{step.courses.join(", ") || "None"}</p>
    </li>
  );
}

export default function Career() {
  const { id } = useParams();
  const career = useApi(() => api.career(id), [id]);

  return (
    <>
      <PageHeader title={`Career Paths: ${id}`} subtitle="Possible routes on the role graph, up to 3 steps. Timelines are estimates." />
      <Async state={career} isEmpty={(data) => data.paths.length === 0} emptyText="No career paths to show.">
        {(data) => (
          <div className="space-y-4">
            {data.paths.map((path) => (
              <Card key={path.path_id} title={`${path.title} · about ${path.total_weeks} weeks`} action={<StatusBadge status={path.status} />}>
                <ol className="flex flex-col gap-3 md:flex-row">
                  {path.steps.map((step, index) => (
                    <Step key={step.role_id} step={step} index={index} />
                  ))}
                </ol>
                <ExplanationPanel explanation={path.explanation} />
              </Card>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
