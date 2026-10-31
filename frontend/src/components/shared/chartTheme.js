// One chart look for the app. `accent` follows the active view. Skill and role colors are for the
// canvas graph, which cannot read CSS variables; that pair passes the dataviz palette validator.
export const CHART = {
  accent: "var(--accent-600)",
  negative: "#b45309",
  neutral: "#64748b",
  grid: "#e2e8f0",
  skill: "#4f46e5",
  role: "#b45309",
  label: "#334155",
};

export const TICK = { fontSize: 11, fill: "#475569" };

export const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
