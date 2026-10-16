import { describe, it, expect } from 'vitest'
import { generatePlan, rankTopics } from '@/services/scheduler'
import { createInitialData } from '@/constants/defaults'
import type { FocusFlowData } from '@/domain/types'
import { toISODate, addDays, toISODateTime } from '@/utils/dates'
import { uid } from '@/utils/format'

function buildData(): FocusFlowData {
  const now = new Date()
  const d = createInitialData()
  d.demo = false
  d.onboarded = true
  const subj = {
    id: uid('subj'),
    name: 'Math',
    color: 'bg-indigo-100 text-indigo-700 ring-indigo-500/40',
    icon: 'calc',
    createdAt: toISODateTime(now),
  }
  const exam = {
    id: uid('exam'),
    subjectId: subj.id,
    name: 'Exam',
    date: toISODate(addDays(now, 2)), // soon
    importance: 5,
    createdAt: toISODateTime(now),
  } as const
  const topic = {
    id: uid('topic'),
    subjectId: subj.id,
    name: 'Tough Topic',
    difficulty: 5,
    confidence: 20, // low
    status: 'not_started' as const,
    priority: 'high' as const,
    estimatedMinutes: 120,
    examId: exam.id,
    createdAt: toISODateTime(now),
  } as const
  d.subjects = [subj]
  d.exams = [exam]
  d.topics = [topic]
  d.sessions = []
  d.preferences = {
    ...d.preferences,
    studyDays: [1, 2, 3, 4, 5, 6, 0],
    dailyStudyHours: 6,
    sessionMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    studyWindows: [{ start: 9 * 60, end: 21 * 60 }],
  }
  return d
}

describe('scheduler', () => {
  it('ranks topics by priority formula', () => {
    const data = buildData()
    const ranked = rankTopics(data, new Date())
    expect(ranked.length).toBe(1)
    expect(ranked[0].score).toBeGreaterThan(60)
  })

  it('generates plan with no overlaps and respects capacity', () => {
    const data = buildData()
    const res = generatePlan(data, new Date())
    expect(res.sessions.length).toBeGreaterThan(0)
    const study = res.sessions.filter((s) => s.kind === 'study')
    expect(study.length).toBeGreaterThan(0)
    // check no overlaps among generated
    const sorted = [...res.sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]
      const b = sorted[i]
      expect(new Date(a.end).getTime()).toBeLessThanOrEqual(new Date(b.start).getTime())
    }
  })

  it('reports uncovered when insufficient capacity', () => {
    const data = buildData()
    data.topics[0].estimatedMinutes = 1000
    data.preferences.dailyStudyHours = 0.5 // very small
    const res = generatePlan(data, new Date())
    expect(res.uncovered.length).toBeGreaterThan(0)
    expect(res.warnings.length).toBeGreaterThan(0)
  })
})
