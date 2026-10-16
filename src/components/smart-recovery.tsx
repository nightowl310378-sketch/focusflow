import { ArrowRight, CalendarClock, CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react'
import { useMemo, type JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { StudySession } from '@/domain/types'
import { recoverSession } from '@/services/planner'
import { useStore } from '@/storage/use-store'
import { formatDate, formatTime } from '@/utils/dates'
import { formatMinutes } from '@/utils/format'

interface Props {
  session: StudySession | null
  onClose: () => void
}

export function SmartRecoveryModal({ session, onClose }: Props): JSX.Element | null {
  const { data, replaceData } = useStore()
  const { toast } = useToast()

  const outcome = useMemo(() => {
    if (!session) return null
    return recoverSession(data, session.id)
  }, [data, session])

  const missedMinutes = session
    ? Math.max(
        1,
        Math.round((new Date(session.end).getTime() - new Date(session.start).getTime()) / 60000),
      )
    : 0

  const apply = () => {
    if (!outcome || !session) return
    replaceData(outcome.data)
    const placed = outcome.result.sessions.length
    toast({
      tone: outcome.result.warnings.length ? 'warning' : 'success',
      title: 'Plan updated',
      message: placed
        ? `Redistributed work into ${placed} new slot${placed === 1 ? '' : 's'}.`
        : 'No free time was found — see the suggestions.',
    })
    onClose()
  }

  if (!session || !outcome) return null

  const newSessions = outcome.result.sessions.filter((s) => s.kind === 'study')
  const uncovered = outcome.result.uncovered

  return (
    <Modal
      open={Boolean(session)}
      onClose={onClose}
      title="Smart Recovery"
      description="We recalculated your timetable around your exams and remaining time."
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>
            <RefreshCw className="h-4 w-4" /> Apply new plan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-soft p-4">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="font-medium text-ink">Missed session</span>
            <Badge tone="warning">Not completed</Badge>
          </div>
          <p className="mt-1 font-medium text-ink">{session.title}</p>
          <p className="text-xs text-ink-muted">
            {formatDate(session.start)} · {formatTime(session.start)}–{formatTime(session.end)} ·{' '}
            {formatMinutes(missedMinutes)} of work to recover
          </p>
        </div>

        {newSessions.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <ArrowRight className="h-4 w-4 text-success" />
              Moved into {newSessions.length} available slot{newSessions.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-2">
              {newSessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm"
                >
                  <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 font-medium text-ink">{s.title}</span>
                  <span className="text-xs text-ink-muted tnum">
                    {formatDate(s.start, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                    {formatTime(s.start)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {outcome.result.warnings.map((w) => (
          <div
            key={w}
            className="flex gap-2 rounded-2xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning-ink"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{w}</span>
          </div>
        ))}

        {uncovered.length > 0 ? (
          <div className="rounded-2xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning-ink">
            <p className="font-medium">Workload doesn&apos;t fully fit</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {uncovered.map((u) => {
                const topic = data.topics.find((t) => t.id === u.topicId)
                return (
                  <li key={u.topicId}>
                    {topic?.name ?? 'Topic'} — {formatMinutes(u.missingMinutes)} still unplaced
                  </li>
                )
              })}
            </ul>
            <p className="mt-1 text-xs">
              Try adding a study day, extending your window, or lowering the estimate.
            </p>
          </div>
        ) : null}

        <div className="flex items-start gap-2 rounded-2xl bg-primary-soft p-3 text-xs text-primary-strong">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Completed sessions are never moved, and nothing is double-booked.
        </div>
      </div>
    </Modal>
  )
}
