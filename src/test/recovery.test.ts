import { describe, it, expect } from 'vitest'
import { recoverFromMissed, applyRecovery } from '@/services/recovery'
import { createInitialData } from '@/constants/defaults'
import type { FocusFlowData } from '@/domain/types'
import { toISODate, addDays, toISODateTime } from '@/utils/dates'
import { uid } from '@/utils/format'

function buildData(): FocusFlowData {
  const now = new Date()
  const d = createInitialData()
  d.demo = false
  const subj = {
    id: uid('subj'),
    name: 'Phy',
    color: 'bg-violet-100 text-violet-700 ring-violet-500/40',
    icon: 'flask',
    createdAt: toISODateTime(now),
  }
  const exam = {
    id: uid('exam'),
    subjectId: subj.id,
    name: 'E',
    date: toISODate(addDays(now, 5)),
    importance: 4,
    createdAt: toISODateTime(now),
  } as const
  const topic = {
    id: uid('topic'),
    subjectId: subj.id,
    name: 'Motion',
    difficulty: 3,
    confidence: 40,
    status: 'in_progress' as const,
    priority: 'medium' as const,
    estimatedMinutes: 80,
    examId: exam.id,
    createdAt: toISODateTime(now),
  } as const
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0)
  const missed = {
    id: uid('sess'),
    title: topic.name,
    kind: 'study' as const,
    subjectId: subj.id,
    topicId: topic.id,
    start: toISODateTime(t0),
    end: toISODateTime(new Date(t0.getTime() + 40 * 60000)),
    status: 'planned' as const,
    origin: 'manual' as const,
  }
  d.subjects = [subj]
  d.exams = [exam]
  d.topics = [topic]
  d.sessions = [missed]
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

describe('recovery', () => {
  it('recovers missed session work', () => {
    const data = buildData()
    const res = recoverFromMissed(data, new Date(), { missedSessionId: data.sessions[0].id })
    expect(res.sessions.length).toBeGreaterThan(0)
    const after = applyRecovery(data, res, data.sessions[0].id)
    const missedMarked = after.sessions.find((s) => s.id === data.sessions[0].id)
    expect(missedMarked?.status).toBe('missed')
    const rec = after.sessions.filter((s) => s.origin === 'recovery')
    expect(rec.length).toBeGreaterThan(0)
    expect(rec[0].rescheduledFromId).toBe(data.sessions[0].id)
  })

  it('preserves completed sessions', () => {
    const data = buildData()
    data.sessions.push({
      id: uid('c'),
      title: 'Done',
      kind: 'study',
      start: toISODateTime(new Date()),
      end: toISODateTime(new Date(Date.now() + 25 * 60000)),
      status: 'completed',
      origin: 'manual',
      completedAt: toISODateTime(new Date()),
      actualMinutes: 25,
    })
    const res = recoverFromMissed(data, new Date(), { missedSessionId: data.sessions[0].id })
    const after = applyRecovery(data, res, data.sessions[0].id)
    const completed = after.sessions.filter((s) => s.status === 'completed')
    expect(completed.length).toBe(1)
  })
})
