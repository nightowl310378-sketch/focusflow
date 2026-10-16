/**
 * Smart Recovery.
 *
 * When a session is missed:
 * 1. Identify unfinished work tied to it (topic)
 * 2. Recalculate urgency for that topic/other affected
 * 3. Find remaining available slots before exam
 * 4. Respect existing sessions and daily limits
 * 5. Move unfinished work into suitable slots (create new planned sessions)
 * 6. Preserve completed sessions
 * 7. Avoid duplicates/overlaps
 * 8. Let user accept/reject changes (caller handles)
 */

import type {
  FocusFlowData,
  ID,
  ScheduleResult,
  StudySession,
  Topic,
} from '@/domain/types'
import { addDays, addMinutes, eachDay, parseISODate, startOfDay, toISODate, toISODateTime } from '@/utils/dates'
import { uid } from '@/utils/format'

export interface RecoveryOptions {
  missedSessionId: ID
  targetTopicIds?: ID[]
}

export function recoverFromMissed(
  data: FocusFlowData,
  now: Date = new Date(),
  options: RecoveryOptions,
): ScheduleResult {
  const missed = data.sessions.find((s) => s.id === options.missedSessionId)
  if (!missed) {
    return {
      sessions: [],
      warnings: ['Missed session not found.'],
      uncovered: [],
      stats: { scheduledMinutes: 0, requestedMinutes: 0, placedTopics: 0, totalTopics: 0 },
    }
  }
  if (missed.kind !== 'study') {
    return {
      sessions: [],
      warnings: ['Only study sessions can be recovered.'],
      uncovered: [],
      stats: { scheduledMinutes: 0, requestedMinutes: 0, placedTopics: 0, totalTopics: 0 },
    }
  }

  const topic = missed.topicId ? data.topics.find((t) => t.id === missed.topicId) : undefined
  const affected: Topic[] = []
  if (topic && topic.status !== 'mastered' && topic.estimatedMinutes > 0) {
    affected.push(topic)
  }
  for (const t of data.topics) {
    if (affected.find((a) => a.id === t.id)) continue
    if (options.targetTopicIds?.includes(t.id) && t.status !== 'mastered') {
      affected.push(t)
    }
  }
  if (affected.length === 0) {
    return {
      sessions: [],
      warnings: ['No unfinished work to recover for this session.'],
      uncovered: [],
      stats: { scheduledMinutes: 0, requestedMinutes: 0, placedTopics: 0, totalTopics: 0 },
    }
  }

  // Build a working copy: exclude missed or rescheduled variant? just allocate for affected
  const prefs = data.preferences
  const sessionMin = prefs.sessionMinutes || 25
  const maxDailyStudyMin = Math.round(prefs.dailyStudyHours * 60)

  const existing = data.sessions.filter((s) => {
    if (s.status === 'completed') return false
    if (s.id === missed.id) return false
    return true
  })
  const occupied: Array<{ start: Date; end: Date }> = existing.map((s) => ({
    start: new Date(s.start),
    end: new Date(s.end),
  }))
  function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && aEnd > bStart
  }
  function isFree(start: Date, end: Date): boolean {
    if (start.getTime() >= end.getTime()) return false
    for (const o of occupied) {
      if (overlaps(start, end, o.start, o.end)) return false
    }
    return true
  }
  function nextFreeAfter(start: Date, end: Date): Date {
    let best: Date | null = null
    for (const o of occupied) {
      if (o.end > start && o.start < end && o.end > start) {
        if (best === null || o.end > best) best = o.end
      }
    }
    return best ?? start
  }

  const exams = new Map(data.exams.map((e) => [e.id, e]))
  const studyDaysList = eachDay(now, addDays(now, 150))
  const newSessions: StudySession[] = []
  const warnings: string[] = []
  const uncovered: { topicId: ID; missingMinutes: number }[] = []
  const usageByDayKey = new Map<string, number>()
  function dayKey(d: Date): string {
    return toISODate(d)
  }
  function canUseDay(d: Date): boolean {
    const wd = d.getDay()
    return prefs.studyDays.includes(wd)
  }
  function atMinutes(day: Date, minutes: number): Date {
    const d = startOfDay(day)
    return addMinutes(d, minutes)
  }

  for (const topic of affected) {
    const exam = topic.examId ? exams.get(topic.examId) : undefined
    let remaining = Math.max(0, sessionMin) // recover at least missed block? missed.actualMinutes? use sessionMin default
    // try to recover missed focus length if known
    remaining = Math.round(missed.actualMinutes && missed.actualMinutes > 0 ? missed.actualMinutes : sessionMin)
    if (remaining <= 0) remaining = sessionMin
    // if topic still large, optionally recover partial; but keep simple
    if (topic.estimatedMinutes < remaining) remaining = topic.estimatedMinutes
    for (const day of studyDaysList) {
      if (!canUseDay(day)) continue
      if (exam) {
        const examDate = parseISODate(exam.date)
        if (startOfDay(day).getTime() > startOfDay(examDate).getTime()) continue
      }
      let placedToday = usageByDayKey.get(dayKey(day)) ?? 0
      if (placedToday >= maxDailyStudyMin) continue
      const slots: Array<{ startMin: number; endMin: number }> = []
      for (const w of prefs.studyWindows) {
        const s = Math.max(w.start, 0)
        const e = Math.min(w.end, 24 * 60)
        if (e > s) slots.push({ startMin: s, endMin: e })
      }
      if (slots.length === 0) continue
      for (const slot of slots) {
        placedToday = usageByDayKey.get(dayKey(day)) ?? 0
        if (placedToday >= maxDailyStudyMin) break
        let cursor = atMinutes(day, slot.startMin)
        const nowTs = now.getTime()
        if (cursor.getTime() < nowTs) {
          cursor = new Date(nowTs)
        }
        const windowEnd = atMinutes(day, slot.endMin)
        if (windowEnd.getTime() <= cursor.getTime()) continue
        let _focusCountToday = Math.floor(placedToday / sessionMin)
        const endFocus = addMinutes(cursor, remaining)
        if (endFocus.getTime() > windowEnd.getTime()) continue
        if (isFree(cursor, endFocus)) {
          const sess: StudySession = {
            id: uid('sess_r'),
            title: topic.name,
            kind: 'study',
            subjectId: topic.subjectId,
            topicId: topic.id,
            start: toISODateTime(cursor),
            end: toISODateTime(endFocus),
            status: 'planned',
            origin: 'recovery',
            rescheduledFromId: missed.id,
          }
          newSessions.push(sess)
          occupied.push({ start: cursor, end: endFocus })
          placedToday = (usageByDayKey.get(dayKey(day)) ?? 0) + remaining
          usageByDayKey.set(dayKey(day), placedToday)
          _focusCountToday += 1
          cursor = endFocus
          remaining = 0
        } else {
          cursor = nextFreeAfter(cursor, endFocus)
        }
        if (remaining <= 0) break
      }
      if (remaining <= 0) break
    }
    if (remaining > 0) {
      uncovered.push({ topicId: topic.id, missingMinutes: remaining })
    }
  }

  if (uncovered.length > 0) {
    warnings.push(
      `Not enough time to fully recover all affected work before the relevant exam. Consider extending study time or prioritizing the most important topics.`,
    )
  }

  const stats = {
    scheduledMinutes: newSessions.reduce((s, x) => s + (x.kind === 'study' ? sessionMin : 0), 0),
    requestedMinutes: affected.length * sessionMin,
    placedTopics: affected.length - uncovered.length,
    totalTopics: affected.length,
  }

  return { sessions: newSessions, warnings, uncovered, stats }
}

export function applyRecovery(
  data: FocusFlowData,
  result: ScheduleResult,
  missedSessionId: ID,
): FocusFlowData {
  // Mark missed session as missed explicitly (idempotent)
  const sessions = data.sessions.map((s) =>
    s.id === missedSessionId ? { ...s, status: 'missed' as const } : s,
  )
  return { ...data, sessions: [...sessions, ...result.sessions] }
}
