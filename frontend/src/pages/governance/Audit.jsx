import { api } from "../../api.js";
import { useRole } from "../../components/layout/RoleContext.jsx";
import { Async, Card, ErrorNotice, PageHeader } from "../../components/layout/ui.jsx";
import { dateTime, REVIEW_TYPES } from "../../components/shared/format.js";
import { useApi } from "../../hooks/useApi.js";

const EVENTS = {
  review_submitted: "Queued for review",
  review_approved: "Approved",
  review_rejected: "Rejected",
  review_overridden: "Changed by HR",
};

const COLUMNS = ["Time", "Event", "Actor", "Item", "Details"];

function eventDetail({ type, subject_id: subjectId, comment }) {
  return [REVIEW_TYPES[type] || type, subjectId, comment].filter(Boolean).join(" · ");
}

function AuditTable() {
  const audit = useApi(() => api.audit());

  return (
    <Card
      title="Events, newest first"
      action={
        <button onClick={audit.reload} className="text-sm font-medium text-teal-700 underline">
          Refresh
        </button>
      }
    >
      <Async state={audit} isEmpty={(data) => data.length === 0} emptyText="No events yet.">
        {(events) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column} scope="col" className="py-1 pr-3 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr key={`${event.at}-${index}`} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{dateTime(event.at)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3">{EVENTS[event.event] || event.event}</td>
                    <td className="py-1.5 pr-3 uppercase">{event.actor}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{event.entity}</td>
                    <td className="py-1.5 text-slate-600">{eventDetail(event.detail)}</td>
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

export default function Audit() {
  const { role } = useRole();
  return (
    <>
      <PageHeader title="Audit Log" subtitle="Every queued suggestion and HR decision." />
      {role === "hr" ? <AuditTable /> : <ErrorNotice error={{ status: 403 }} />}
    </>
  );
}
