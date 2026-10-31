import { api } from "../../api.js";
import { DEFAULT_EMPLOYEE as EMPLOYEE } from "../../components/layout/Layout.jsx";

const SAMPLE_TEXT = "Built Python services and SQL reports, then deployed them on Kubernetes.";

const fact = (label, value, ok = true) => ({ label, value: String(value), ok: Boolean(ok) });
const percent = (fraction) => `${Math.round(fraction * 100)}%`;

function explanationFact(label, explanation) {
  const complete = explanation?.summary && explanation.factors?.length > 0 && explanation.method && explanation.source;
  const count = explanation?.factors?.length;
  return fact(label, complete ? `${count} ${count === 1 ? "factor" : "factors"}, ${percent(explanation.confidence)} confidence, ${explanation.method}` : "Missing", complete);
}

// Every check reads live API data, so a step only passes if the running app really does it.
// `requirement` quotes the brief. `check` returns the facts shown as proof, plus any links that depend on the data.
export const STEPS = [
  {
    id: "FR-01",
    title: "Skill Inventory Assessment",
    requirement: "Build employee skill profiles.",
    built: "Each profile combines manager, project, certification and self evidence into one level per skill. Older evidence counts for less, and skills can also be extracted from free text.",
    pages: [["Skill Profile", `/profile/${EMPLOYEE}`]],
    show: ["Open the Skill Profile.", "Point out the radar chart and the evidence behind each level.", "Paste a project summary into Extract skills. Low-confidence matches go to HR."],
    async check() {
      const [profile, extracted] = await Promise.all([api.profile(EMPLOYEE), api.extractSkills(SAMPLE_TEXT)]);
      const withEvidence = profile.skills.filter((skill) => skill.evidence.length > 0).length;
      return {
        facts: [
          fact(`Skills assessed for ${EMPLOYEE}`, profile.skills.length, profile.skills.length > 0),
          fact("Skills backed by evidence", `${withEvidence} of ${profile.skills.length}`, withEvidence > 0 && withEvidence === profile.skills.length),
          fact("Strongest skill", `${profile.skills[0]?.name} at level ${profile.skills[0]?.effective_level}`, profile.skills[0]),
          fact("Skills extracted from sample text", extracted.matches.map((match) => match.name).join(", ") || "None", extracted.matches.length > 0),
        ],
        explanation: profile.explanation,
      };
    },
  },
  {
    id: "FR-02",
    title: "Skill Gap Detection",
    requirement: "Identify current and future capability gaps.",
    built: "Current gaps compare each person's level with their role, weighted by skill criticality. Future gaps compare forecast demand with projected supply after attrition.",
    pages: [
      ["Gap Heatmap", "/gaps"],
      ["Future gaps on Forecast", "/forecast"],
    ],
    show: ["Open the Gap Heatmap and find the darkest cells.", "Open Forecast and scroll to Future gaps in 4 quarters."],
    async check() {
      const plan = await api.learning(EMPLOYEE); // Its target role is the one this employee has gaps against.
      const [gaps, org, future] = await Promise.all([api.gaps(EMPLOYEE, plan.role_id), api.orgGaps(), api.forecastGaps()]);
      const shortages = future.filter((row) => row.future_gap > 0);
      return {
        facts: [
          fact(`Current gaps for ${EMPLOYEE}`, `${gaps.gaps.length} against ${gaps.role_title}`, gaps.gaps.length > 0),
          fact("Organization heatmap", `${org.departments.length} departments by ${org.categories.length} skill categories`, org.cells.length > 0),
          fact("Skills with a future gap", shortages.length, shortages.length > 0),
          fact("Largest future gap", shortages[0] ? `${shortages[0].name}, ${shortages[0].future_gap.toFixed(1)} FTE` : "None", shortages[0]),
        ],
        explanation: gaps.explanation,
      };
    },
  },
  {
    id: "FR-03",
    title: "Market Intelligence",
    requirement: "Analyze emerging technology trends.",
    built: "Market signals are turned into a growth figure and an emerging, stable or declining label for each skill. Gemini writes a short brief from those stored numbers.",
    pages: [["Forecast", "/forecast"]],
    show: ["Open Forecast and read the Market brief.", "Scroll to Market trends to see each skill's label."],
    async check() {
      const [trends, brief] = await Promise.all([api.marketTrends(), api.marketBrief()]);
      const count = (status) => trends.filter((row) => row.status === status).length;
      return {
        facts: [
          fact("Skills tracked", trends.length, trends.length > 0),
          fact("Emerging skills", count("emerging"), count("emerging") > 0),
          fact("Stable and declining skills", `${count("stable")} stable, ${count("declining")} declining`),
          fact("Market brief", brief.brief ? "Written" : "Missing", brief.brief),
        ],
        explanation: brief.explanation,
      };
    },
  },
  {
    id: "FR-04",
    title: "Demand Forecasting",
    requirement: "Predict future skill requirements.",
    built: "A local scikit-learn Ridge model forecasts demand for each skill four quarters ahead, with an 80% range. A rolling backtest compares it with a naive forecast.",
    pages: [["Forecast", "/forecast"]],
    show: ["Open Forecast and show the rising skills and the accuracy card.", "Open a skill to see its history, forecast and range.", "State that accuracy is measured on dummy data."],
    async check() {
      const [rising, accuracy] = await Promise.all([api.risingSkills(1), api.forecastAccuracy()]);
      const detail = await api.skillForecast(rising[0].skill_id);
      const complete = detail.forecast.length === 4 && detail.low.length === 4 && detail.high.length === 4;
      return {
        facts: [
          fact("Fastest rising skill", `${rising[0].name}, ${percent(rising[0].growth)} over 4 quarters`, rising[0]),
          fact("Forecast horizon", `${detail.forecast.length} quarters with an 80% range`, complete),
          fact("Backtest error (MAPE)", accuracy.available ? `Model ${accuracy.model_mape.toFixed(1)}%, naive ${accuracy.naive_mape.toFixed(1)}%` : "Not trained", accuracy.available),
          fact("Beats the naive forecast", accuracy.beats_naive ? "Yes" : "No", accuracy.beats_naive),
        ],
        explanation: detail.explanation,
        pages: [[`${detail.name} forecast`, `/forecast/${detail.skill_id}`]],
      };
    },
  },
  {
    id: "FR-05",
    title: "Personalized Learning Paths",
    requirement: "Recommend training and certifications.",
    built: "Courses are scored on gap coverage, future demand and level fit, then ordered so prerequisites come first. Each course carries its own reason.",
    pages: [["Learning Path", `/learning/${EMPLOYEE}`]],
    show: ["Open the Learning Path and read a reason.", "Choose E-0012 in the Employee menu to see a plan with a certification.", "Note that each plan shows Awaiting HR review."],
    async check() {
      const [plan, courses] = await Promise.all([api.learning(EMPLOYEE), api.courses()]);
      const available = courses.filter((course) => course.is_certification).length;
      const certifications = plan.courses.filter((course) => course.is_certification).length;
      return {
        facts: [
          fact("Target role", plan.role_title, plan.role_title),
          fact("Recommended courses", plan.hidden ? "Hidden, because HR rejected this plan" : `${plan.courses.length}, about ${plan.weeks} weeks`, plan.hidden || plan.courses.length > 0),
          fact("Certifications", `${available} in the catalog, ${certifications} in this plan`, available > 0),
          fact("Every course has a reason", plan.courses.every((course) => course.reason) ? "Yes" : "No", plan.courses.every((course) => course.reason)),
        ],
        explanation: plan.explanation,
      };
    },
  },
  {
    id: "FR-06",
    title: "Internal Mobility Analysis",
    requirement: "Recommend role transitions.",
    built: "Open roles are ranked by criticality-weighted readiness, with the missing skills and bridge time for each. HR also gets a candidate list for a role.",
    pages: [["Internal Mobility", `/mobility/${EMPLOYEE}`]],
    show: ["Open Internal Mobility and show the best match.", "Switch to the HR candidates tab, which is decision support only."],
    async check() {
      const mobility = await api.mobility(EMPLOYEE);
      const best = mobility.matches[0];
      return {
        facts: [
          fact("Best role match", best ? `${best.role_title}, ${percent(best.readiness)} ready` : "None", best),
          fact("Bridge time", best ? `About ${best.bridge_weeks} weeks` : "None", best),
          fact("Every match goes through HR", mobility.matches.every((match) => match.review_status) ? "Yes" : "No", mobility.matches.length > 0 && mobility.matches.every((match) => match.review_status)),
          fact("Labelled decision support", mobility.decision_support ? "Yes" : "No", mobility.decision_support),
        ],
        explanation: best?.explanation,
      };
    },
  },
  {
    id: "FR-07",
    title: "Workforce Risk Assessment",
    requirement: "Predict skill shortage risks.",
    built: "Each skill gets a 0 to 100 risk score from forecast shortage, expert concentration, market growth and graph centrality.",
    pages: [
      ["Workforce Risk", "/risk"],
      ["Knowledge Graph", "/graph"],
    ],
    show: ["Open Workforce Risk.", "Select Why? on Agentic AI to see the factors and exposed departments.", "Open the Knowledge Graph to show how central the skill is."],
    async check() {
      const risks = await api.risk();
      const count = (level) => risks.filter((row) => row.level === level).length;
      const exposed = risks.filter((row) => row.exposed_departments.length > 0).length;
      return {
        facts: [
          fact("Skills scored", risks.length, risks.length > 0),
          fact("Risk levels", `${count("high")} high, ${count("medium")} medium, ${count("low")} low`, risks.every((row) => row.score >= 0 && row.score <= 100)),
          fact("Highest risk", risks[0] ? `${risks[0].name}, ${risks[0].score.toFixed(1)} of 100` : "None", risks[0]),
          fact("Skills resting on one expert or none", exposed),
        ],
        explanation: risks[0]?.explanation,
      };
    },
  },
  {
    id: "FR-08",
    title: "Career Path Recommendations",
    requirement: "Generate future career plans.",
    built: "Paths run along the role graph for up to three steps, showing the skills, courses and time for each step.",
    pages: [["Career Paths", `/career/${EMPLOYEE}`]],
    show: ["Open Career Paths.", "Walk through one path step by step.", "Note that each path waits for HR review."],
    async check() {
      const career = await api.career(EMPLOYEE);
      const first = career.paths[0];
      return {
        facts: [
          fact("Career paths", career.paths.length, career.paths.length > 0),
          fact("First path", first ? first.steps.map((step) => step.role_title).join(" to ") : "None", first),
          fact("Estimated time", first ? `About ${first.total_weeks} weeks` : "None", first),
          fact("Skills listed per step", first?.steps.every((step) => step.missing_skills) ? "Yes" : "No", first?.steps.every((step) => step.missing_skills)),
        ],
        explanation: first?.explanation,
      };
    },
  },
  {
    id: "FR-09",
    title: "Explainable AI",
    requirement: "Show factors influencing predictions.",
    built: "Every prediction carries the same explanation: a summary, weighted factors, a confidence, the method and the source. The Why this result? panel shows it on each page.",
    pages: [],
    show: ["Open any prediction and expand Why this result?.", "Point out the factors, confidence, method and source."],
    async check() {
      const plan = await api.learning(EMPLOYEE);
      const [rising, gaps, risks, mobility, career] = await Promise.all([api.risingSkills(1), api.gaps(EMPLOYEE, plan.role_id), api.risk(), api.mobility(EMPLOYEE), api.career(EMPLOYEE)]);
      const forecast = await api.skillForecast(rising[0].skill_id);
      return {
        facts: [
          explanationFact("Skill gaps", gaps.explanation),
          explanationFact("Demand forecast", forecast.explanation),
          explanationFact("Workforce risk", risks[0]?.explanation),
          explanationFact("Learning path", plan.explanation),
          explanationFact("Internal mobility", mobility.matches[0]?.explanation),
          explanationFact("Career path", career.paths[0]?.explanation),
        ],
        explanation: forecast.explanation,
        pages: [[`${forecast.name} forecast`, `/forecast/${forecast.skill_id}`]],
      };
    },
  },
  {
    id: "FR-10",
    title: "Human Review",
    requirement: "Allow HR validation and intervention.",
    built: "Suggestions wait in one HR queue, where HR approves, rejects or changes them. Rejected items disappear for employees, and every decision goes in the audit log.",
    pages: [
      ["HR Review", "/review"],
      ["Audit Log", "/audit"],
    ],
    show: ["Set Demo role to HR and open HR Review.", "Approve one item and reject another.", "Switch to Employee and open Internal Mobility. The approved match is labelled and the rejected one is gone.", "Switch back to HR and open the Audit Log to see both decisions."],
    async check() {
      const mobility = await api.mobility(EMPLOYEE); // Opening this queues its suggestions.
      const [reviews, audit] = await Promise.all([api.reviews(), api.audit()]);
      const pending = reviews.filter((review) => review.status === "pending").length;
      return {
        facts: [
          fact("Items in the HR queue", reviews.length, reviews.length > 0),
          fact("Waiting and decided", `${pending} waiting, ${reviews.length - pending} decided`),
          fact("Suggestions marked for review", mobility.matches.every((match) => match.review_status) ? "Yes" : "No", mobility.matches.every((match) => match.review_status)),
          fact("Audit events recorded", audit.length, audit.length > 0),
        ],
      };
    },
  },
];
