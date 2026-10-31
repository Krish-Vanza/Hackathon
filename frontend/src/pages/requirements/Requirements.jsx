import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRole } from "../../components/layout/RoleContext.jsx";
import { ErrorNotice, PageHeader, Stat } from "../../components/layout/ui.jsx";
import ExplanationPanel from "../../components/shared/ExplanationPanel.jsx";
import { STEPS } from "./steps.js";

const STATES = {
  checking: { icon: "…", label: "Checking", style: "bg-slate-100 text-slate-600" },
  passed: { icon: "✓", label: "Verified live", style: "bg-emerald-100 text-emerald-800" },
  failed: { icon: "✕", label: "Check failed", style: "bg-red-100 text-red-800" },
};

function stateOf(result) {
  if (!result) return "checking";
  return result.passed ? "passed" : "failed";
}

// Runs each step's check on its own, so one slow or failing step does not hold up the rest.
function useChecks() {
  const { role } = useRole();
  const [attempt, setAttempt] = useState(0);
  const run = `${role}-${attempt}`;
  const [saved, setSaved] = useState({ run, results: {} });

  useEffect(() => {
    let active = true;
    const save = (id, result) => {
      if (active) setSaved((previous) => ({ run, results: { ...(previous.run === run ? previous.results : {}), [id]: result } }));
    };
    STEPS.forEach((step) => {
      step
        .check()
        .then((result) => save(step.id, { ...result, passed: result.facts.every((item) => item.ok) }))
        .catch((error) => save(step.id, { error, facts: [], passed: false }));
    });
    return () => {
      active = false;
    };
  }, [run]);

  return [saved.run === run ? saved.results : {}, () => setAttempt((value) => value + 1)];
}

function Stepper({ results, index, onSelect }) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
      {STEPS.map((step, position) => {
        const state = STATES[stateOf(results[step.id])];
        return (
          <li key={step.id} className="shrink-0">
            <button
              onClick={() => onSelect(position)}
              aria-current={position === index ? "step" : undefined}
              className={`relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${position === index ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${state.style}`}>
                {state.icon}
              </span>
              <span className="sr-only">{state.label}:</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">{step.id}</span>
              <span className="hidden min-w-0 truncate lg:inline">{step.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Facts({ facts }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {facts.map((item) => (
        <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
          <dt className="text-slate-500">
            <span aria-hidden className={item.ok ? "text-emerald-700" : "text-red-700"}>
              {item.ok ? "✓" : "✕"}
            </span>{" "}
            <span className="sr-only">{item.ok ? "Passed:" : "Failed:"}</span>
            {item.label}
          </dt>
          <dd className="font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StepCard({ step, position, result, onRetry }) {
  const state = STATES[stateOf(result)];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Step {position + 1} of {STEPS.length} · {step.id}
          </p>
          <h2 className="text-lg font-semibold">{step.title}</h2>
        </div>
        <span role="status" className={`rounded-full px-2 py-0.5 text-xs font-medium ${state.style}`}>
          {state.label}
        </span>
      </div>

      <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <span className="font-medium">The brief asks:</span> {step.requirement}
      </p>
      <p className="mt-3 text-sm text-slate-700">{step.built}</p>

      <h3 className="mt-5 text-sm font-semibold text-slate-700">Live proof from the API</h3>
      {result?.error && (
        <div className="mt-2">
          <ErrorNotice error={result.error} onRetry={onRetry} />
        </div>
      )}
      {!result && <p className="mt-2 text-sm text-slate-500">Checking...</p>}
      {result && !result.error && <Facts facts={result.facts} />}
      <ExplanationPanel explanation={result?.explanation} />

      <h3 className="mt-5 text-sm font-semibold text-slate-700">Show it in the app</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {step.show.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...step.pages, ...(result?.pages || [])].map(([label, path]) => (
          <Link key={path} to={path} state={{ tourStep: position + 1 }} className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white">
            Open {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Requirements() {
  const [params, setParams] = useSearchParams();
  const [results, rerun] = useChecks();
  const { role } = useRole();
  const index = Math.min(STEPS.length - 1, Math.max(0, (Number(params.get("step")) || 1) - 1));
  const step = STEPS[index];
  const done = Object.keys(results).length;
  const passed = Object.values(results).filter((result) => result.passed).length;
  const select = (position) => setParams({ step: String(position + 1) });
  const button = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40";

  return (
    <>
      <PageHeader title="Requirements Tour" subtitle="A step-by-step walk through FR-01 to FR-10. Each check runs against the live API when this page opens. All data is dummy data.">
        <button onClick={rerun} className={button}>
          Run checks again
        </button>
      </PageHeader>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Requirements verified" value={`${passed} of ${STEPS.length}`} hint={done < STEPS.length ? "Checks are still running" : "From live API responses"} />
        <Stat label="Current step" value={step.id} hint={step.title} />
      </div>
      {role !== "hr" && <p className="mb-4 rounded-md bg-amber-50 p-2 text-sm text-amber-900">You are viewing as Employee, so items HR rejected stay hidden. Set Demo role to HR for the full tour.</p>}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Requirements" className="min-w-0 rounded-xl border border-slate-200 bg-white p-2">
          <Stepper results={results} index={index} onSelect={select} />
        </nav>
        <div className="min-w-0">
          <StepCard step={step} position={index} result={results[step.id]} onRetry={rerun} />
          <div className="mt-3 flex justify-between gap-2">
            <button onClick={() => select(index - 1)} disabled={index === 0} className={button}>
              Back
            </button>
            {index < STEPS.length - 1 ? (
              <button onClick={() => select(index + 1)} className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white">
                Next: {STEPS[index + 1].id}
              </button>
            ) : (
              <button onClick={() => select(0)} className={button}>
                Start again
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
