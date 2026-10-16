import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SessionItem } from '@/components/session-item'
import { SmartRecoveryModal } from '@/components/smart-recovery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/ui/stat-card'
import { useToast } from '@/components/ui/toast'
import type { StudySession } from '@/domain/types'
import { studyConsistency } from '@/services/analytics'
import { generateTimetable, setSessionStatus } from '@/services/planner'
import { buildRecommendations, type RecommendationTone } from '@/services/recommendations'
import { useStore } from '@/storage/use-store'
import { diffInDays, formatDate, isSameDay, parseISODate, startOfDay, today } from '@/utils/dates'
import { formatHours, formatMinutes, percent } from '@/utils/format'

const recTone: Record<RecommendationTone, string> = {
  primary: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning-ink',
  success: 'bg-success-soft text-success-ink',
  cyan: 'bg-cyan-soft text-cyan-ink',
  violet: 'bg-violet-soft text-violet-ink',
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard(): JSX.Element {
  const { data, setData, replaceData } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [recover, setRecover] = useState<StudySession | null>(null)

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const todaySessions = useMemo(
    () =>
      data.sessions
        .filter((s) => isSameDay(new Date(s.start), new Date()))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [data.sessions],
  )

  const studyToday = todaySessions.filter((s) => s.kind === 'study')
  const plannedToday = studyToday
    .filter((s) => s.status === 'planned' || s.status === 'missed')
    .reduce((sum, s) => sum + duration(s), 0)
  const completedToday = studyToday
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + (s.actualMinutes || duration(s)), 0)

  const weekCompleted = data.sessions
    .filter((s) => s.status === 'completed')
    .filter((s) => {
      const d = startOfDay(new Date(s.start)).getTime()
      return d >= startOfDay(new Date(Date.now() - 6 * 86400000)).getTime()
    })
    .reduce((sum, s) => sum + (s.actualMinutes || duration(s)), 0)

  const allStudy = data.sessions.filter((s) => s.kind === 'study')
  const completionRate = percent(
    allStudy.filter((s) => s.status === 'completed').length,
    allStudy.length,
  )
  const consistency = studyConsistency(data, 30)

  const upcomingExams = useMemo(
    () =>
      data.exams
        .filter((e) => diffInDays(today(), parseISODate(e.date)) >= 0)
        .sort((a, b) => parseISODate(a.date).getTime() - parseISODate(b.date).getTime())
        .slice(0, 4),
    [data.exams],
  )

  const recommendations = useMemo(() => buildRecommendations(data).slice(0, 3), [data])

  const handleGenerate = () => {
    if (data.topics.length === 0) {
      toast({ tone: 'info', title: 'Add a topic first', message: 'Topics are required to schedule work.' })
      navigate('/app/subjects')
      return
    }
    const { data: next, result } = generateTimetable(data)
    replaceData(next)
    toast({
      tone: result.warnings.length ? 'warning' : 'success',
      title: 'Timetable generated',
      message: result.warnings[0] ?? `${result.sessions.filter((s) => s.kind === 'study').length} sessions scheduled.`,
    })
  }

  const complete = (s: StudySession) => {
    setData((prev) => setSessionStatus(prev, s.id, 'completed'))
    toast({ tone: 'success', title: 'Session completed', message: s.title })
  }
  const reset = (s: StudySession) => setData((prev) => setSessionStatus(prev, s.id, 'planned'))

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${data.profile.name}`}
        description={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            <Button variant="secondary" onClick={handleGenerate}>
              <RefreshCw className="h-4 w-4" /> Generate plan
            </Button>
            <Button onClick={() => navigate('/app/timer')}>
              <Timer className="h-4 w-4" /> Focus timer
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's focus"
          value={formatMinutes(completedToday)}
          hint={`${formatMinutes(plannedToday)} still planned`}
          icon={<Target className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Completed this week"
          value={formatHours(weekCompleted / 60)}
          hint="Study minutes actually logged"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Completion rate"
          value={`${completionRate}%`}
          hint={`${allStudy.filter((s) => s.status === 'completed').length} of ${allStudy.length} sessions`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="cyan"
        />
        <StatCard
          label="30-day consistency"
          value={`${consistency}%`}
          hint="Days with a completed session"
          icon={<Flame className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Today&apos;s schedule</CardTitle>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {studyToday.length} session{studyToday.length === 1 ? '' : 's'} ·{' '}
                  {formatMinutes(plannedToday + completedToday)} planned
                </p>
              </div>
              <Badge tone="primary">{formatDate(new Date(), { day: 'numeric', month: 'short' })}</Badge>
            </CardHeader>
            {todaySessions.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Nothing scheduled today"
                description="Generate a plan from your topics, or check a different day in the calendar."
                action={
                  <Button onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4" /> Generate plan
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {todaySessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    subject={s.subjectId ? subjectById.get(s.subjectId) : undefined}
                    onComplete={complete}
                    onMiss={setRecover}
                    onReset={reset}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended for you</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            {recommendations.length === 0 ? (
              <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">
                You&apos;re on top of things. Keep the momentum going.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.map((r) => (
                  <div key={r.id} className="flex flex-col rounded-2xl border border-line p-4">
                    <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${recTone[r.tone]}`}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-ink">{r.title}</p>
                    <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-muted">{r.body}</p>
                    {r.to ? (
                      <Link
                        to={r.to}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {r.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming exams</CardTitle>
              <BookOpen className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            {upcomingExams.length === 0 ? (
              <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">
                No exams added yet.{' '}
                <Link to="/app/settings" className="font-medium text-primary hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2.5">
                {upcomingExams.map((e) => {
                  const days = diffInDays(today(), parseISODate(e.date))
                  const subject = data.subjects.find((s) => s.id === e.subjectId)
                  const topicCount = data.topics.filter((t) => t.examId === e.id && t.status !== 'mastered').length
                  return (
                    <li key={e.id} className="rounded-2xl border border-line p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
                        <Badge tone={days <= 2 ? 'danger' : days <= 7 ? 'warning' : 'neutral'}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {subject?.name ?? 'General'} · {formatDate(e.date, { month: 'short', day: 'numeric' })}
                      </p>
                      {topicCount > 0 ? (
                        <p className="mt-1 text-xs text-ink-muted">{topicCount} topic(s) to cover</p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subject progress</CardTitle>
              <Link to="/app/analytics" className="text-xs font-medium text-primary hover:underline">
                Details
              </Link>
            </CardHeader>
            <SubjectProgress />
          </Card>

          <Card className="bg-gradient-to-br from-primary to-secondary text-on-primary">
            <div className="flex items-center gap-2 text-sm font-medium text-on-primary/80">
              <Timer className="h-4 w-4" /> Ready to focus?
            </div>
            <p className="mt-1 text-lg font-bold">Start a focus session</p>
            <p className="mt-1 text-sm text-on-primary/80">
              Log real minutes against a topic and watch your progress climb.
            </p>
            <Button
              variant="secondary"
              className="mt-4 w-full border-0 bg-on-primary/15 text-on-primary hover:bg-on-primary/25"
              onClick={() => navigate('/app/timer')}
            >
              <Plus className="h-4 w-4" /> Open timer
            </Button>
          </Card>
        </div>
      </div>

      <SmartRecoveryModal session={recover} onClose={() => setRecover(null)} />
    </div>
  )
}

function SubjectProgress(): JSX.Element {
  const { data } = useStore()
  const subjectStats = useMemo(() => {
    const map = new Map<string, { completed: number; total: number }>()
    for (const s of data.sessions) {
      if (s.kind !== 'study' || !s.subjectId) continue
      const entry = map.get(s.subjectId) ?? { completed: 0, total: 0 }
      const len = duration(s)
      entry.total += len
      if (s.status === 'completed') entry.completed += s.actualMinutes || len
      map.set(s.subjectId, entry)
    }
    return data.subjects
      .map((subj) => {
        const e = map.get(subj.id) ?? { completed: 0, total: 0 }
        return { subject: subj, progress: percent(e.completed, e.total), total: e.total }
      })
      .filter((x) => x.total > 0)
  }, [data])

  if (subjectStats.length === 0) {
    return <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">No scheduled work yet.</p>
  }

  return (
    <div className="space-y-4">
      {subjectStats.map(({ subject, progress }) => (
        <div key={subject.id}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-ink">{subject.name}</span>
            <span className="text-ink-muted tnum">{progress}%</span>
          </div>
          <Progress value={progress} tone={progress >= 70 ? 'success' : progress >= 40 ? 'primary' : 'warning'} />
        </div>
      ))}
    </div>
  )
}

function duration(s: StudySession): number {
  return Math.max(0, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000))
}
