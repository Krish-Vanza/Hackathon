import { pct } from "../layout/ui.jsx";

const SOURCES = {
  rules: "Rule-based",
  model: "Local model",
  gemini: "Gemini",
  template: "Template text",
};

function FactorRow({ factor }) {
  const up = factor.direction === "up";
  const width = `${Math.round(Math.min(1, Math.max(0, factor.weight)) * 100)}%`;
  return (
    <li>
      <div className="flex flex-wrap justify-between gap-x-3 text-slate-700">
        <span>
          <span aria-hidden className={up ? "text-brand-700" : "text-amber-700"}>
            {up ? "▲" : "▼"}
          </span>{" "}
          <span className="sr-only">{up ? "Raises the result:" : "Lowers the result:"}</span>
          {factor.name}
        </span>
        <span className="text-slate-500">{factor.value}</span>
      </div>
      <div aria-hidden className="mt-1 h-1.5 rounded-full bg-slate-200">
        <div className={`h-1.5 rounded-full ${up ? "bg-brand-600" : "bg-amber-600"}`} style={{ width }} />
      </div>
    </li>
  );
}

// Renders the Explanation contract (plan.md rule 1). Pass `open` to start expanded.
export default function ExplanationPanel({ explanation, open = false }) {
  if (!explanation) return null;
  const { summary, factors = [], confidence, method, source } = explanation;
  return (
    <details open={open} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-700">Why this result?</summary>
      <p className="mt-2 text-slate-700">{summary}</p>
      {factors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {factors.map((factor) => (
            <FactorRow key={factor.name} factor={factor} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {pct(confidence)} confidence · {method} · {SOURCES[source] || source}
      </p>
    </details>
  );
}
