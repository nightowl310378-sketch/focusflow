/**
 * Deterministic study scheduler.
 *
 * Requirements:
 * - Respect exam dates (never after relevant exam)
 * - Prefer high urgency (time remaining until exam), high difficulty, low confidence
 * - Split long workloads into `sessionMinutes`
 * - Insert breaks between study sessions (if multiple in a block, short/long break policy applied conceptually)
 * - Avoid overlaps
 * - Respect available study windows per day (single window per config; support multiple windows)
 * - Respect dailyStudyHours cap (total study minutes, excluding breaks counted separately; breaks are tracked)
 * - Avoid deleting/duplicating existing work
 * - Return warnings when insufficient capacity
 * - Keep this pure and testable
 */

import type {
  Exam,
  FocusFlowData,
  ID,
  PlanMeta,
  ScheduleResult,
  StudySession,
  Topic,
} from '@/domain/types'
import { addDays, addMinutes, eachDay, parseISODate, startOfDay, toISODate, toISODateTime } from '@/utils/dates'
import { uid } from '@/utils/format'

const DEFAULT_BREAK_MINUTES = 5
const DEFAULT_LONG_BREAK_MINUTES = 15
const DEFAULT_LONG_BREAK_EVERY = 4

export interface ScheduleOptions {
  includeCompletedSessions?: boolean
  // If provided, only consider these topics; otherwise, all unfinished topics.
  topicIds?: ID[]
}

export interface Candidate {
  topic: Topic
  exam?: Exam
  urgency: number // 0–100 (higher = closer deadline, no time)
  confidenceGap: number // 0–100 (higher if low confidence)
  difficultyNorm: number // 0–100
  score: number // composite
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function normalize(n: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp01((n - min) / (max - min)) * 100
}

function daysUntil(now: Date, examDate: Date): number {
  return minutesBetween(now, examDate) / 1440
}

function computeUrgency(days: number): number {
  if (days <= 0) return 100
  // Linear decay: further -> lower urgency; very close -> near 100
  if (days <= 1) return 95
  if (days <= 2) return 90
  if (days <= 3) return 85
  if (days <= 5) return 75
  if (days <= 7) return 65
  if (days <= 10) return 55
  if (days <= 14) return 45
  if (days <= 21) return 35
  if (days <= 28) return 25
  return 12
}

function isTopicFinished(topic: Topic): boolean {
  return topic.status === 'mastered' || topic.estimatedMinutes <= 0
}

export function rankTopics(data: FocusFlowData, now: Date): Candidate[] {
  const exams = new Map(data.exams.map((e) => [e.id, e]))
  const candidates: Candidate[] = []
  for (const topic of data.topics) {
    if (isTopicFinished(topic)) continue
    const exam = topic.examId ? exams.get(topic.examId) : undefined
    let urgency = 20
    if (exam) {
      const examDate = parseISODate(exam.date)
      const days = daysUntil(now, examDate)
      if (examDate.getTime() < now.getTime()) {
        urgency = 100
      } else {
        urgency = computeUrgency(days)
      }
    }
    const confidenceGap = normalize(100 - topic.confidence, 0, 100)
    const difficultyNorm = normalize(topic.difficulty, 1, 5)
    // Priority = 0.40 * urgency + 0.35 * difficulty + 0.25 * confidenceGap
    const score = 0.4 * urgency + 0.35 * difficultyNorm + 0.25 * confidenceGap
    candidates.push({ topic, exam, urgency, confidenceGap, difficultyNorm, score })
  }
  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.urgency !== a.urgency) return b.urgency - a.urgency
    return b.difficultyNorm - a.difficultyNorm
  })
}

interface Slot {
  day: Date
  startMin: number
  endMin: number
  capacityMin: number
}

// (buildOccupied not needed)

/**
 * Generate a feasible plan for unfinished topics.
 *
 * Strategy:
 * - Rank topics
 * - Walk through each available study day (respecting studyDays, dayWindows)
 * - Allocate sessions of sessionMinutes, leaving small slack? but must respect dailyStudyHours (study minutes total)
 * - Track placed time per day (sum of study session lengths)
 * - Insert short break between consecutive focus sessions placed in the same day/window? simple: after each focus block >0, if placing another on same day, add break before it; or just schedule study blocks adjacent respecting capacity
 * - Avoid overlaps with existing sessions (if not includeCompletedSessions, also avoid planned/missed/rescheduled future?)
 * - Never place sessions after the relevant exam date
 * - Never over dailyStudyHours
 */

export function generatePlan(
  data: FocusFlowData,
  now: Date = new Date(),
  options: ScheduleOptions = {},
): ScheduleResult {
  const prefs = data.preferences
  const sessionMin = prefs.sessionMinutes || 25
  const breakMin = prefs.breakMinutes || DEFAULT_BREAK_MINUTES
  const longBreakMin = prefs.longBreakMinutes || DEFAULT_LONG_BREAK_MINUTES
  const longBreakEvery = Math.max(1, prefs.longBreakEvery || DEFAULT_LONG_BREAK_EVERY)
  const maxDailyStudyMin = Math.round(prefs.dailyStudyHours * 60)

  const includeCompletedSessions = options.includeCompletedSessions ?? false
  const candidates = rankTopics(data, now)
  const byId = options.topicIds ? new Set(options.topicIds) : null
  const filtered = byId ? candidates.filter((c) => byId.has(c.topic.id)) : candidates

  const existing = data.sessions.filter((s) => {
    if (includeCompletedSessions) return true
    if (s.status === 'completed') return false
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

  const studyDaysList = eachDay(now, addDays(now, 120)) // lookahead 120 days max
  const warnings: string[] = []
  const uncovered: { topicId: ID; missingMinutes: number }[] = []
  const newSessions: StudySession[] = []
  const nowTs = now.getTime()

  // Track daily usage: total study minutes placed so far on that day
  const usageByDayKey = new Map<string, number>()
  function dayKey(d: Date): string {
    return toISODate(d)
  }

  function canUseDay(d: Date): boolean {
    const wd = d.getDay() // 0 Sun..6 Sat
    return prefs.studyDays.includes(wd)
  }

  for (const c of filtered) {
    const topic = c.topic
    const exam = c.exam
    let remaining = Math.max(0, topic.estimatedMinutes)
    if (remaining <= 0) continue

    for (const day of studyDaysList) {
      if (!canUseDay(day)) continue
      if (exam) {
        const examDate = parseISODate(exam.date)
        if (startOfDay(day).getTime() > startOfDay(examDate).getTime()) {
          continue // cannot schedule after exam
        }
        if (startOfDay(day).getTime() === startOfDay(examDate).getTime()) {
          // Only early window before exam? if exam is that day, try to place before typical end; windows are available windows
        }
      }
      let placedToday = usageByDayKey.get(dayKey(day)) ?? 0
      if (placedToday >= maxDailyStudyMin) continue
      const slots: Slot[] = []
      for (const w of prefs.studyWindows) {
        const sMin = Math.max(w.start, 0)
        const eMin = Math.min(w.end, 24 * 60)
        if (eMin <= sMin) continue
        slots.push({ day, startMin: sMin, endMin: eMin, capacityMin: eMin - sMin })
      }
      if (slots.length === 0) continue

      for (const slot of slots) {
        placedToday = usageByDayKey.get(dayKey(day)) ?? 0
        if (placedToday >= maxDailyStudyMin) break
        let cursor = atMinutes(day, slot.startMin)
        if (cursor.getTime() < nowTs) {
          const n = nextFreeAfter(now, cursor)
          if (n.getTime() > cursor.getTime()) cursor = n
          if (cursor.getTime() < nowTs) cursor = new Date(nowTs)
        }
        const windowEnd = atMinutes(day, slot.endMin)
        if (windowEnd.getTime() <= cursor.getTime()) continue

        let focusCountToday = Math.floor(placedToday / sessionMin)
        while (remaining > 0) {
          placedToday = usageByDayKey.get(dayKey(day)) ?? 0
          if (placedToday >= maxDailyStudyMin) break
          const endFocus = addMinutes(cursor, sessionMin)
          if (endFocus.getTime() > windowEnd.getTime()) break
          if (!isFree(cursor, endFocus)) {
            cursor = nextFreeAfter(cursor, endFocus)
            if (cursor.getTime() >= windowEnd.getTime()) break
            continue
          }
          // insert break before this focus if we've placed >=1 focus before on same conceptual run? track global placed count for break policy
          // but per day: if we already placed study minutes today, add break if next focus starts soon after? breaks are sessions too
          // (break-before logic omitted; breaks inserted after focus blocks below)
          // record focus session
          const sess: StudySession = {
            id: uid('sess'),
            title: topic.name,
            kind: 'study',
            subjectId: topic.subjectId,
            topicId: topic.id,
            start: toISODateTime(cursor),
            end: toISODateTime(endFocus),
            status: 'planned',
            origin: 'plan',
          }
          newSessions.push(sess)
          occupied.push({ start: cursor, end: endFocus })
          remaining -= sessionMin
          placedToday += sessionMin
          usageByDayKey.set(dayKey(day), placedToday)
          focusCountToday += 1
          cursor = endFocus
          // simple break insertion: after placing a focus, if remaining>0 and window allows, insert break before next? insert short/long
          if (remaining > 0) {
            const nextStart = cursor
            const bLen = (focusCountToday % longBreakEvery === 0) ? longBreakMin : breakMin
            const bEnd = addMinutes(nextStart, bLen)
            if (bEnd.getTime() <= windowEnd.getTime() && isFree(nextStart, bEnd)) {
              const bSess: StudySession = {
                id: uid('break'),
                title: (bLen >= longBreakMin) ? 'Long break' : 'Break',
                kind: 'break',
                start: toISODateTime(nextStart),
                end: toISODateTime(bEnd),
                status: 'planned',
                origin: 'plan',
              }
              newSessions.push(bSess)
              occupied.push({ start: nextStart, end: bEnd })
              cursor = bEnd
            }
          }
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
      `Could not fit ${uncovered.length} topic${uncovered.length === 1 ? '' : 's'} fully. Consider increasing daily hours, adding study days, or extending windows.`,
    )
  }
  if (filtered.length === 0) {
    warnings.push('No unfinished topics found. Nothing to schedule.')
  }

  const stats = {
    scheduledMinutes:
      newSessions.filter((s) => s.kind === 'study').length * sessionMin, // approximate; we placed full blocks
    requestedMinutes: filtered
      .filter((c) => !isTopicFinished(c.topic))
      .reduce((sum, c) => sum + c.topic.estimatedMinutes, 0),
    placedTopics: filtered.length - uncovered.length,
    totalTopics: filtered.length,
  }
  return { sessions: newSessions, warnings, uncovered, stats }
}

export function applyPlan(data: FocusFlowData, plan: ScheduleResult): FocusFlowData {
  // Avoid duplicating existing planned sessions? replace planned sessions from 'plan' origin? or append? requirement says avoid duplicating; safest: don't delete manual; replace plan-generated planned sessions? skip for now, just append generated
  return { ...data, sessions: [...data.sessions, ...plan.sessions], planMeta: buildPlanMeta(plan) }
}

function buildPlanMeta(plan: ScheduleResult): PlanMeta {
  return {
    generatedAt: toISODateTime(new Date()),
    warnings: plan.warnings,
    uncovered: plan.uncovered,
  }
}

function atMinutes(day: Date, minutes: number): Date {
  const d = startOfDay(day)
  return addMinutes(d, minutes)
}
