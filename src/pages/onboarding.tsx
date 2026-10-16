import { ArrowLeft, ArrowRight, BookPlus, Check, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { Difficulty, Exam, ExamImportance, FocusFlowData, Subject, Topic } from '@/domain/types'
import { DATA_VERSION } from '@/domain/types'
import { createInitialData } from '@/constants/defaults'
import { generateTimetable } from '@/services/planner'
import { useStore } from '@/storage/use-store'
import { SUBJECT_COLORS, SUBJECT_ICON_MAP } from '@/utils/subject-meta'
import { addDays, toISODate, toISODateTime } from '@/utils/dates'
import { uid } from '@/utils/format'
import { WEEKDAYS } from '@/utils/dates'
import { cn } from '@/lib/cn'

interface DraftSubject {
  key: string
  name: string
  color: string
  icon: string
  examName: string
  examDate: string
  examImportance: ExamImportance
}

interface DraftTopic {
  key: string
  subjectKey: string
  name: string
  difficulty: Difficulty
  confidence: number
  estimatedMinutes: number
}

const ICONS = Object.keys(SUBJECT_ICON_MAP)

function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default function Onboarding(): JSX.Element {
  const { replaceData } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [dailyStudyHours, setDailyStudyHours] = useState(4)
  const [sessionMinutes, setSessionMinutes] = useState(25)
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [windowStart, setWindowStart] = useState('17:00')
  const [windowEnd, setWindowEnd] = useState('21:00')

  const [subjects, setSubjects] = useState<DraftSubject[]>([])
  const [topics, setTopics] = useState<DraftTopic[]>([])

  const toggleDay = (d: number) =>
    setStudyDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      {
        key: uid('ds'),
        name: '',
        color: SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length].class,
        icon: ICONS[prev.length % ICONS.length],
        examName: '',
        examDate: toISODate(addDays(new Date(), 7)),
        examImportance: 3,
      },
    ])
  }

  const updateSubject = (key: string, patch: Partial<DraftSubject>) =>
    setSubjects((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const removeSubject = (key: string) => {
    setSubjects((prev) => prev.filter((s) => s.key !== key))
    setTopics((prev) => prev.filter((t) => t.subjectKey !== key))
  }

  const addTopic = (subjectKey: string) =>
    setTopics((prev) => [
      ...prev,
      {
        key: uid('dt'),
        subjectKey,
        name: '',
        difficulty: 3,
        confidence: 50,
        estimatedMinutes: 90,
      },
    ])

  const updateTopic = (key: string, patch: Partial<DraftTopic>) =>
    setTopics((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)))

  const finish = () => {
    const namedSubjects = subjects.filter((s) => s.name.trim())
    if (namedSubjects.length === 0) {
      toast({ tone: 'error', title: 'Add at least one subject', message: 'A subject needs a name.' })
      setStep(1)
      return
    }
    const now = new Date()
    const base = createInitialData({ demo: false })
    const subjectEntities: Subject[] = []
    const exams: Exam[] = []

    for (const s of namedSubjects) {
      const subj: Subject = {
        id: uid('subj'),
        name: s.name.trim(),
        color: s.color,
        icon: s.icon,
        createdAt: toISODateTime(now),
      }
      subjectEntities.push(subj)
      if (s.examName.trim()) {
        exams.push({
          id: uid('exam'),
          subjectId: subj.id,
          name: s.examName.trim(),
          date: s.examDate,
          importance: s.examImportance,
          createdAt: toISODateTime(now),
        })
      }
    }

    const subjectKeyToId = new Map<string, string>()
    namedSubjects.forEach((s, i) => subjectKeyToId.set(s.key, subjectEntities[i].id))

    const topicEntities: Topic[] = topics
      .filter((t) => t.name.trim() && subjectKeyToId.has(t.subjectKey))
      .map((t) => {
        const subjectId = subjectKeyToId.get(t.subjectKey)!
        const exam = exams.find((e) => e.subjectId === subjectId)
        return {
          id: uid('topic'),
          subjectId,
          name: t.name.trim(),
          difficulty: t.difficulty,
          confidence: t.confidence,
          status: 'not_started' as const,
          priority: 'medium' as const,
          estimatedMinutes: Math.max(10, t.estimatedMinutes),
          examId: exam?.id,
          createdAt: toISODateTime(now),
        }
      })

    let next: FocusFlowData = {
      ...base,
      version: DATA_VERSION,
      onboarded: true,
      demo: false,
      profile: { name: name.trim() || 'Student' },
      preferences: {
        ...base.preferences,
        dailyStudyHours,
        sessionMinutes,
        studyDays: studyDays.length ? studyDays : [1, 2, 3, 4, 5, 6],
        studyWindows: [
          {
            start: hhmmToMinutes(windowStart),
            end: Math.max(hhmmToMinutes(windowStart) + 30, hhmmToMinutes(windowEnd)),
          },
        ],
      },
      subjects: subjectEntities,
      exams,
      topics: topicEntities,
    }

    next = generateTimetable(next).data
    replaceData(next)
    toast({
      tone: 'success',
      title: 'Study plan ready',
      message: topicEntities.length
        ? 'Your timetable is on the dashboard.'
        : 'Add topics in Subjects to fill your timetable.',
    })
    navigate('/app')
  }

  const steps = ['Basics', 'Subjects', 'Topics']

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-ink">Set up FocusFlow</span>
          <span className="ml-auto text-xs text-ink-muted">
            Step {step + 1} of {steps.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ol className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  i < step
                    ? 'bg-success text-on-primary'
                    : i === step
                      ? 'bg-primary text-on-primary'
                      : 'bg-soft-3 text-ink-muted',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('text-sm font-medium', i === step ? 'text-ink' : 'text-ink-muted')}>
                {s}
              </span>
              {i < steps.length - 1 ? <span className="ml-1 h-px flex-1 bg-line" /> : null}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <Card className="animate-rise">
            <h2 className="text-lg font-semibold text-ink">A few basics</h2>
            <p className="mt-1 text-sm text-ink-muted">
              These shape how much the planner schedules each day.
            </p>
            <div className="mt-5 grid gap-4">
              <Field label="Your name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Daily study hours">
                  <Input
                    type="number"
                    min={1}
                    max={14}
                    step={0.5}
                    value={dailyStudyHours}
                    onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                  />
                </Field>
                <Field label="Focus session length (min)">
                  <Select value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))}>
                    {[15, 20, 25, 30, 45, 50].map((v) => (
                      <option key={v} value={v}>
                        {v} minutes
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Study window" hint="The times of day you can usually study.">
                <div className="flex items-center gap-3">
                  <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
                  <span className="text-ink-muted">to</span>
                  <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
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
                        'h-10 w-12 rounded-xl border text-sm font-medium transition-colors',
                        studyDays.includes(i)
                          ? 'border-primary bg-primary-soft text-primary-strong'
                          : 'border-line bg-surface text-ink-muted hover:bg-soft',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card className="animate-rise">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Your subjects & exams</h2>
                <p className="mt-1 text-sm text-ink-muted">Add each subject and an exam date if you have one.</p>
              </div>
              <Button variant="soft" size="sm" onClick={addSubject}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {subjects.length === 0 ? (
                <button
                  type="button"
                  onClick={addSubject}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-8 text-sm text-ink-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <BookPlus className="h-6 w-6" />
                  Add your first subject
                </button>
              ) : null}
              {subjects.map((s, i) => (
                <div key={s.key} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-inset', s.color)}>
                      {s.name.trim() ? s.name.trim()[0].toUpperCase() : i + 1}
                    </span>
                    <Input
                      value={s.name}
                      onChange={(e) => updateSubject(s.key, { name: e.target.value })}
                      placeholder="Subject name"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeSubject(s.key)}
                      aria-label="Remove subject"
                      className="rounded-xl p-2 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Exam name (optional)">
                      <Input
                        value={s.examName}
                        onChange={(e) => updateSubject(s.key, { examName: e.target.value })}
                        placeholder="e.g. Midterm"
                      />
                    </Field>
                    <Field label="Exam date">
                      <Input
                        type="date"
                        value={s.examDate}
                        onChange={(e) => updateSubject(s.key, { examDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Importance">
                      <Select
                        value={s.examImportance}
                        onChange={(e) => updateSubject(s.key, { examImportance: Number(e.target.value) as ExamImportance })}
                      >
                        <option value={1}>Low</option>
                        <option value={2}>Minor</option>
                        <option value={3}>Normal</option>
                        <option value={4}>Important</option>
                        <option value={5}>Critical</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="animate-rise">
            <h2 className="text-lg font-semibold text-ink">Topics to cover</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Break each subject into topics. Difficulty and confidence drive scheduling priority.
            </p>
            <div className="mt-5 space-y-4">
              {subjects.filter((s) => s.name.trim()).length === 0 ? (
                <p className="rounded-2xl bg-soft p-4 text-sm text-ink-muted">
                  Add subjects first, then come back to list topics.
                </p>
              ) : null}
              {subjects
                .filter((s) => s.name.trim())
                .map((s) => (
                  <div key={s.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{s.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => addTopic(s.key)}>
                        <Plus className="h-4 w-4" /> Add topic
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {topics.filter((t) => t.subjectKey === s.key).length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-muted">
                          No topics yet.
                        </p>
                      ) : null}
                      {topics
                        .filter((t) => t.subjectKey === s.key)
                        .map((t) => (
                          <div key={t.key} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_auto_auto_auto]">
                            <Field label="Topic">
                              <Input
                                value={t.name}
                                onChange={(e) => updateTopic(t.key, { name: e.target.value })}
                                placeholder="e.g. Integration"
                              />
                            </Field>
                            <Field label="Difficulty">
                              <Select
                                value={t.difficulty}
                                onChange={(e) => updateTopic(t.key, { difficulty: Number(e.target.value) as Difficulty })}
                              >
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <Field label="Confidence %">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={t.confidence}
                                onChange={(e) => updateTopic(t.key, { confidence: Number(e.target.value) })}
                                className="w-24"
                              />
                            </Field>
                            <div className="flex items-center gap-1">
                              <Field label="Minutes">
                                <Input
                                  type="number"
                                  min={10}
                                  step={5}
                                  value={t.estimatedMinutes}
                                  onChange={(e) => updateTopic(t.key, { estimatedMinutes: Number(e.target.value) })}
                                  className="w-24"
                                />
                              </Field>
                              <button
                                type="button"
                                onClick={() => setTopics((prev) => prev.filter((x) => x.key !== t.key))}
                                aria-label="Remove topic"
                                className="mb-1.5 rounded-xl p-2 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => (step === 0 ? navigate('/') : setStep((s) => s - 1))}
          >
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Back to home' : 'Back'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check className="h-4 w-4" /> Generate my plan
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
