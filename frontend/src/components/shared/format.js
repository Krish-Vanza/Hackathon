export const REVIEW_TYPES = {
  mobility: "Internal mobility",
  career_plan: "Career plan",
  learning_plan: "Learning plan",
  skill_claim: "Skill claim",
  forecast_flag: "Forecast flag",
};

export function dateTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
