import { Activity, BarChart3, CheckCircle2, Flame, Target } from 'lucide-react'
import { useMemo, type JSX } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { computeStudyTimeByDay, computeTopicStats, studyConsistency } from '@/services/analytics'
import { buildRecommendations } from '@/services/recommendations'
import { useStore } from '@/storage/use-store'
import { formatMinutes, percent } from '@/utils/format'
import { cn } from '@/lib/cn'

export default function Analytics(): JSX.Element {
  const { data } = useStore()

  const days = useMemo(() => computeStudyTimeByDay(data, 14), [data])
  const maxMinutes = Math.max(60, ...days.map((d) => Math.max(d.plannedMinutes, d.completedMinutes)))
  const consistency = studyConsistency(data, 30)

  const totalCompleted = data.sessions
    .filter((s) => s.kind === 'study' && s.status === 'completed')
    .reduce((sum, s) => sum + (s.actualMinutes || dur(s)), 0)
  const totalPlanned = data.sessions
    .filter((s) => s.kind === 'study' && s.status === 'planned')
    .reduce((sum, s) => sum + dur(s), 0)
  const focusMinutes = data.focusRecords.filter((f) => f.counted).reduce((sum, f) => sum + f.minutes, 0)

  const subjectProgress = useMemo(() => {
    return data.subjects.map((subject) => {
      const topics = data.topics.filter((t) => t.subjectId === subject.id)
      const estimate = topics.reduce((sum, t) => sum + t.estimatedMinutes, 0)
      const done = data.sessions
        .filter((s) => s.topicId && topics.some((t) => t.id === s.topicId) && s.status === 'completed')
        .reduce((sum, s) => sum + (s.actualMinutes || dur(s)), 0)
      return { subject, estimate, done, progress: percent(done, estimate) }
    }).filter((x) => x.estimate > 0)
  }, [data])

  const topicStats = useMemo(
    () => computeTopicStats(data).sort((a, b) => a.mastery - b.mastery).slice(0, 8),
    [data],
  )

  const recommendations = useMemo(() => buildRecommendations(data), [data])
  const hasData = data.sessions.length > 0 || data.focusRecords.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Honest progress from your real sessions — planned vs completed, subject coverage and study habits."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Study completed" value={formatMinutes(totalCompleted)} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Still planned" value={formatMinutes(totalPlanned)} icon={<Target className="h-5 w-5" />} tone="primary" />
        <StatCard label="Focus timer logged" value={formatMinutes(focusMinutes)} hint={`${data.focusRecords.filter((f) => f.counted).length} sessions`} icon={<Activity className="h-5 w-5" />} tone="cyan" />
        <StatCard label="30-day consistency" value={`${consistency}%`} icon={<Flame className="h-5 w-5" />} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study minutes — last 14 days</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-soft-3" /> Planned
            </span>
          </div>
        </CardHeader>
        {!hasData ? (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No data yet" description="Complete a session or run the focus timer to populate your analytics." />
        ) : (
          <div className="flex h-56 items-end gap-1.5 sm:gap-2">
            {days.map((d) => {
              const plannedH = (d.plannedMinutes / maxMinutes) * 100
              const doneH = (d.completedMinutes / maxMinutes) * 100
              const isToday = d.date === new Date().toISOString().slice(0, 10)
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 max-w-[14px] rounded-t bg-soft-3" style={{ height: `${Math.max(plannedH, d.plannedMinutes > 0 ? 3 : 0)}%` }} title={`Planned ${formatMinutes(d.plannedMinutes)}`} />
                    <div className="w-1/2 max-w-[14px] rounded-t bg-primary" style={{ height: `${Math.max(doneH, d.completedMinutes > 0 ? 3 : 0)}%` }} title={`Completed ${formatMinutes(d.completedMinutes)}`} />
                  </div>
                  <span className={cn('text-[10px] tnum', isToday ? 'font-bold text-primary' : 'text-ink-muted')}>
                    {d.date.slice(8)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subject coverage</CardTitle>
            <span className="text-xs text-ink-muted">Completed ÷ estimated</span>
          </CardHeader>
          {subjectProgress.length === 0 ? (
            <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">No subject workload yet.</p>
          ) : (
            <div className="space-y-4">
              {subjectProgress.map(({ subject, done, estimate, progress }) => (
                <div key={subject.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{subject.name}</span>
                    <span className="text-xs text-ink-muted tnum">
                      {formatMinutes(done)} / {formatMinutes(estimate)}
                    </span>
                  </div>
                  <Progress value={progress} tone={progress >= 70 ? 'success' : progress >= 40 ? 'primary' : 'warning'} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weakest topics</CardTitle>
            <span className="text-xs text-ink-muted">Lowest mastery first</span>
          </CardHeader>
          {topicStats.length === 0 ? (
            <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">Add topics to see mastery.</p>
          ) : (
            <div className="space-y-3">
              {topicStats.map((t) => (
                <div key={t.topicId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                    <Progress className="mt-1" value={t.mastery} tone={t.mastery >= 70 ? 'success' : t.mastery >= 40 ? 'primary' : 'warning'} />
                  </div>
                  <Badge tone={t.confidence < 40 ? 'danger' : t.confidence < 70 ? 'warning' : 'success'}>
                    {t.confidence}% conf
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        {recommendations.length === 0 ? (
          <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">Nothing to flag — you&apos;re on track.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recommendations.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold text-ink">{r.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function dur(s: { start: string; end: string }): number {
  return Math.max(0, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000))
}
