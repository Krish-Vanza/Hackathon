// Placeholder so main pages build. Krish owns this file and replaces it; keep the `status` prop.
const LABELS = {
  pending: "Awaiting HR review",
  approved: "Approved by HR",
  rejected: "Rejected by HR",
  overridden: "Overridden by HR",
};

export default function StatusBadge({ status }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
      AI suggestion{status ? ` · ${LABELS[status] || status}` : ""}
    </span>
  );
}
