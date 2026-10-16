import { describe, it, expect } from 'vitest'
import {
  withUpsertTask,
  withRemovedTask,
  withRemovedSubject,
  withUpdatedTopic,
} from '@/storage/use-store'
import { createInitialData } from '@/constants/defaults'
import type { Task } from '@/domain/types'
import { toISODateTime } from '@/utils/dates'
import { askAssistant, ASSISTANT_QUESTIONS, revisionPlanForSubject } from '@/services/assistant'
import { buildRecommendations } from '@/services/recommendations'

const task = (id: string, title: string): Task => ({
  id,
  title,
  priority: 'medium',
  completed: false,
  createdAt: toISODateTime(new Date()),
})

describe('task store selectors', () => {
  it('adds and updates a task immutably', () => {
    const base = createInitialData()
    const added = withUpsertTask(base, task('a', 'Read notes'))
    expect(added.tasks.length).toBe(1)
    expect(base.tasks.length).toBe(0)

    const done = withUpsertTask(added, { ...added.tasks[0], completed: true })
    expect(done.tasks.length).toBe(1)
    expect(done.tasks[0].completed).toBe(true)
  })

  it('removes a task', () => {
    const base = withUpsertTask(createInitialData(), task('a', 'Read notes'))
    expect(withRemovedTask(base, 'a').tasks.length).toBe(0)
  })

  it('detaches tasks from a removed subject instead of deleting them', () => {
    const base = createInitialData({ demo: true })
    const subjectId = base.subjects[0].id
    const withTask = withUpsertTask(base, { ...task('a', 'Assignment'), subjectId })
    const cleaned = withRemovedSubject(withTask, subjectId)
    const kept = cleaned.tasks.find((t) => t.id === 'a')
    expect(kept).toBeTruthy()
    expect(kept?.subjectId).toBeUndefined()
    expect(cleaned.subjects.find((s) => s.id === subjectId)).toBeUndefined()
  })

  it('updates a topic confidence without mutating others', () => {
    const base = createInitialData({ demo: true })
    const target = base.topics[0].id
    const next = withUpdatedTopic(base, target, { confidence: 99 })
    expect(next.topics.find((t) => t.id === target)?.confidence).toBe(99)
    expect(base.topics.find((t) => t.id === target)?.confidence).not.toBe(99)
  })
})

describe('recommendations', () => {
  it('prompts to add topics when none exist', () => {
    const recs = buildRecommendations(createInitialData())
    expect(recs.some((r) => r.id === 'add-topics')).toBe(true)
  })

  it('flags missed sessions for recovery with demo data', () => {
    const demo = createInitialData({ demo: true })
    const withMissed = {
      ...demo,
      sessions: demo.sessions.map((s, i) => (i === 0 ? { ...s, status: 'missed' as const } : s)),
    }
    const recs = buildRecommendations(withMissed)
    expect(recs.some((r) => r.id === 'recover')).toBe(true)
  })
})

describe('assistant', () => {
  it('answers every advertised question without throwing', () => {
    const data = createInitialData({ demo: true })
    for (const q of ASSISTANT_QUESTIONS) {
      const answer = askAssistant(q.id, data)
      expect(answer.id).toBe(q.id)
      expect(answer.summary.length).toBeGreaterThan(0)
      expect(['primary', 'warning', 'success', 'cyan', 'violet']).toContain(answer.tone)
    }
  })

  it('returns a graceful answer for an unknown question', () => {
    const answer = askAssistant('does-not-exist', createInitialData())
    expect(answer.id).toBe('unknown')
    expect(answer.bullets.length).toBe(0)
  })

  it('builds a numbered revision plan for a subject', () => {
    const data = createInitialData({ demo: true })
    const subjectId = data.subjects[0].id
    const plan = revisionPlanForSubject(data, subjectId)
    expect(plan.length).toBeGreaterThan(0)
    expect(plan[0].order).toBe(1)
    expect(plan.every((p) => p.minutes >= 0)).toBe(true)
  })
})
