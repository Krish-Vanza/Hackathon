# Demo Story

**Title:** From a shock we can see coming, to a plan people can trust.

**Length:** about 5 minutes.

**The one idea to land:** we can see next year's skill shortage today, we can fix much of it with people we already have, and a human stays in charge of every decision.

## Open with this

> "Every company finds out about a skills shortage too late. We built a platform that sees it coming, shows why, and turns it into a plan for real people. One thing up front: all the data here is generated, so these are not real employees, and the accuracy numbers are from that generated data."

## The story

Start in the **HR view**. Figures are from the seeded dataset on 31 October 2026. If Harin reseeds, check them again.

### 1. The problem: Overview

- Readiness is **58.1%** today.
- With no action it falls to **49.8%** in a year.
- With the recommended plans it rises to **61.8%**.

**Say:** "This is the whole story on one screen. We are short today, it gets worse by itself, and we can change that."

Note: the 61.8% assumes 70% of people finish their courses. Say so if asked.

### 2. What is coming: Forecast

- Agentic AI is the fastest rising skill, up **93%**, from 5.3 to 10.1 FTE.
- Click it, and show the forecast line and the range.
- Open **Why this result?**
- Show accuracy: the local model's error is **1.9%**, against **4.2%** for a naive forecast.
- Read the market brief, which Gemini writes from our numbers.

**Say:** "The forecast comes from a local model we trained, and Gemini only writes the words. Every number comes from code."

### 3. Why it is dangerous: Knowledge Graph, then Risk

- On **Risk**, open **Why?** on Agentic AI. It scores **76.5**, high risk, second behind MLOps.
- Forecast demand is 10.1 FTE against 2.7 projected qualified staff.
- **E-0023 in Digital Services is the only Agentic AI expert in the company.**

**Say:** "If one person leaves, that capability leaves with them. Nobody would see that in a spreadsheet."

### 4. Where the talent already is: Employees

- Open **Employees** to show that all 60 people are covered.
- Open **E-0007**, a Backend Engineer in Product Engineering.
- Go to **Mobility**, then the **HR candidates** tab, for ML Engineer.
- E-0007 is **92%** ready. The next person is 45%.
- Point at the banner: decision support only.

**Say:** "The best ML Engineer candidate is already here, working as a Backend Engineer. The system shows it, and HR decides."

### 5. Switch to the person: Employee view

- Click **View as this employee**.
- Point out that the HR menu has gone and the color has changed.
- **Profile:** skills come from evidence, not self-rating.
- **Mobility:** ML Engineer at 92%, missing only MLOps, about 3 weeks away, and marked **Awaiting HR review**.
- **Career Paths:** ML Engineer, then Engineering Manager.

**Say:** "Same system, a very different experience. An employee sees their own future, not the org chart."

### 6. Humans decide: HR Review

- Switch to **HR** and open **HR Review**.
- Set **Type** to Internal mobility.
- **Approve** E-0007 to ML Engineer, with a short comment.
- **Reject** E-0007 to AI Engineer, with a short comment.

**Say:** "Nothing is applied automatically. Every suggestion waits for a person, and this is the control the brief asks for."

### 7. Proof: Employee view, then Audit Log

- Switch to **Employee** and open **Internal Mobility**.
- ML Engineer now shows **Approved by HR**, and AI Engineer is gone.
- Switch to **HR** and open **Audit Log** to show both decisions.

**Say:** "The decision changed what the employee sees, and it is on the record."

### 8. Close: Report

- Open **Report** and show **Print or save as PDF** and **Download CSV**.
- State that sensitive attributes such as gender, age and location are not in the data and are blocked by a guard.
- State that if Gemini fails, the app keeps working with template text.

**Say:** "So we see the shortage early, we explain why, we find the people, and humans stay in control."

## Who presents

Suggested split. Change it freely.

| Steps | Presenter | Why |
|---|---|---|
| Opening, 1 | Krish | Sets the business problem |
| 2, 3 | Harin | Forecast, graph and Gemini |
| 4, 5 | Bhuvi | The screens and the two views |
| 6, 7, 8 | Harshit | Review, audit, report and the backend controls |

## If the judges ask

| Question | Answer |
|---|---|
| Is this real data? | No. It is generated with a fixed seed, as the brief allows. The accuracy numbers come from that data too |
| Why is the error so low? | The data is generated with clear patterns, so real data would score worse. What matters is that the method beats a naive forecast in a proper backtest |
| Is Gemini making the decisions? | No. Code makes every number and ranking. Gemini writes wording and extracts skills from text |
| What if Gemini is down? | The app uses template text. We tested it with no key and with a wrong key |
| Is the login real? | No. The HR / Employee switch is a demo control. A real system would use company sign-in. The server does already refuse HR data to the Employee role |
| Can it be biased? | Names, gender, age, location and tenure are not in the data, and a guard rejects them in AI input. Candidate lists are decision support only |
| Why is MLOps the highest risk, not Agentic AI? | Risk combines shortage, concentration, growth and centrality. MLOps has a bigger shortage, while Agentic AI has the fastest growth |

## Before you present

**A review can only be decided once, so step 6 works one time.** A decision cannot be undone in the app.

- **Rehearse on another employee**, such as E-0001, and leave E-0007 untouched.
- Before the demo, open **HR Review** and confirm `E-0007 to ML Engineer` and `E-0007 to AI Engineer` are still pending. Only Harin can reset the shared data, with `--reset`, and that also erases all reviews and retraining must follow.
- Open the Forecast and E-0007 pages once beforehand, so Gemini text is cached and loads instantly.
- Start in the **HR view**. Check `/api/health` shows `mongodb` and `gemini`.
- Set browser zoom to about 125% so the room can read the screen.
- Keep `http://localhost:5173/report` open in a spare tab as a fallback.
