export const REVIEW_TYPES = {
  mobility: "Internal mobility",
  career_plan: "Career plan",
  learning_plan: "Learning plan",
  skill_claim: "Skill claim",
  forecast_flag: "Forecast flag",
};

// The readiness API returns percentages, unlike the 0 to 1 fractions elsewhere.
export const percent = (value) => (value === null || value === undefined ? "-" : `${value.toFixed(1)}%`);

export function dateTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
