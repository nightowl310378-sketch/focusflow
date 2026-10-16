import { describe, it, expect } from 'vitest'
import {
  computeStudyTimeByDay,
  computeSubjectStats,
  computeTopicStats,
  studyConsistency,
  upcomingWorkloadMinutes,
} from '@/services/analytics'
import { createInitialData } from '@/constants/defaults'
import type { FocusFlowData, StudySession } from '@/domain/types'
import { toISODateTime } from '@/utils/dates'

function at(dayOffset: number, hour: number, minutes = 30): { start: string; end: string } {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  const start = new Date(d)
  const end = new Date(d.getTime() + minutes * 60000)
  return { start: toISODateTime(start), end: toISODateTime(end) }
}

function session(partial: Partial<StudySession>): StudySession {
  const { start, end } = at(0, 9)
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Study',
    kind: 'study',
    start,
    end,
    status: 'planned',
    origin: 'manual',
    ...partial,
  }
}

function withSessions(sessions: StudySession[]): FocusFlowData {
  return {
    ...createInitialData(),
    onboarded: true,
    subjects: [
      { id: 's1', name: 'Math', color: 'c', icon: 'i', createdAt: toISODateTime(new Date()) },
      { id: 's2', name: 'Physics', color: 'c', icon: 'i', createdAt: toISODateTime(new Date()) },
    ],
    topics: [
      {
        id: 't1',
        subjectId: 's1',
        name: 'Integrals',
        difficulty: 4,
        confidence: 20,
        status: 'in_progress',
        priority: 'high',
        estimatedMinutes: 120,
        createdAt: toISODateTime(new Date()),
      },
    ],
    sessions,
  }
}

describe('analytics', () => {
  it('splits planned vs completed minutes per day', () => {
    const data = withSessions([
      session({ status: 'planned', subjectId: 's1', ...at(0, 9, 60) }),
      session({ status: 'completed', subjectId: 's1', actualMinutes: 45, ...at(0, 11, 60) }),
    ])
    const stats = computeStudyTimeByDay(data, 14)
    const todayStat = stats[stats.length - 1]
    expect(todayStat.plannedMinutes).toBe(60)
    expect(todayStat.completedMinutes).toBe(45)
    expect(todayStat.completedCount).toBe(1)
  })

  it('computes per-subject progress from completed vs planned', () => {
    const data = withSessions([
      session({ status: 'completed', subjectId: 's1', actualMinutes: 60, ...at(0, 9, 60) }),
      session({ status: 'planned', subjectId: 's1', ...at(0, 11, 60) }),
      session({ status: 'planned', subjectId: 's2', ...at(0, 13, 30) }),
    ])
    const stats = computeSubjectStats(data)
    const math = stats.find((s) => s.subjectId === 's1')!
    const phys = stats.find((s) => s.subjectId === 's2')!
    expect(math.completedMinutes).toBe(60)
    expect(math.plannedMinutes).toBe(60)
    expect(math.progress).toBe(50)
    expect(phys.progress).toBe(0)
  })

  it('includes subjects with no sessions at zero progress', () => {
    const data = withSessions([])
    const stats = computeSubjectStats(data)
    expect(stats.length).toBe(2)
    expect(stats.every((s) => s.progress === 0)).toBe(true)
  })

  it('derives topic mastery from confidence and logged study time', () => {
    const data = withSessions([
      session({ status: 'completed', topicId: 't1', subjectId: 's1', actualMinutes: 60, ...at(0, 9, 60) }),
    ])
    const [topic] = computeTopicStats(data)
    expect(topic.studiedMinutes).toBe(60)
    expect(topic.mastery).toBeGreaterThan(20)
    expect(topic.mastery).toBeLessThanOrEqual(100)
  })

  it('measures consistency as the share of active days', () => {
    const data = withSessions([
      session({ status: 'completed', ...at(0, 9, 30) }),
      session({ status: 'completed', ...at(-1, 9, 30) }),
    ])
    const consistency = studyConsistency(data, 30)
    expect(consistency).toBeGreaterThan(0)
    expect(consistency).toBeLessThanOrEqual(100)
  })

  it('sums only planned workload within the horizon', () => {
    const data = withSessions([
      session({ status: 'planned', ...at(1, 9, 60) }),
      session({ status: 'completed', ...at(1, 11, 60) }),
      session({ status: 'planned', ...at(40, 9, 60) }),
    ])
    expect(upcomingWorkloadMinutes(data, 7)).toBe(60)
  })
})
