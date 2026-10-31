// Placeholder so main pages build. Krish owns this file and replaces it; keep the `explanation` prop.
export default function ExplanationPanel({ explanation }) {
  if (!explanation) return null;
  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-700">Why this result?</summary>
      <p className="mt-2 text-slate-700">{explanation.summary}</p>
      <ul className="mt-2 space-y-1 text-slate-600">
        {explanation.factors.map((factor) => (
          <li key={factor.name}>
            {factor.direction === "up" ? "▲" : "▼"} {factor.name}: {factor.value}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        {explanation.method} · {Math.round(explanation.confidence * 100)}% confidence · source: {explanation.source}
      </p>
    </details>
  );
}
