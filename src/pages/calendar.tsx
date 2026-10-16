import { ChevronLeft, ChevronRight, Coffee } from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import type { StudySession } from '@/domain/types'
import { setSessionStatus } from '@/services/planner'
import { useStore } from '@/storage/use-store'
import { cn } from '@/lib/cn'
import { addDays, formatTime, isSameDay, startOfDay, toISODate } from '@/utils/dates'
import { formatMinutes } from '@/utils/format'
import { subjectColorClass } from '@/utils/subject-meta'

function mondayOf(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  return addDays(d, -(day - 1))
}

export default function CalendarPage(): JSX.Element {
  const { data, setData } = useStore()
  const { toast } = useToast()
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => addDays(mondayOf(new Date()), weekOffset * 7), [weekOffset])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, StudySession[]>()
    for (const s of data.sessions) {
      const key = toISODate(startOfDay(new Date(s.start)))
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    return map
  }, [data.sessions])

  const weekSessions = days.flatMap((d) => sessionsByDay.get(toISODate(d)) ?? [])
  const weekMinutes = weekSessions
    .filter((s) => s.kind === 'study')
    .reduce((sum, s) => sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000, 0)

  const toggle = (s: StudySession) => {
    if (s.kind !== 'study') return
    const next = s.status === 'completed' ? 'planned' : 'completed'
    setData((prev) => setSessionStatus(prev, s.id, next))
    toast({
      tone: next === 'completed' ? 'success' : 'info',
      title: next === 'completed' ? 'Marked complete' : 'Marked as planned',
      message: s.title,
    })
  }

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Schedule"
        title="Weekly calendar"
        description="Your sessions across the week. Tap a study session to toggle it complete."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset(0)}>
              This week
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="primary">{rangeLabel}</Badge>
        <Badge tone="neutral">{formatMinutes(weekMinutes)} scheduled</Badge>
      </div>

      {weekSessions.length === 0 ? (
        <EmptyState
          icon={<Coffee className="h-5 w-5" />}
          title="Nothing scheduled this week"
          description="Generate a plan or move to another week to see your sessions."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const sessions = sessionsByDay.get(toISODate(day)) ?? []
            const isToday = isSameDay(day, new Date())
            const dayMinutes = sessions
              .filter((s) => s.kind === 'study')
              .reduce((sum, s) => sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000, 0)
            return (
              <Card
                key={day.toISOString()}
                className={cn('flex min-h-[8rem] flex-col gap-2 p-3', isToday && 'border-primary/60 ring-1 ring-primary/30')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-xs font-semibold uppercase', isToday ? 'text-primary' : 'text-ink-muted')}>
                      {day.toLocaleDateString(undefined, { weekday: 'short' })}
                    </p>
                    <p className={cn('text-lg font-bold', isToday ? 'text-primary' : 'text-ink')}>
                      {day.getDate()}
                    </p>
                  </div>
                  {dayMinutes > 0 ? <span className="text-[11px] text-ink-muted tnum">{formatMinutes(dayMinutes)}</span> : null}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-ink-muted/70">—</p>
                  ) : (
                    sessions.map((s) => {
                      const subject = s.subjectId ? subjectById.get(s.subjectId) : undefined
                      const isBreak = s.kind === 'break'
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggle(s)}
                          disabled={isBreak}
                          className={cn(
                            'rounded-xl px-2 py-1.5 text-left text-[11px] leading-tight ring-1 ring-inset transition-transform',
                            isBreak
                              ? 'bg-soft text-ink-muted ring-line'
                              : subject
                                ? subjectColorClass(subject.color)
                                : 'subj-slate',
                            !isBreak && 'hover:scale-[1.02]',
                            s.status === 'completed' && 'opacity-60',
                            s.status === 'missed' && 'ring-2 ring-warning',
                          )}
                          title={`${s.title} · ${formatTime(s.start)}`}
                        >
                          <span className="block truncate font-medium">{subject?.name ?? (isBreak ? 'Break' : s.title)}</span>
                          <span className="block truncate opacity-80 tnum">{formatTime(s.start)}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
