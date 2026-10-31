import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useRole } from "../../components/layout/RoleContext.jsx";
import { Async, Card, ErrorNotice, PageHeader } from "../../components/layout/ui.jsx";
import ExplanationPanel from "../../components/shared/ExplanationPanel.jsx";
import { dateTime, REVIEW_TYPES } from "../../components/shared/format.js";
import StatusBadge from "../../components/shared/StatusBadge.jsx";
import { useApi } from "../../hooks/useApi.js";

const STATUS_FILTERS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["overridden", "Changed"],
  ["", "All statuses"],
];

const SUBJECT_PAGES = {
  mobility: "mobility",
  career_plan: "career",
  learning_plan: "learning",
  skill_claim: "profile",
  forecast_flag: "forecast",
};

// Only these values reach the employee view when overridden, so only these are offered.
const OVERRIDE_FIELDS = {
  mobility: [
    { key: "readiness", label: "Readiness (0 to 1)", max: 1, step: 0.01 },
    { key: "bridge_weeks", label: "Bridge time (weeks)", step: 0.1 },
  ],
  learning_plan: [{ key: "weeks", label: "Duration (weeks)", step: 0.1 }],
  career_plan: [{ key: "total_weeks", label: "Total time (weeks)", step: 0.1 }],
};

const PAYLOAD_LABELS = {
  role_id: "Role ID",
  role_title: "Role",
  readiness: "Readiness",
  bridge_weeks: "Bridge time (weeks)",
  course_ids: "Courses",
  weeks: "Duration (weeks)",
  target_role_id: "Target role ID",
  total_weeks: "Total time (weeks)",
  skill_id: "Skill ID",
  confidence: "Confidence",
  reason: "Reason",
  forecast_demand: "Forecast demand (FTE)",
};

function payloadValue(value) {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "-");
}

function ReviewFacts({ review }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {Object.entries(review.payload).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 border-b border-slate-100 py-1">
          <dt className="text-slate-500">{PAYLOAD_LABELS[key] || key.replaceAll("_", " ")}</dt>
          <dd className="text-right tabular-nums">{payloadValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function overrideValues(fields, values, payload) {
  const changed = {};
  for (const { key, label, max } of fields) {
    if (values[key] === undefined || values[key] === String(payload[key])) continue;
    const number = Number(values[key]);
    if (values[key].trim() === "" || !Number.isFinite(number) || number < 0 || (max !== undefined && number > max)) {
      throw new Error(`${label} is not a valid value.`);
    }
    changed[key] = number;
  }
  return changed;
}

function OverrideInputs({ fields, payload, values, onChange }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {fields.map(({ key, label, max, step }) => (
        <label key={key} className="text-sm text-slate-600">
          {label}
          <input
            type="number"
            min={0}
            max={max}
            step={step}
            value={values[key] ?? String(payload[key])}
            onChange={(event) => onChange({ ...values, [key]: event.target.value })}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
          />
        </label>
      ))}
    </div>
  );
}

function DecisionForm({ review, onDecided }) {
  const fields = OVERRIDE_FIELDS[review.type] || [];
  const [comment, setComment] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const send = async (decision, override) => {
    setBusy(true);
    setError(null);
    try {
      onDecided(await api.decideReview(review.review_id, { decision, comment: comment.trim(), override }));
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const saveOverride = () => {
    try {
      const override = overrideValues(fields, values, review.payload);
      if (Object.keys(override).length === 0) throw new Error("Change at least one value before saving.");
      if (!comment.trim()) throw new Error("Add a comment that explains the change.");
      send("overridden", override);
    } catch (failure) {
      setError(failure);
    }
  };

  const button = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <label className="block text-sm font-medium text-slate-700">
        Comment
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder={overriding ? "Required for a change" : "Optional"}
          className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm font-normal"
        />
      </label>
      {overriding && <OverrideInputs fields={fields} payload={review.payload} values={values} onChange={setValues} />}
      {error && (
        <div className="mt-3">
          <ErrorNotice error={error} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {overriding ? (
          <>
            <button onClick={saveOverride} disabled={busy} className={`${button} bg-teal-700 text-white`}>
              Save change
            </button>
            <button onClick={() => setOverriding(false)} disabled={busy} className={`${button} border border-slate-300 text-slate-700`}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => send("approved")} disabled={busy} className={`${button} bg-teal-700 text-white`}>
              Approve
            </button>
            <button onClick={() => send("rejected")} disabled={busy} className={`${button} bg-red-700 text-white`}>
              Reject
            </button>
            {fields.length > 0 && (
              <button onClick={() => setOverriding(true)} disabled={busy} className={`${button} border border-slate-300 text-slate-700`}>
                Override
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewDetail({ review, onDecided }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{review.title}</h2>
          <p className="text-xs text-slate-500">
            {REVIEW_TYPES[review.type] || review.type} · {review.review_id} · queued {dateTime(review.created_at)}
          </p>
        </div>
        <StatusBadge status={review.status} />
      </div>
      <p className="mt-2 text-sm">
        <Link to={`/${SUBJECT_PAGES[review.type]}/${review.subject_id}`} className="text-teal-700 underline">
          Open {review.subject_id}
        </Link>
      </p>
      <div className="mt-3">
        <ReviewFacts review={review} />
      </div>
      <ExplanationPanel explanation={review.explanation} open />
      {review.status === "pending" ? (
        <DecisionForm key={review.review_id} review={review} onDecided={onDecided} />
      ) : (
        <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
          Decided by {review.decided_by} on {dateTime(review.decided_at)}.{review.comment && ` Comment: ${review.comment}`}
        </p>
      )}
    </div>
  );
}

function QueueList({ reviews, selectedId, onSelect }) {
  return (
    <ul className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto">
      {reviews.map((review) => (
        <li key={review.review_id}>
          <button
            onClick={() => onSelect(review.review_id)}
            aria-current={selectedId === review.review_id}
            className={`w-full rounded-md p-2 text-left text-sm ${selectedId === review.review_id ? "bg-teal-50" : "hover:bg-slate-50"}`}
          >
            <span className="block font-medium">{review.title}</span>
            <span className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              {REVIEW_TYPES[review.type] || review.type}
              <StatusBadge status={review.status} ai={false} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewQueue() {
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saved, setSaved] = useState(null);
  const queue = useApi(() => api.reviews(status, type), [status, type]);

  const onDecided = (review) => {
    setSaved(review);
    queue.reload();
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4">
        <Select label="Status" value={status} onChange={setStatus} options={STATUS_FILTERS} />
        <Select label="Type" value={type} onChange={setType} options={[["", "All types"], ...Object.entries(REVIEW_TYPES)]} />
      </div>
      {saved && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Saved: {saved.title}. The decision is in the{" "}
          <Link to="/audit" className="underline">
            audit log
          </Link>
          .
        </p>
      )}
      <Async state={queue} isEmpty={(data) => data.length === 0} emptyText="Nothing here. Opening a learning, mobility or career page queues its suggestions.">
        {(reviews) => {
          const selected = reviews.find((review) => review.review_id === selectedId);
          return (
            <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
              <Card title={`Queue (${reviews.length})`}>
                <QueueList reviews={reviews} selectedId={selectedId} onSelect={setSelectedId} />
              </Card>
              <Card>{selected ? <ReviewDetail review={selected} onDecided={onDecided} /> : <p className="py-8 text-center text-sm text-slate-500">Select an item to review it.</p>}</Card>
            </div>
          );
        }}
      </Async>
    </>
  );
}

export default function Review() {
  const { role } = useRole();
  return (
    <>
      <PageHeader title="HR Review" subtitle="Every AI suggestion waits here. A person approves, rejects or changes it, and nothing is applied automatically." />
      {role === "hr" ? <ReviewQueue /> : <ErrorNotice error={{ status: 403 }} />}
    </>
  );
}
