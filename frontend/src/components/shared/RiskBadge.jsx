const LEVELS = {
  high: ["High", "bg-red-100 text-red-800"],
  medium: ["Medium", "bg-amber-100 text-amber-900"],
  low: ["Low", "bg-slate-100 text-slate-700"],
};

export default function RiskBadge({ level }) {
  const [label, style] = LEVELS[level] || LEVELS.low;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}
