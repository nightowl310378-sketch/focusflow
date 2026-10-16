import type { FocusFlowData } from '@/domain/types'
import { eachDay, startOfDay, toISODate } from '@/utils/dates'

export interface DayStat {
  date: string // yyyy-mm-dd
  plannedMinutes: number
  completedMinutes: number
  plannedCount: number
  completedCount: number
}

export interface SubjectStat {
  subjectId: string
  name: string
  plannedMinutes: number
  completedMinutes: number
  progress: number // 0–100
}

export interface TopicStat {
  topicId: string
  name: string
  status: string
  confidence: number
  estimatedMinutes: number
  studiedMinutes: number
  mastery: number // 0–100 approximate
}

export function computeStudyTimeByDay(data: FocusFlowData, days = 14): DayStat[] {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 86400000)
  const list = eachDay(start, end)
  const sessions = data.sessions
  return list.map((d) => {
    const k = toISODate(d)
    let plannedMinutes = 0
    let completedMinutes = 0
    let plannedCount = 0
    let completedCount = 0
    for (const s of sessions) {
      const sDate = startOfDay(new Date(s.start))
      if (toISODate(sDate) !== k) continue
      const len = Math.max(
        0,
        Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000),
      )
      if (s.status === 'completed') {
        completedCount += 1
        completedMinutes += s.actualMinutes && s.actualMinutes > 0 ? s.actualMinutes : len
      }
      if (s.status === 'planned' || s.status === 'missed' || s.status === 'rescheduled') {
        plannedCount += 1
        plannedMinutes += len
      }
    }
    return { date: k, plannedMinutes, completedMinutes, plannedCount, completedCount }
  })
}

export function computeSubjectStats(data: FocusFlowData): SubjectStat[] {
  const map = new Map<string, SubjectStat>()
  const subjects = new Map(data.subjects.map((s) => [s.id, s]))
  for (const s of sessionsAsList(data)) {
    if (!s.subjectId) continue
    const subj = subjects.get(s.subjectId)
    const entry = map.get(s.subjectId) || {
      subjectId: s.subjectId,
      name: subj?.name || 'Unassigned',
      plannedMinutes: 0,
      completedMinutes: 0,
      progress: 0,
    }
    const len = durationMin(s.start, s.end)
    if (s.status === 'completed') entry.completedMinutes += s.actualMinutes || len
    if (s.status === 'planned') entry.plannedMinutes += len
    map.set(s.subjectId, entry)
  }
  // include subjects with no sessions
  for (const subj of data.subjects) {
    if (!map.has(subj.id)) {
      map.set(subj.id, {
        subjectId: subj.id,
        name: subj.name,
        plannedMinutes: 0,
        completedMinutes: 0,
        progress: 0,
      })
    }
  }
  return Array.from(map.values()).map((e) => ({
    ...e,
    progress: e.completedMinutes + e.plannedMinutes === 0 ? 0 : Math.round((e.completedMinutes / (e.completedMinutes + e.plannedMinutes)) * 100),
  }))
}

export function computeTopicStats(data: FocusFlowData): TopicStat[] {
  const topics = data.topics
  const sessions = sessionsAsList(data)
  return topics.map((t) => {
    let studiedMinutes = 0
    for (const s of sessions) {
      if (s.topicId === t.id && s.status === 'completed') {
        studiedMinutes += s.actualMinutes || durationMin(s.start, s.end)
      }
    }
    const mastery = Math.min(100, Math.round((t.confidence + Math.min(100, (studiedMinutes / Math.max(1, t.estimatedMinutes)) * 100)) / 2))
    return {
      topicId: t.id,
      name: t.name,
      status: t.status,
      confidence: t.confidence,
      estimatedMinutes: t.estimatedMinutes,
      studiedMinutes,
      mastery,
    }
  })
}

export function upcomingWorkloadMinutes(data: FocusFlowData, days = 7): number {
  const end = new Date(Date.now() + days * 86400000)
  let total = 0
  for (const s of data.sessions) {
    if (s.status !== 'planned') continue
    const st = new Date(s.start)
    if (st.getTime() > end.getTime()) continue
    total += durationMin(s.start, s.end)
  }
  return total
}

export function studyConsistency(data: FocusFlowData, days = 30): number {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 86400000)
  const list = eachDay(start, end)
  let active = 0
  for (const d of list) {
    const k = toISODate(d)
    const has = data.sessions.some((s) => {
      if (s.status !== 'completed') return false
      return toISODate(startOfDay(new Date(s.start))) === k
    })
    if (has) active += 1
  }
  return list.length === 0 ? 0 : Math.round((active / list.length) * 100)
}

function sessionsAsList(data: FocusFlowData): Array<{
  subjectId?: string
  topicId?: string
  status: string
  start: any
  end: any
  actualMinutes?: number
}> {
  return data.sessions as any
}

function durationMin(start: any, end: any): number {
  const a = new Date(start)
  const b = new Date(end)
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
}
