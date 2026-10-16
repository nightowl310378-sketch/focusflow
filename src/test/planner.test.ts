import { describe, it, expect } from 'vitest'
import { generatePlan, rankTopics } from '@/services/scheduler'
import { setSessionStatus, generateTimetable } from '@/services/planner'
import { createInitialData } from '@/constants/defaults'
import type { FocusFlowData } from '@/domain/types'
import { addDays, parseISODate, toISODate, toISODateTime } from '@/utils/dates'

function base(): FocusFlowData {
  const now = new Date()
  return {
    ...createInitialData(),
    onboarded: true,
    subjects: [
      {
        id: 's1',
        name: 'Math',
        color: 'bg-indigo-100 text-indigo-700 ring-indigo-500/40',
        icon: 'calc',
        createdAt: toISODateTime(now),
      },
    ],
    exams: [
      {
        id: 'e1',
        subjectId: 's1',
        name: 'Final',
        date: toISODate(addDays(now, 4)),
        importance: 5,
        createdAt: toISODateTime(now),
      },
    ],
    topics: [
      {
        id: 't1',
        subjectId: 's1',
        name: 'Hard Topic',
        difficulty: 5,
        confidence: 10,
        status: 'not_started',
        priority: 'high',
        estimatedMinutes: 100,
        examId: 'e1',
        createdAt: toISODateTime(now),
      },
    ],
    sessions: [],
    preferences: {
      studyDays: [0, 1, 2, 3, 4, 5, 6],
      dailyStudyHours: 8,
      sessionMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      studyWindows: [{ start: 9 * 60, end: 22 * 60 }],
    },
  }
}

describe('scheduler rules', () => {
  it('never schedules a study session after the linked exam date', () => {
    const data = base()
    const examDate = parseISODate(data.exams[0].date)
    const result = generatePlan(data, new Date())
    expect(result.sessions.length).toBeGreaterThan(0)
    for (const s of result.sessions) {
      expect(new Date(s.start).getTime()).toBeLessThanOrEqual(examDate.getTime() + 86400000)
      expect(new Date(s.start).getTime()).toBeLessThan(
        parseISODate(data.exams[0].date).getTime() + 86400000,
      )
    }
  })

  it('produces no overlapping study sessions', () => {
    const data = base()
    const result = generatePlan(data, new Date())
    const study = result.sessions
      .filter((s) => s.kind === 'study')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    for (let i = 1; i < study.length; i++) {
      expect(new Date(study[i - 1].end).getTime()).toBeLessThanOrEqual(
        new Date(study[i].start).getTime(),
      )
    }
  })

  it('priority rises when confidence falls', () => {
    const now = new Date()
    const low = base()
    const high = base()
    low.topics[0].confidence = 5
    high.topics[0].confidence = 95
    const lowScore = rankTopics(low, now)[0].score
    const highScore = rankTopics(high, now)[0].score
    expect(lowScore).toBeGreaterThan(highScore)
  })
})

describe('planner session status', () => {
  it('marks a session complete and records actual minutes', () => {
    const data = base()
    const start = new Date()
    const end = new Date(start.getTime() + 25 * 60000)
    data.sessions = [
      {
        id: 'x1',
        title: 'Study',
        kind: 'study',
        start: toISODateTime(start),
        end: toISODateTime(end),
        status: 'planned',
        origin: 'manual',
      },
    ]
    const next = setSessionStatus(data, 'x1', 'completed')
    expect(next.sessions[0].status).toBe('completed')
    expect(next.sessions[0].actualMinutes).toBe(25)
    expect(next.sessions[0].completedAt).toBeTruthy()
  })

  it('regenerating a timetable does not duplicate planned plan sessions', () => {
    const data = base()
    const first = generateTimetable(data)
    const second = generateTimetable(first.data)
    const firstCount = first.data.sessions.filter((s) => s.origin === 'plan').length
    const secondCount = second.data.sessions.filter((s) => s.origin === 'plan').length
    expect(secondCount).toBeLessThanOrEqual(firstCount)
  })
})
