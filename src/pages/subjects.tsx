import { BookOpen, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import type {
  Difficulty,
  PriorityLevel,
  Subject,
  Topic,
  TopicStatus,
} from '@/domain/types'
import { useStore, withAddedSubject, withAddedTopic, withRemovedSubject, withRemovedTopic, withUpdatedTopic } from '@/storage/use-store'
import { cn } from '@/lib/cn'
import { toISODateTime } from '@/utils/dates'
import { formatMinutes, uid } from '@/utils/format'
import { SUBJECT_COLORS, SUBJECT_ICON_MAP, DEFAULT_SUBJECT_ICON as defaultSubjectIcon, subjectColorClass, subjectIcon } from '@/utils/subject-meta'
import type { ComponentType } from 'react'

const ICON_NAMES = Object.keys(SUBJECT_ICON_MAP)

const priorityTone: Record<PriorityLevel, 'neutral' | 'primary' | 'warning' | 'danger' | 'success'> = {
  low: 'neutral',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
}

const statusLabel: Record<TopicStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  mastered: 'Mastered',
}

export default function Subjects(): JSX.Element {
  const { data, setData } = useStore()
  const { toast } = useToast()
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editing?: Subject }>({ open: false })
  const [topicModal, setTopicModal] = useState<{ open: boolean; subjectId?: string; editing?: Topic }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'subject' | 'topic'; id: string; name: string } | null>(null)

  const examsBySubject = useMemo(() => {
    const map = new Map<string, typeof data.exams>()
    for (const e of data.exams) {
      if (!e.subjectId) continue
      const list = map.get(e.subjectId) ?? []
      list.push(e)
      map.set(e.subjectId, list)
    }
    return map
  }, [data.exams])

  const removeConfirmed = () => {
    if (!confirmDelete) return
    if (confirmDelete.kind === 'subject') {
      setData((prev) => withRemovedSubject(prev, confirmDelete.id))
      toast({ tone: 'success', title: 'Subject removed' })
    } else {
      setData((prev) => withRemovedTopic(prev, confirmDelete.id))
      toast({ tone: 'success', title: 'Topic removed' })
    }
    setConfirmDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Organise"
        title="Subjects & topics"
        description="Define what you need to learn. Difficulty and confidence shape how the planner prioritises your time."
        actions={
          <Button onClick={() => setSubjectModal({ open: true })}>
            <Plus className="h-4 w-4" /> New subject
          </Button>
        }
      />

      {data.subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No subjects yet"
          description="Add a subject, then break it down into topics with difficulty and confidence ratings."
          action={
            <Button onClick={() => setSubjectModal({ open: true })}>
              <Plus className="h-4 w-4" /> Add subject
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.subjects.map((subject) => {
            const topics = data.topics.filter((t) => t.subjectId === subject.id)
            const Icon = subjectIcon(subject.icon)
            const exams = examsBySubject.get(subject.id) ?? []
            return (
              <Card key={subject.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset', subjectColorClass(subject.color))}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">{subject.name}</p>
                    <p className="text-xs text-ink-muted">
                      {topics.length} topic{topics.length === 1 ? '' : 's'}
                      {exams.length ? ` · ${exams.map((e) => e.name).join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSubjectModal({ open: true, editing: subject })}
                      aria-label="Edit subject"
                      className="rounded-xl p-2 text-ink-muted hover:bg-soft-2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ kind: 'subject', id: subject.id, name: subject.name })}
                      aria-label="Delete subject"
                      className="rounded-xl p-2 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-1 flex-col gap-2">
                  {topics.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">
                      No topics yet for {subject.name}.
                    </p>
                  ) : (
                    topics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        topic={topic}
                        examName={data.exams.find((e) => e.id === topic.examId)?.name}
                        onEdit={() => setTopicModal({ open: true, subjectId: subject.id, editing: topic })}
                        onDelete={() => setConfirmDelete({ kind: 'topic', id: topic.id, name: topic.name })}
                        onStatus={(status) => setData((prev) => withUpdatedTopic(prev, topic.id, { status }))}
                      />
                    ))
                  )}
                </div>

                <Button
                  variant="soft"
                  className="mt-4"
                  onClick={() => setTopicModal({ open: true, subjectId: subject.id })}
                >
                  <Plus className="h-4 w-4" /> Add topic
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {subjectModal.open ? (
        <SubjectForm
          subject={subjectModal.editing}
          onClose={() => setSubjectModal({ open: false })}
          onSave={(draft, editing) => {
            if (editing) {
              setData((prev) => ({
                ...prev,
                subjects: prev.subjects.map((s) => (s.id === editing.id ? { ...s, ...draft } : s)),
              }))
              toast({ tone: 'success', title: 'Subject updated' })
            } else {
              const subject: Subject = { id: uid('subj'), createdAt: toISODateTime(new Date()), ...draft }
              setData((prev) => withAddedSubject(prev, subject))
              toast({ tone: 'success', title: 'Subject added' })
            }
            setSubjectModal({ open: false })
          }}
        />
      ) : null}

      {topicModal.open ? (
        <TopicForm
          subjectId={topicModal.subjectId}
          topic={topicModal.editing}
          subjects={data.subjects}
          exams={data.exams}
          onClose={() => setTopicModal({ open: false })}
          onSave={(draft, editing) => {
            if (editing) {
              setData((prev) => withUpdatedTopic(prev, editing.id, draft))
              toast({ tone: 'success', title: 'Topic updated' })
            } else {
              const topic: Topic = {
                id: uid('topic'),
                createdAt: toISODateTime(new Date()),
                ...draft,
              }
              setData((prev) => withAddedTopic(prev, topic))
              toast({ tone: 'success', title: 'Topic added' })
            }
            setTopicModal({ open: false })
          }}
        />
      ) : null}

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.kind === 'subject' ? 'Delete subject?' : 'Delete topic?'}
        description={
          confirmDelete?.kind === 'subject'
            ? 'This removes the subject and all of its topics. Existing sessions are kept.'
            : 'This removes the topic. Existing sessions are kept.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeConfirmed}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          You are about to delete <span className="font-semibold text-ink">{confirmDelete?.name}</span>.
        </p>
      </Modal>
    </div>
  )
}

function TopicRow({
  topic,
  examName,
  onEdit,
  onDelete,
  onStatus,
}: {
  topic: Topic
  examName?: string
  onEdit: () => void
  onDelete: () => void
  onStatus: (s: TopicStatus) => void
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-line p-3 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-ink">{topic.name}</p>
            <Badge tone={priorityTone[topic.priority]}>{topic.priority}</Badge>
            {topic.status === 'mastered' ? <Badge tone="success">Mastered</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Difficulty {topic.difficulty}/5 · Confidence {topic.confidence}% ·{' '}
            {formatMinutes(topic.estimatedMinutes)}
            {examName ? ` · ${examName}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit topic"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-soft-2 hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete topic"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['not_started', 'in_progress', 'mastered'] as TopicStatus[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => onStatus(st)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              topic.status === st
                ? 'bg-primary text-on-primary'
                : 'bg-soft-2 text-ink-2 hover:bg-soft-3',
            )}
          >
            {topic.status === st ? <Check className="h-3 w-3" /> : null}
            {statusLabel[st]}
          </button>
        ))}
      </div>
    </div>
  )
}

function SubjectForm({
  subject,
  onClose,
  onSave,
}: {
  subject?: Subject
  onClose: () => void
  onSave: (draft: { name: string; color: string; icon: string }, editing?: Subject) => void
}): JSX.Element {
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLORS[0].class)
  const [icon, setIcon] = useState(subject?.icon ?? defaultSubjectIcon)

  return (
    <Modal
      open
      onClose={onClose}
      title={subject ? 'Edit subject' : 'New subject'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim(), color, icon }, subject)}
          >
            {subject ? 'Save changes' : 'Add subject'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Subject name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chemistry" autoFocus />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.class)}
                className={cn('h-9 w-9 rounded-xl ring-2 ring-inset transition-transform', c.class, color === c.class ? 'ring-ink scale-105' : 'ring-transparent')}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Icon</span>
          <div className="flex flex-wrap gap-2">
            {ICON_NAMES.map((nameKey) => {
              const Icon: ComponentType<{ className?: string }> = SUBJECT_ICON_MAP[nameKey]
              return (
                <button
                  key={nameKey}
                  type="button"
                  onClick={() => setIcon(nameKey)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                    icon === nameKey ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink-muted hover:bg-slate-50',
                  )}
                  aria-label={nameKey}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function TopicForm({
  subjectId,
  topic,
  subjects,
  exams,
  onClose,
  onSave,
}: {
  subjectId?: string
  topic?: Topic
  subjects: Subject[]
  exams: { id: string; name: string; subjectId?: string }[]
  onClose: () => void
  onSave: (
    draft: {
      name: string
      subjectId: string
      difficulty: Difficulty
      confidence: number
      estimatedMinutes: number
      priority: PriorityLevel
      status: TopicStatus
      examId?: string
      notes?: string
    },
    editing?: Topic,
  ) => void
}): JSX.Element {
  const [name, setName] = useState(topic?.name ?? '')
  const [subjId, setSubjId] = useState(topic?.subjectId ?? subjectId ?? subjects[0]?.id ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(topic?.difficulty ?? 3)
  const [confidence, setConfidence] = useState(topic?.confidence ?? 50)
  const [estimatedMinutes, setEstimatedMinutes] = useState(topic?.estimatedMinutes ?? 60)
  const [priority, setPriority] = useState<PriorityLevel>(topic?.priority ?? 'medium')
  const [status, setStatus] = useState<TopicStatus>(topic?.status ?? 'not_started')
  const [examId, setExamId] = useState(topic?.examId ?? '')
  const [notes, setNotes] = useState(topic?.notes ?? '')

  const availableExams = exams.filter((e) => !e.subjectId || e.subjectId === subjId)

  return (
    <Modal
      open
      onClose={onClose}
      title={topic ? 'Edit topic' : 'New topic'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !subjId}
            onClick={() =>
              onSave(
                {
                  name: name.trim(),
                  subjectId: subjId,
                  difficulty,
                  confidence: Math.min(100, Math.max(0, confidence)),
                  estimatedMinutes: Math.max(5, estimatedMinutes),
                  priority,
                  status,
                  examId: examId || undefined,
                  notes: notes.trim() || undefined,
                },
                topic,
              )
            }
          >
            {topic ? 'Save changes' : 'Add topic'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Topic name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electrochemistry" autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject">
            <Select value={subjId} onChange={(e) => setSubjId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Linked exam">
            <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">None</option>
              {availableExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Difficulty (1–5)">
            <Select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}>
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
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            />
          </Field>
          <Field label="Est. minutes">
            <Input
              type="number"
              min={5}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as PriorityLevel)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TopicStatus)}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="mastered">Mastered</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key formulas, resources, reminders…" />
        </Field>
      </div>
    </Modal>
  )
}
