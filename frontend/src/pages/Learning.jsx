import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { Async, Card, PageHeader } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { useApi } from "../hooks/useApi.js";

export default function Learning() {
  const { id } = useParams();
  const learning = useApi(() => api.learning(id), [id]);

  return (
    <>
      <PageHeader title={`Learning Path: ${id}`} subtitle="Courses in the order to take them, with prerequisites first." />
      <Async
        state={learning}
        isEmpty={(data) => data.courses.length === 0}
        emptyText={learning.data?.hidden ? "HR rejected this learning plan." : "No courses are recommended right now."}
      >
        {(data) => (
          <Card
            title={`Towards ${data.role_title}: ${data.courses.length} ${data.courses.length === 1 ? "course" : "courses"} · ${data.total_hours} hours · about ${data.weeks} weeks at 6 hours a week`}
            action={<StatusBadge status={data.review_status} />}
          >
            <ol className="mt-2">
              {data.courses.map((course, index) => (
                <li key={course.course_id} className="relative flex gap-4 pb-5 last:pb-0">
                  {index < data.courses.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-3.5 w-px bg-slate-200" />}
                  <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {course.title}
                      {course.is_certification && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Certification</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      Level {course.level} · {course.hours} hours
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{course.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ExplanationPanel explanation={data.explanation} />
          </Card>
        )}
      </Async>
    </>
  );
}
