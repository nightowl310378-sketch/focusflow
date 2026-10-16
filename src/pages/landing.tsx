import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  LineChart,
  RefreshCw,
  Sparkles,
  Timer,
  TriangleAlert,
  Wand2,
} from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { createInitialData } from '@/constants/defaults'
import { loadDemo } from '@/storage/storage'
import { useStore } from '@/storage/use-store'

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="card rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  )
}

export default function Landing(): JSX.Element {
  const { replaceData } = useStore()
  const navigate = useNavigate()

  const startFresh = () => {
    replaceData(createInitialData({ demo: false }))
    navigate('/onboarding')
  }

  const exploreDemo = () => {
    replaceData(loadDemo())
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-on-primary shadow-pop">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-ink">FocusFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={exploreDemo}>
              Explore Demo
            </Button>
            <Button size="sm" onClick={startFresh}>
              Build My Study Plan
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-paper" aria-hidden="true" />
          <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-2">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 shadow-card">
                <span className="flex h-1.5 w-1.5 rounded-full bg-success" />
                Adaptive planning · Smart Recovery
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Study smarter.
                <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-cyan bg-clip-text text-transparent">
                  Stress less.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                FocusFlow turns your subjects, exam dates and available hours into a realistic
                day-by-day timetable — then rebuilds it automatically when life gets in the way.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={startFresh} className="group">
                  Build My Study Plan
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button size="lg" variant="secondary" onClick={exploreDemo}>
                  Explore Demo
                </Button>
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                No account needed · Your data stays in your browser
              </p>
            </div>

            <div className="animate-fade">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Everything you need
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Built for real exam pressure
            </h2>
            <p className="mt-3 text-sm text-ink-muted">
              Not another to-do list. A planning engine that understands urgency, difficulty and
              the time you actually have.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Wand2 className="h-5 w-5" />} title="Deterministic timetable">
              Weighs exam urgency, topic difficulty and your confidence gap to order everything you
              need to study.
            </Feature>
            <Feature icon={<RefreshCw className="h-5 w-5" />} title="Smart Recovery">
              Missed a session? FocusFlow redistributes unfinished work around your exams without
              ever moving completed work.
            </Feature>
            <Feature icon={<Timer className="h-5 w-5" />} title="Focus timer">
              A built-in Pomodoro-style timer that logs real study minutes against the plan.
            </Feature>
            <Feature icon={<CalendarClock className="h-5 w-5" />} title="Weekly calendar">
              See every session across the week at a glance and spot where your time really goes.
            </Feature>
            <Feature icon={<LineChart className="h-5 w-5" />} title="Honest analytics">
              Planned versus completed minutes, subject progress and study consistency — no vanity
              metrics.
            </Feature>
            <Feature icon={<BrainCircuit className="h-5 w-5" />} title="Actionable recommendations">
              Contextual nudges based on your actual study behaviour, not generic advice.
            </Feature>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-line bg-invert text-invert-ink">
            <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-invert-ink/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Signature feature
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Smart Recovery recalculates your whole plan
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-invert-ink/70">
                  When you miss a study session, FocusFlow looks at what is still unfinished, how
                  close each exam is and how much time remains — then slots the work back in and
                  explains exactly what changed.
                </p>
              </div>
              <ol className="space-y-3">
                {[
                  { t: 'Mark a session missed', d: 'One tap from your dashboard or plan.' },
                  { t: 'We recompute the schedule', d: 'Around upcoming exams and remaining free slots.' },
                  { t: 'You see what moved', d: 'A clear summary — never overbooked, never overwritten.' },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-4 rounded-2xl bg-invert-ink/5 p-4 ring-1 ring-invert-ink/10">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan text-sm font-bold text-on-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.t}</p>
                      <p className="text-xs text-invert-ink/60">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Ready to take control of your revision?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
            Set up your subjects and exams in a couple of minutes, or jump straight into the demo to
            see the planner in action.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={startFresh}>
              Build My Study Plan
            </Button>
            <Button size="lg" variant="secondary" onClick={exploreDemo}>
              Explore Demo
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-ink">FocusFlow</span>
          </div>
          <p>Adaptive Smart Study Planner · Built for students.</p>
        </div>
      </footer>
    </div>
  )
}

function HeroPreview() {
  const rows = [
    { subject: 'Mathematics', topic: 'Algebra — Quadratics', time: '5:00 PM', tone: 'indigo' },
    { subject: 'Physics', topic: 'Kinematics — Motion', time: '5:40 PM', tone: 'violet' },
    { subject: 'English', topic: 'Grammar — Tenses', time: '6:30 PM', tone: 'cyan' },
  ]
  const toneMap: Record<string, string> = {
    indigo: 'subj-indigo',
    violet: 'subj-violet',
    cyan: 'subj-cyan',
  }
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="card overflow-hidden rounded-3xl p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted">Today</p>
            <p className="text-lg font-bold text-ink">Your study plan</p>
          </div>
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-ink ring-1 ring-inset ring-success/20">
            On track
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <div key={r.topic} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${toneMap[r.tone]}`}>
                {r.subject[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.topic}</p>
                <p className="text-xs text-ink-muted">{r.subject}</p>
              </div>
              <span className="text-xs font-medium text-ink-2 tnum">{r.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-soft p-3 text-xs text-primary-strong">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Completed sessions are preserved when your plan changes.
        </div>
      </div>
      <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-pop sm:flex">
        <TriangleAlert className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-ink">Missed a session? We&apos;ll recover it.</span>
      </div>
    </div>
  )
}
