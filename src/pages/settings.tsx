import { CalendarPlus, Database, Download, Eye, Moon, Pencil, RotateCcw, Save, Sparkles, Sun, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import type { Exam, ExamImportance, Preferences } from '@/domain/types'
import { createInitialData } from '@/constants/defaults'
import { generateTimetable } from '@/services/planner'
import { loadDemo, resetData } from '@/storage/storage'
import { importData as importBackup } from '@/storage/storage'
import { useStore } from '@/storage/use-store'
import { cn } from '@/lib/cn'
import { formatDate, toISODateTime, WEEKDAYS } from '@/utils/dates'
import { uid } from '@/utils/format'
import {
  TEXT_SIZES,
  TEXT_SIZE_LABELS,
  THEME_LABELS,
  THEME_MODES,
  useTheme,
  type ThemeMode,
} from '@/theme/theme'

const MODE_ICONS: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, comfort: Eye }
const MODE_HINTS: Record<ThemeMode, string> = {
  light: 'Bright and clean',
  dark: 'Easy on the eyes at night',
  comfort: 'Warm, low-glare tones',
}

export default function Settings(): JSX.Element {
  const { data, setData, replaceData } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme, setTheme, textSize, setTextSize } = useTheme()
  const [examForm, setExamForm] = useState<{ open: boolean; editing?: Exam }>({ open: false })
  const fileInput = useRef<HTMLInputElement>(null)

  const prefs = data.preferences
  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const updatePrefs = (patch: Partial<Preferences>) =>
    setData((prev) => ({ ...prev, preferences: { ...prev.preferences, ...patch } }))

  const toggleDay = (d: number) =>
    updatePrefs({
      studyDays: prefs.studyDays.includes(d)
        ? prefs.studyDays.filter((x) => x !== d)
        : [...prefs.studyDays, d].sort(),
    })

  const regenerate = () => {
    const { data: next, result } = generateTimetable(data)
    replaceData(next)
    toast({
      tone: result.warnings.length ? 'warning' : 'success',
      title: 'Plan rebuilt with new settings',
      message: result.warnings[0] ?? 'Your timetable now reflects these preferences.',
    })
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'focusflow-data.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({ tone: 'success', title: 'Data exported' })
  }

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = importBackup(String(reader.result ?? ''))
      if (!next) {
        toast({
          tone: 'error',
          title: 'Import failed',
          message: 'That file is not a valid FocusFlow backup.',
        })
        return
      }
      replaceData(next)
      toast({ tone: 'success', title: 'Backup restored', message: 'Your imported data is now active.' })
      navigate('/app')
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Configure" title="Settings" description="Profile, study availability, exams and your data." />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <p className="text-sm text-ink-muted">
          Choose a colour mode and text size. Your choice is saved on this device and applied
          instantly.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {THEME_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode]
            const active = theme === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  active ? 'border-primary bg-primary-soft' : 'border-line hover:bg-soft',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    active ? 'bg-primary text-on-primary' : 'bg-soft-2 text-ink-muted',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{THEME_LABELS[mode]}</span>
                  <span className="block text-xs text-ink-muted">{MODE_HINTS[mode]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-5">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Text size</span>
          <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            {TEXT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTextSize(size)}
                aria-pressed={textSize === size}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  textSize === size ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-soft-2',
                )}
              >
                {TEXT_SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile & availability</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Field label="Your name">
              <Input
                value={data.profile.name}
                onChange={(e) => setData((prev) => ({ ...prev, profile: { ...prev.profile, name: e.target.value } }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Daily study hours" hint="Caps total scheduled study time per day.">
                <Input
                  type="number"
                  min={0.5}
                  max={14}
                  step={0.5}
                  value={prefs.dailyStudyHours}
                  onChange={(e) => updatePrefs({ dailyStudyHours: Number(e.target.value) })}
                />
              </Field>
              <Field label="Focus session length">
                <Select value={prefs.sessionMinutes} onChange={(e) => updatePrefs({ sessionMinutes: Number(e.target.value) })}>
                  {[15, 20, 25, 30, 45, 50].map((v) => (
                    <option key={v} value={v}>
                      {v} minutes
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Study window">
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={minsToTime(prefs.studyWindows[0]?.start ?? 1020)}
                  onChange={(e) =>
                    updatePrefs({
                      studyWindows: [{ start: timeToMins(e.target.value), end: prefs.studyWindows[0]?.end ?? 1260 }],
                    })
                  }
                />
                <span className="text-ink-muted">to</span>
                <Input
                  type="time"
                  value={minsToTime(prefs.studyWindows[0]?.end ?? 1260)}
                  onChange={(e) =>
                    updatePrefs({
                      studyWindows: [{ start: prefs.studyWindows[0]?.start ?? 1020, end: timeToMins(e.target.value) }],
                    })
                  }
                />
              </div>
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-2">Study days</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      'h-9 w-11 rounded-xl border text-xs font-medium transition-colors',
                      prefs.studyDays.includes(i)
                        ? 'border-primary bg-primary-soft text-primary-strong'
                        : 'border-line text-ink-muted hover:bg-soft',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="secondary" onClick={regenerate}>
              <RotateCcw className="h-4 w-4" /> Rebuild plan with these settings
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exams</CardTitle>
            <Button variant="soft" size="sm" onClick={() => setExamForm({ open: true })}>
              <CalendarPlus className="h-4 w-4" /> Add exam
            </Button>
          </CardHeader>
          {data.exams.length === 0 ? (
            <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">
              No exams yet. Exam dates are the strongest signal the planner uses.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {[...data.exams]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{e.name}</p>
                        <Badge tone={e.importance >= 4 ? 'danger' : e.importance === 3 ? 'warning' : 'neutral'}>
                          P{e.importance}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-muted">
                        {subjectById.get(e.subjectId ?? '')?.name ?? 'General'} ·{' '}
                        {formatDate(`${e.date}T00:00:00`, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExamForm({ open: true, editing: e })}
                      aria-label="Edit exam"
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-soft-2 hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setData((prev) => ({ ...prev, exams: prev.exams.filter((x) => x.id !== e.id) }))}
                      aria-label="Delete exam"
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <Database className="h-4 w-4 text-ink-muted" />
        </CardHeader>
        <p className="text-sm text-ink-muted">
          FocusFlow stores everything locally in your browser. Nothing is sent to a server.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              replaceData(loadDemo())
              toast({ tone: 'info', title: 'Demo data loaded' })
              navigate('/app')
            }}
          >
            <Sparkles className="h-4 w-4" /> Load demo data
          </Button>
          <Button variant="secondary" onClick={exportData}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="secondary"
            onClick={() => {
              replaceData(createInitialData({ demo: false }))
              toast({ tone: 'success', title: 'Fresh start', message: 'Add subjects to begin planning.' })
              navigate('/app/subjects')
            }}
          >
            <Save className="h-4 w-4" /> Start fresh (keep profile)
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              replaceData(resetData())
              toast({ tone: 'info', title: 'Everything reset' })
              navigate('/')
            }}
          >
            <Trash2 className="h-4 w-4" /> Reset all data
          </Button>
        </div>
      </Card>

      {examForm.open ? (
        <ExamForm
          exam={examForm.editing}
          subjects={data.subjects}
          onClose={() => setExamForm({ open: false })}
          onSave={(draft, editing) => {
            if (editing) {
              setData((prev) => ({ ...prev, exams: prev.exams.map((e) => (e.id === editing.id ? { ...e, ...draft } : e)) }))
              toast({ tone: 'success', title: 'Exam updated' })
            } else {
              const exam: Exam = { id: uid('exam'), createdAt: toISODateTime(new Date()), ...draft }
              setData((prev) => ({ ...prev, exams: [...prev.exams, exam] }))
              toast({ tone: 'success', title: 'Exam added' })
            }
            setExamForm({ open: false })
          }}
        />
      ) : null}
    </div>
  )
}

function minsToTime(v: number): string {
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}
function timeToMins(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function ExamForm({
  exam,
  subjects,
  onClose,
  onSave,
}: {
  exam?: Exam
  subjects: { id: string; name: string }[]
  onClose: () => void
  onSave: (draft: Omit<Exam, 'id' | 'createdAt'>, editing?: Exam) => void
}): JSX.Element {
  const [name, setName] = useState(exam?.name ?? '')
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [importance, setImportance] = useState<ExamImportance>(exam?.importance ?? 3)

  return (
    <Modal
      open
      onClose={onClose}
      title={exam ? 'Edit exam' : 'Add exam'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !date}
            onClick={() =>
              onSave({ name: name.trim(), subjectId: subjectId || undefined, date, importance }, exam)
            }
          >
            {exam ? 'Save' : 'Add exam'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Exam name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology Final" autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Importance">
          <Select value={importance} onChange={(e) => setImportance(Number(e.target.value) as ExamImportance)}>
            <option value={1}>Low</option>
            <option value={2}>Minor</option>
            <option value={3}>Normal</option>
            <option value={4}>Important</option>
            <option value={5}>Critical</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
