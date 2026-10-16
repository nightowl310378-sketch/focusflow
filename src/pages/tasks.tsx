import { CheckCircle2, Circle, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import type { PriorityLevel, Task } from '@/domain/types'
import { useStore, withRemovedTask, withUpsertTask } from '@/storage/use-store'
import { cn } from '@/lib/cn'
import { diffInDays, formatDate, parseISODate, today, toISODateTime } from '@/utils/dates'
import { percent, uid } from '@/utils/format'

const priorityTone: Record<PriorityLevel, 'neutral' | 'primary' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
}

type Filter = 'all' | 'active' | 'done'

export default function Tasks(): JSX.Element {
  const { data, setData } = useStore()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [form, setForm] = useState<{ open: boolean; editing?: Task }>({ open: false })

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const filtered = useMemo(() => {
    const list = [...data.tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const ad = a.dueDate ? parseISODate(a.dueDate).getTime() : Infinity
      const bd = b.dueDate ? parseISODate(b.dueDate).getTime() : Infinity
      return ad - bd
    })
    if (filter === 'active') return list.filter((t) => !t.completed)
    if (filter === 'done') return list.filter((t) => t.completed)
    return list
  }, [data.tasks, filter])

  const doneCount = data.tasks.filter((t) => t.completed).length

  const toggle = (task: Task) => {
    setData((prev) =>
      withUpsertTask(prev, {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? toISODateTime(new Date()) : undefined,
      }),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="To-do"
        title="Tasks"
        description="Quick action items alongside your scheduled study sessions."
        actions={
          <Button onClick={() => setForm({ open: true })}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">
              {doneCount} of {data.tasks.length} complete
            </p>
            <Progress className="mt-2 w-48" value={percent(doneCount, data.tasks.length)} tone="success" />
          </div>
          <div className="flex gap-1 rounded-xl bg-soft-2 p-1">
            {(['all', 'active', 'done'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === f ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title={data.tasks.length === 0 ? 'No tasks yet' : 'Nothing here'}
          description={
            data.tasks.length === 0
              ? 'Add revision tasks, practice papers or reading to keep everything in one place.'
              : 'Try a different filter.'
          }
          action={
            data.tasks.length === 0 ? (
              <Button onClick={() => setForm({ open: true })}>
                <Plus className="h-4 w-4" /> Add task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((task) => {
            const subject = task.subjectId ? subjectById.get(task.subjectId) : undefined
            const overdue =
              !task.completed && task.dueDate && diffInDays(today(), parseISODate(task.dueDate)) < 0
            return (
              <Card key={task.id} className={cn('flex items-start gap-3 p-4', task.completed && 'opacity-70')}>
                <button
                  type="button"
                  onClick={() => toggle(task)}
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  className="mt-0.5 shrink-0 text-primary"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-soft-3 hover:text-primary" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('text-sm font-medium text-ink', task.completed && 'line-through text-ink-muted')}>
                      {task.title}
                    </p>
                    <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
                    {subject ? <Badge tone="neutral">{subject.name}</Badge> : null}
                    {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                  </div>
                  {task.notes ? <p className="mt-1 text-xs text-ink-muted">{task.notes}</p> : null}
                  {task.dueDate ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Due {formatDate(task.dueDate, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setForm({ open: true, editing: task })}
                    aria-label="Edit task"
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-soft-2 hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setData((prev) => withRemovedTask(prev, task.id))
                      toast({ tone: 'success', title: 'Task deleted' })
                    }}
                    aria-label="Delete task"
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {form.open ? (
        <TaskForm
          task={form.editing}
          subjects={data.subjects}
          onClose={() => setForm({ open: false })}
          onSave={(draft, editing) => {
            const task: Task = editing
              ? { ...editing, ...draft }
              : { id: uid('task'), completed: false, createdAt: toISODateTime(new Date()), ...draft }
            setData((prev) => withUpsertTask(prev, task))
            toast({ tone: 'success', title: editing ? 'Task updated' : 'Task added' })
            setForm({ open: false })
          }}
        />
      ) : null}
    </div>
  )
}

function TaskForm({
  task,
  subjects,
  onClose,
  onSave,
}: {
  task?: Task
  subjects: { id: string; name: string }[]
  onClose: () => void
  onSave: (
    draft: { title: string; subjectId?: string; dueDate?: string; priority: PriorityLevel; notes?: string },
    editing?: Task,
  ) => void
}): JSX.Element {
  const [title, setTitle] = useState(task?.title ?? '')
  const [subjectId, setSubjectId] = useState(task?.subjectId ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [priority, setPriority] = useState<PriorityLevel>(task?.priority ?? 'medium')
  const [notes, setNotes] = useState(task?.notes ?? '')

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() =>
              onSave(
                {
                  title: title.trim(),
                  subjectId: subjectId || undefined,
                  dueDate: dueDate || undefined,
                  priority,
                  notes: notes.trim() || undefined,
                },
                task,
              )
            }
          >
            {task ? 'Save' : 'Add task'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Task">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solve past paper 2024" autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as PriorityLevel)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </Field>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
