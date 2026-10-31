import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../api.js";
import { Async, Card, ErrorNotice, PageHeader, pct } from "../components/layout/ui.jsx";
import ExplanationPanel from "../components/shared/ExplanationPanel.jsx";
import { useApi } from "../hooks/useApi.js";

function SkillRadar({ skills }) {
  const data = skills.map((skill) => ({ skill: skill.name, Current: skill.effective_level, Required: skill.required_level }));
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#475569" }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
          <Radar dataKey="Required" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} isAnimationActive={false} />
          <Radar dataKey="Current" stroke="#0f766e" fill="#0f766e" fillOpacity={0.35} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EvidenceList({ skills }) {
  return (
    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
      {skills.map((skill) => (
        <li key={skill.skill_id} className="py-2">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-medium">{skill.name}</span>
            <span className="tabular-nums text-slate-600">Level {skill.effective_level.toFixed(1)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {skill.evidence.length
              ? skill.evidence.map((item) => `${item.source} ${item.level.toFixed(1)} (${item.date})`).join(" · ")
              : "No evidence recorded"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function GapList({ employeeId }) {
  const gaps = useApi(() => api.gaps(employeeId), [employeeId]);
  return (
    <Card title="Gaps against current role">
      <Async state={gaps} isEmpty={(data) => data.gaps.length === 0} emptyText="No gaps against this role.">
        {(data) => (
          <>
            <ul className="space-y-2">
              {data.gaps.map((gap) => (
                <li key={gap.skill_id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{gap.name}</span>
                  <span className="tabular-nums text-slate-600">
                    {gap.effective.toFixed(1)} of {gap.required} · severity {gap.severity.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <ExplanationPanel explanation={data.explanation} />
          </>
        )}
      </Async>
    </Card>
  );
}

function SkillExtractor() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.extractSkills(text));
    } catch (failure) {
      setResult(null);
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Extract skills from text">
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="skill-text">
          Work description
        </label>
        <textarea
          id="skill-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="Paste a project summary. Use dummy text only."
          className="w-full rounded-md border border-slate-300 p-2 text-sm"
        />
        <button
          disabled={busy || !text.trim()}
          className="mt-2 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Extracting..." : "Extract"}
        </button>
      </form>
      {error && (
        <div className="mt-3">
          <ErrorNotice error={error} />
        </div>
      )}
      {result && (
        <ul className="mt-3 space-y-1 text-sm">
          {result.matches.length === 0 && <li className="text-slate-500">No known skills found.</li>}
          {result.matches.map((match) => (
            <li key={match.skill_id} className="flex justify-between gap-3">
              <span>{match.name}</span>
              <span className="text-slate-600">
                {pct(match.confidence)}
                {match.needs_review && " · sent to HR"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Profile() {
  const { id } = useParams();
  const profile = useApi(() => api.profile(id), [id]);

  return (
    <>
      <Async state={profile} isEmpty={(data) => data.skills.length === 0} emptyText="This employee has no recorded skills.">
        {(data) => (
          <>
            <PageHeader title={`Skill Profile: ${data.employee_id}`} subtitle={`${data.role_title} · ${data.department}`}>
              <Link to={`/learning/${data.employee_id}`} className="text-sm font-medium text-teal-700 underline">
                View learning path
              </Link>
            </PageHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Current versus required level (0-5)">
                <SkillRadar skills={data.skills} />
              </Card>
              <Card title="Evidence">
                <EvidenceList skills={data.skills} />
                <ExplanationPanel explanation={data.explanation} />
              </Card>
            </div>
          </>
        )}
      </Async>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GapList employeeId={id} />
        <SkillExtractor />
      </div>
    </>
  );
}
