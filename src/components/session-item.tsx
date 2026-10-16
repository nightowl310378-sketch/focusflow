import { Check, Clock, Coffee, RotateCcw, Undo2, X } from 'lucide-react'
import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SessionStatus, StudySession, Subject } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDate, formatTime } from '@/utils/dates'
import { formatMinutes } from '@/utils/format'
import { subjectColorClass, subjectIcon } from '@/utils/subject-meta'

interface Props {
  session: StudySession
  subject?: Subject
  showDay?: boolean
  onComplete?: (s: StudySession) => void
  onMiss?: (s: StudySession) => void
  onReset?: (s: StudySession) => void
}

const statusTone: Record<SessionStatus, 'neutral' | 'success' | 'warning' | 'primary'> = {
  planned: 'primary',
  completed: 'success',
  missed: 'warning',
  rescheduled: 'neutral',
}

const statusLabel: Record<SessionStatus, string> = {
  planned: 'Planned',
  completed: 'Completed',
  missed: 'Missed',
  rescheduled: 'Rescheduled',
}

export function SessionItem({
  session,
  subject,
  showDay,
  onComplete,
  onMiss,
  onReset,
}: Props): JSX.Element {
  const isBreak = session.kind === 'break'
  const minutes = Math.max(
    0,
    Math.round((new Date(session.end).getTime() - new Date(session.start).getTime()) / 60000),
  )

  if (isBreak) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
        <Coffee className="h-4 w-4 shrink-0" />
        <span className="flex-1">{session.title}</span>
        <span className="text-xs tnum">
          {formatTime(session.start)} · {formatMinutes(minutes)}
        </span>
      </div>
    )
  }

  const Icon = subject ? subjectIcon(subject.icon) : Clock

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-primary/40 sm:flex-row sm:items-center',
        session.status === 'completed' && 'opacity-90',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
          subject ? subjectColorClass(subject.color) : 'subj-slate',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate text-sm font-semibold text-ink',
              session.status === 'completed' && 'line-through decoration-ink-muted/40',
            )}
          >
            {session.title}
          </p>
          <Badge tone={statusTone[session.status]}>{statusLabel[session.status]}</Badge>
          {session.origin === 'recovery' ? <Badge tone="cyan">Recovered</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">
          {subject ? `${subject.name} · ` : ''}
          {showDay ? `${formatDate(session.start)} · ` : ''}
          {formatTime(session.start)}–{formatTime(session.end)} · {formatMinutes(minutes)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 sm:opacity-100">
        {session.status === 'planned' ? (
          <>
            <button
              type="button"
              onClick={() => onComplete?.(session)}
              className="inline-flex items-center gap-1 rounded-xl bg-success-soft px-2.5 py-1.5 text-xs font-medium text-success-ink transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
            <button
              type="button"
              onClick={() => onMiss?.(session)}
              className="inline-flex items-center gap-1 rounded-xl bg-warning-soft px-2.5 py-1.5 text-xs font-medium text-warning-ink transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Missed
            </button>
          </>
        ) : null}
        {session.status === 'completed' ? (
          <button
            type="button"
            onClick={() => onReset?.(session)}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-soft-2"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        ) : null}
        {session.status === 'missed' ? (
          <>
            <button
              type="button"
              onClick={() => onMiss?.(session)}
              className="inline-flex items-center gap-1 rounded-xl bg-cyan-soft px-2.5 py-1.5 text-xs font-medium text-cyan-ink transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recover
            </button>
            <button
              type="button"
              onClick={() => onReset?.(session)}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-soft-2"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
