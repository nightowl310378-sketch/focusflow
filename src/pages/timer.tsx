import { Check, Coffee, Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { FocusRecord, TimerMode } from '@/domain/types'
import { useStore } from '@/storage/use-store'
import { cn } from '@/lib/cn'
import { isSameDay, startOfDay, toISODateTime } from '@/utils/dates'
import { formatMinutes, uid } from '@/utils/format'

const MODES: Record<TimerMode, { label: string; tone: string }> = {
  focus: { label: 'Focus', tone: 'text-primary' },
  short_break: { label: 'Short break', tone: 'text-success-ink' },
  long_break: { label: 'Long break', tone: 'text-cyan-ink' },
}

export default function TimerPage(): JSX.Element {
  const { data, setData } = useStore()
  const { toast } = useToast()

  const [mode, setMode] = useState<TimerMode>('focus')
  const [topicId, setTopicId] = useState('')
  const [totalSeconds, setTotalSeconds] = useState(data.preferences.sessionMinutes * 60)
  const [secondsLeft, setSecondsLeft] = useState(data.preferences.sessionMinutes * 60)
  const [running, setRunning] = useState(false)
  const endRef = useRef<number | null>(null)

  const topic = data.topics.find((t) => t.id === topicId)

  const durationFor = (m: TimerMode): number => {
    if (m === 'focus') return data.preferences.sessionMinutes * 60
    if (m === 'short_break') return data.preferences.breakMinutes * 60
    return data.preferences.longBreakMinutes * 60
  }

  const switchMode = (m: TimerMode) => {
    setMode(m)
    setRunning(false)
    endRef.current = null
    const secs = durationFor(m)
    setTotalSeconds(secs)
    setSecondsLeft(secs)
  }

  useEffect(() => {
    if (!running) return
    endRef.current = Date.now() + secondsLeft * 1000
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.round(((endRef.current ?? 0) - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        window.clearInterval(id)
        setRunning(false)
        finish(mode)
      }
    }, 200)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const finish = (finishedMode: TimerMode) => {
    const minutes = Math.round(totalSeconds / 60)
    if (finishedMode === 'focus') {
      const record: FocusRecord = {
        id: uid('focus'),
        mode: finishedMode,
        startedAt: toISODateTime(new Date(Date.now() - totalSeconds * 1000)),
        endedAt: toISODateTime(new Date()),
        minutes,
        counted: true,
        topicId: topicId || undefined,
        subjectId: topic?.subjectId,
      }
      setData((prev) => ({ ...prev, focusRecords: [...prev.focusRecords, record] }))
      toast({ tone: 'success', title: 'Focus session complete', message: `${minutes} minutes logged.` })
    } else {
      toast({ tone: 'info', title: 'Break finished', message: 'Ready for another focus block?' })
    }
    setSecondsLeft(totalSeconds)
  }

  const start = () => setRunning(true)
  const pause = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    endRef.current = null
    setSecondsLeft(totalSeconds)
  }

  const todayFocus = useMemo(
    () =>
      data.focusRecords.filter(
        (f) => f.counted && isSameDay(new Date(f.endedAt), new Date()),
      ),
    [data.focusRecords],
  )
  const todayMinutes = todayFocus.reduce((sum, f) => sum + f.minutes, 0)

  const totalFocusCount = data.focusRecords.filter((f) => f.counted).length
  const streakDays = useMemo(() => {
    const days = new Set(data.focusRecords.filter((f) => f.counted).map((f) => startOfDay(new Date(f.endedAt)).getTime()))
    let count = 0
    let cursor = startOfDay(new Date()).getTime()
    while (days.has(cursor) && count < 365) {
      count += 1
      cursor -= 86400000
    }
    return count
  }, [data.focusRecords])

  const progress = totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds
  const circumference = 2 * Math.PI * 120
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Focus"
        title="Focus timer"
        description="Run a Pomodoro-style timer and log real study minutes against your topics."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-6 p-6 lg:col-span-2">
          <div className="flex gap-1 rounded-2xl bg-soft-2 p-1">
            {(Object.keys(MODES) as TimerMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  mode === m ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          <div className="relative">
            <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
              <circle cx="140" cy="140" r="120" fill="none" stroke="var(--soft-3)" strokeWidth="14" />
              <circle
                cx="140"
                cy="140"
                r="120"
                fill="none"
                stroke={mode === 'focus' ? 'var(--primary)' : mode === 'short_break' ? 'var(--success)' : 'var(--cyan)'}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums tracking-tight text-ink tnum">
                {mm}:{ss}
              </span>
              <span className={cn('mt-1 text-sm font-medium', MODES[mode].tone)}>{MODES[mode].label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!running ? (
              <Button size="lg" onClick={start}>
                <Play className="h-5 w-5" /> {secondsLeft < totalSeconds ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pause}>
                <Pause className="h-5 w-5" /> Pause
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={reset}>
              <RotateCcw className="h-5 w-5" /> Reset
            </Button>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-1.5 block text-center text-xs font-medium text-ink-muted">
              Studying (optional)
            </label>
            <Select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Choose a topic…</option>
              {data.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Today</p>
              <p className="mt-1 text-xl font-bold text-ink tnum">{formatMinutes(todayMinutes)}</p>
              <p className="text-xs text-ink-muted">{todayFocus.length} session(s)</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Total logged</p>
              <p className="mt-1 text-xl font-bold text-ink tnum">{totalFocusCount}</p>
              <p className="text-xs text-ink-muted">{streakDays}-day streak</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <TimerIcon className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            {data.focusRecords.length === 0 ? (
              <EmptyState
                icon={<Coffee className="h-5 w-5" />}
                title="No focus sessions yet"
                description="Start the timer above — completed focus blocks appear here and feed your analytics."
              />
            ) : (
              <ul className="space-y-2">
                {[...data.focusRecords]
                  .reverse()
                  .slice(0, 6)
                  .map((f) => {
                    const t = data.topics.find((x) => x.id === f.topicId)
                    return (
                      <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-success" />
                        <span className="flex-1 truncate text-ink">{t?.name ?? 'Focus block'}</span>
                        <Badge tone="neutral">{formatMinutes(f.minutes)}</Badge>
                      </li>
                    )
                  })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
