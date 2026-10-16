# FocusFlow — Adaptive Smart Study Planner

> **Study smarter. Stress less. Achieve more.**

FocusFlow helps students decide **what** to study, organise the time they actually have,
track real learning progress, and **recover intelligently** when they fall behind.

---

## The problem

Students — especially near exams — face three recurring problems:

1. **What should I study next?** With several subjects, a to-do list cannot tell you what matters most *today*.
2. **My plan doesn't survive real life.** One missed session and the whole timetable collapses.
3. **Progress is invisible.** Time spent is not the same as learning achieved.

## Target users

School students, college students and competitive-exam aspirants revising 2–6 subjects
against one or more fixed exam dates.

## The solution

FocusFlow turns your subjects, topics, exam dates and available hours into a **feasible,
deterministic day-by-day timetable**, then rebuilds it automatically when life gets in the way.

It is **not** an AI chatbot wrapper and **not** another to-do list. Every number is computed
from your own data, and every scheduling decision is explainable.

## The distinctive feature — Smart Recovery

When a session is missed, FocusFlow:

1. identifies the unfinished work tied to it,
2. recalculates urgency given the time left before the relevant exam,
3. finds remaining free slots that respect your other sessions and daily limits,
4. moves the work there, **never** touching completed sessions and **never** double-booking,
5. shows exactly what changed and why — and only applies it if you accept.

If the work cannot fit before the exam, it says so and suggests concrete options instead of
silently overbooking you.

---

## Feature tour

| Area | What it does |
| --- | --- |
| **Landing** | Product story, working "Build My Study Plan" and "Explore Demo" CTAs. |
| **Onboarding** | Multi-field setup with sensible defaults and sample data. |
| **Dashboard** | Greeting, today's plan, completion, exam countdowns, subject progress, next recommendation. |
| **Subjects & topics** | Full CRUD, colours, icons, difficulty, confidence, priority, estimates, exam links. |
| **Study plan** | Deterministic generator with a transparent priority formula + warnings when work cannot fit. |
| **Tasks** | Due dates, priorities, subject links, completion/reopening, filters. |
| **Calendar** | Day/week views, breaks, exam markers, complete/miss/recover actions. |
| **Focus timer** | Drift-free Pomodoro timer (timestamp-based), focus/short/long breaks, logs real minutes. |
| **Analytics** | Planned vs. actual study time, subject completion, topic mastery, consistency — with text summaries. |
| **Assistant** | Rule-based, data-driven Q&A and revision-order suggestions. |
| **Settings** | Profile, availability, exam CRUD, export, demo data, reset. |
| **Appearance** | Light, Dark and Eye Comfort modes plus a text-size control — applied everywhere, saved locally, restored with no flash. |

---

## The scheduling algorithm

```text
Priority = 0.40 × urgency + 0.35 × difficulty + 0.25 × confidenceGap
```

* **urgency** — derived from days remaining until the linked exam (0–100).
* **difficulty** — topic difficulty normalised from a 1–5 scale to 0–100.
* **confidenceGap** — `100 − confidence`, so lower mastery raises priority.

All terms are normalised to 0–100, so weights are easy to tune in `src/services/scheduler.ts`.
The scheduler then greedily fills your available study windows with fixed-length sessions,
inserting breaks, respecting per-day hour caps, avoiding overlaps, and **never** placing work
after the linked exam. This is a **product heuristic, not a validated prediction** — the
assumptions are deliberately transparent and documented in code.

---

## Technology

- **React 19 + TypeScript** (strict), **Vite 8**
- **Tailwind CSS 4** with a small design-token theme
- **React Router 7** with route-level code-splitting
- **Lucide** icons
- **Vitest** + **Testing Library** for domain tests
- No backend, no paid services, no API keys required.

### Architecture

```
src/
  domain/        # typed models (source of truth)
  services/      # scheduler, recovery, planner, analytics, recommendations, assistant (pure, testable)
  storage/       # versioned localStorage abstraction + React store
  components/    # reusable UI kit + layout + domain widgets
  pages/         # route screens
  utils/         # dates, formatting, subject metadata
  test/          # unit tests
```

Business logic never lives in large UI components: scheduling, recovery, analytics and
recommendations are pure functions that take data and return data.

---

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm test         # run unit tests
npm run lint     # lint
```

Requires Node 20+.

---

## 2-minute demo script

1. **Open the app** → click **Explore Demo** on the landing page.
2. **Dashboard** → point out today's plan, completed session, exam countdowns and the assistant nudges.
3. **Subjects** → show a topic with difficulty 4 and confidence 40%.
4. **Study Plan** → click **Generate plan**; explain the priority formula and that sessions respect exam dates.
5. **Calendar** → show the generated sessions and the break blocks.
6. **Complete a session** from the dashboard (or calendar).
7. **Mark another session as missed** → the Smart Recovery modal opens.
8. **Apply the new plan** → show the recovered session in a future free slot and that the completed one is untouched.
9. **Analytics** → show planned vs. actual minutes and consistency.
10. **Refresh** → everything persists (browser localStorage).

---

## Data storage & demo mode

- Data lives in **`localStorage`** under a single versioned key (`focusflow:data-v1`).
- Loading is defensive: malformed JSON falls back to defaults, and partial objects are migrated
  and normalised.
- **Demo mode** is clearly labelled with a banner and loads realistic sample data.
- Use **Settings → Reset all data** to start fresh.

> **Local vs. cloud:** `localStorage` is per-browser and per-device. It is **not** a secure
> account system and does **not** sync across devices. See *scalability* below.

---

## Limitations

- Single-user, browser-local persistence (no accounts, no multi-device sync).
- The scheduler optimises greedily; it does not solve a globally optimal assignment.
- Priority weights are a heuristic, not a scientifically validated model.
- Notifications/audio rely on browser permissions and degrade gracefully to visual feedback.

## Scalability opportunities

Moving from this local MVP to a multi-user cloud app would require:

1. A backend (e.g. Postgres) replacing the storage abstraction — the `storage/` boundary is
   already isolated for exactly this swap.
2. Authentication and per-user row-level access control.
3. Server-side scheduling (the pure services can run unchanged in a worker/server).
4. An optional LLM endpoint behind an environment variable for free-form assistant questions,
   with the existing rule-based logic as the fallback. **API keys must live on the server.**

---

## Deployment

Built as a static SPA. Config for common hosts is included:

- `vercel.json` — SPA rewrite so nested routes work on refresh.
- `netlify.toml` — build command, publish directory and SPA redirect.
- `public/_redirects` — Netlify fallback.

Environment variables: **none are required** for local mode. If an optional AI endpoint is
added later, document it in `.env.example` and keep secrets server-side only.

```bash
npm run build   # outputs to dist/
```

> Not yet deployed — this repository contains deployment configuration but no public URL has
> been verified. Deploy, then update this section with the live link.
