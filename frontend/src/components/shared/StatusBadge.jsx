// Labels match STATUS_LABELS in backend/app/services/reviews.py.
const STATUSES = {
  pending: ["Awaiting HR review", "bg-amber-100 text-amber-900"],
  approved: ["Approved by HR", "bg-emerald-100 text-emerald-800"],
  rejected: ["Rejected by HR", "bg-red-100 text-red-800"],
  overridden: ["Changed by HR", "bg-sky-100 text-sky-800"],
};

// Set `ai={false}` where the AI suggestion label would only repeat itself, such as the HR queue.
export default function StatusBadge({ status, ai = true }) {
  const [label, style] = STATUSES[status] || [status, "bg-slate-100 text-slate-700"];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {ai && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">AI suggestion</span>}
      {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>}
    </span>
  );
}
