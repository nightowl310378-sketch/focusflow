import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Info,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { SessionItem } from '@/components/session-item'
import { SmartRecoveryModal } from '@/components/smart-recovery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import type { StudySession } from '@/domain/types'
import { generateTimetable, setSessionStatus } from '@/services/planner'
import { useStore } from '@/storage/use-store'
import { formatDate, startOfDay, toISODate } from '@/utils/dates'
import { formatMinutes, percent } from '@/utils/format'

export default function Plan(): JSX.Element {
  const { data, setData, replaceData } = useStore()
  const { toast } = useToast()
  const [recover, setRecover] = useState<StudySession | null>(null)

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const missedSessions = useMemo(
    () => data.sessions.filter((s) => s.status === 'missed').sort(byStart),
    [data.sessions],
  )

  const groupedDays = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime()
    const map = new Map<string, StudySession[]>()
    for (const s of data.sessions) {
      if (s.status !== 'planned') continue
      if (startOfDay(new Date(s.start)).getTime() < todayStart && s.status === 'planned') {
        // past planned sessions still surface on today if same day; else skip
      }
      const key = toISODate(startOfDay(new Date(s.start)))
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([key, sessions]) => ({ key, sessions: sessions.sort(byStart) }))
  }, [data.sessions])

  const studySessions = data.sessions.filter((s) => s.kind === 'study')
  const plannedMinutes = studySessions
    .filter((s) => s.status === 'planned')
    .reduce((sum, s) => sum + dur(s), 0)
  const completedMinutes = studySessions
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + (s.actualMinutes || dur(s)), 0)

  const coverage = useMemo(() => {
    const plannedByTopic = new Map<string, number>()
    for (const s of data.sessions) {
      if (!s.topicId || s.kind !== 'study' || s.status === 'completed') continue
      plannedByTopic.set(s.topicId, (plannedByTopic.get(s.topicId) ?? 0) + dur(s))
    }
    const unfinished = data.topics.filter((t) => t.status !== 'mastered')
    const rows = unfinished.map((t) => {
      const studied = data.sessions
        .filter((s) => s.topicId === t.id && s.status === 'completed')
        .reduce((sum, s) => sum + (s.actualMinutes || dur(s)), 0)
      const scheduled = plannedByTopic.get(t.id) ?? 0
      const covered = studied + scheduled
      return { topic: t, covered, estimate: t.estimatedMinutes }
    })
    const totalEstimate = rows.reduce((sum, r) => sum + r.estimate, 0)
    const totalCovered = rows.reduce((sum, r) => sum + Math.min(r.covered, r.estimate), 0)
    return { rows, coverage: percent(totalCovered, totalEstimate) }
  }, [data.topics, data.sessions])

  const handleGenerate = () => {
    if (data.topics.length === 0) {
      toast({ tone: 'info', title: 'Add topics first', message: 'Create topics so we know what to schedule.' })
      return
    }
    const { data: next, result } = generateTimetable(data)
    replaceData(next)
    toast({
      tone: result.warnings.length ? 'warning' : 'success',
      title: 'Plan regenerated',
      message:
        result.warnings[0] ??
        `${result.sessions.filter((s) => s.kind === 'study').length} study sessions scheduled across your week.`,
    })
  }

  const complete = (s: StudySession) => {
    setData((prev) => setSessionStatus(prev, s.id, 'completed'))
    toast({ tone: 'success', title: 'Nice work!', message: `${s.title} marked complete.` })
  }
  const reset = (s: StudySession) => setData((prev) => setSessionStatus(prev, s.id, 'planned'))

  const warnings = data.planMeta?.warnings ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Planner"
        title="Your study plan"
        description="Generated deterministically from exam urgency, topic difficulty, confidence gaps and your available time."
        actions={
          <Button onClick={handleGenerate}>
            <Wand2 className="h-4 w-4" /> {data.sessions.some((s) => s.origin === 'plan') ? 'Regenerate' : 'Generate plan'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Scheduled ahead</p>
            <p className="text-xl font-bold text-ink tnum">{formatMinutes(plannedMinutes)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-soft text-success-ink">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Completed</p>
            <p className="text-xl font-bold text-ink tnum">{formatMinutes(completedMinutes)}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Topic coverage</p>
            <span className="text-xl font-bold text-ink tnum">{coverage.coverage}%</span>
          </div>
          <Progress className="mt-2" value={coverage.coverage} tone={coverage.coverage >= 80 ? 'success' : coverage.coverage >= 50 ? 'primary' : 'warning'} />
          <p className="mt-1.5 text-xs text-ink-muted">Workload that fits before your exams</p>
        </Card>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-ink">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Capacity warning</p>
                <p className="text-xs">{w}</p>
              </div>
              <Link to="/app/settings" className="shrink-0 text-xs font-semibold underline">
                Adjust hours
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {missedSessions.length > 0 ? (
            <Card className="border-warning/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <CardTitle>Needs recovery</CardTitle>
                </div>
                <Badge tone="warning">{missedSessions.length}</Badge>
              </CardHeader>
              <p className="mb-3 text-sm text-ink-muted">
                These sessions were missed. Smart Recovery will redistribute the unfinished work
                around your exams.
              </p>
              <div className="space-y-2.5">
                {missedSessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    subject={s.subjectId ? subjectById.get(s.subjectId) : undefined}
                    showDay
                    onMiss={setRecover}
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {groupedDays.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No sessions scheduled"
              description="Generate a plan to fill your week and see exactly what to study and when."
              action={
                <Button onClick={handleGenerate}>
                  <Wand2 className="h-4 w-4" /> Generate plan
                </Button>
              }
            />
          ) : (
            groupedDays.map(({ key, sessions }) => {
              const study = sessions.filter((s) => s.kind === 'study')
              const total = study.reduce((sum, s) => sum + dur(s), 0)
              return (
                <Card key={key}>
                  <CardHeader>
                    <div>
                      <CardTitle>{formatDate(`${key}T00:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })}</CardTitle>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {study.length} session{study.length === 1 ? '' : 's'} · {formatMinutes(total)}
                      </p>
                    </div>
                  </CardHeader>
                  <div className="space-y-2.5">
                    {sessions.map((s) => (
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
                </Card>
              )
            })
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic coverage</CardTitle>
              <Info className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            {coverage.rows.length === 0 ? (
              <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">No topics yet.</p>
            ) : (
              <ul className="space-y-3">
                {coverage.rows
                  .sort((a, b) => percent(a.covered, a.estimate) - percent(b.covered, b.estimate))
                  .slice(0, 8)
                  .map(({ topic, covered, estimate }) => {
                    const p = percent(covered, estimate)
                    return (
                      <li key={topic.id}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-ink">{topic.name}</span>
                          <span className="shrink-0 text-xs text-ink-muted tnum">
                            {formatMinutes(Math.min(covered, estimate))}/{formatMinutes(estimate)}
                          </span>
                        </div>
                        <Progress value={p} tone={p >= 100 ? 'success' : p > 0 ? 'primary' : 'warning'} />
                      </li>
                    )
                  })}
              </ul>
            )}
          </Card>

          <Card className="bg-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <RefreshCw className="h-4 w-4 text-primary" /> How Smart Recovery works
            </div>
            <ol className="mt-3 space-y-2 text-xs text-ink-2">
              <li>1. You mark a session as missed.</li>
              <li>2. We keep every completed session exactly where it is.</li>
              <li>3. Unfinished work is re-slotted before the exam, never overlapping.</li>
              <li>4. If it doesn&apos;t fit, we tell you instead of overbooking.</li>
            </ol>
          </Card>
        </div>
      </div>

      <SmartRecoveryModal session={recover} onClose={() => setRecover(null)} />
    </div>
  )
}

function dur(s: StudySession): number {
  return Math.max(0, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000))
}
function byStart(a: StudySession, b: StudySession): number {
  return new Date(a.start).getTime() - new Date(b.start).getTime()
}
