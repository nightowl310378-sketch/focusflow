/**
 * High-level planner operations built on top of the pure scheduler/recovery
 * services. These keep the UI layer free of scheduling details and guarantee
 * that regenerating a plan never duplicates or destroys completed work.
 */

import type { FocusFlowData, ID, ScheduleResult, SessionStatus } from '@/domain/types'
import { toISODateTime } from '@/utils/dates'
import { applyPlan, generatePlan } from './scheduler'
import { applyRecovery, recoverFromMissed } from './recovery'

const isFutureOrPlannedPlan = (status: SessionStatus) => status === 'planned'

/** Drop only auto-generated, still-planned sessions so a regen is idempotent. */
function withoutGeneratedPlan(data: FocusFlowData): FocusFlowData {
  return {
    ...data,
    sessions: data.sessions.filter(
      (s) => !(s.origin === 'plan' && isFutureOrPlannedPlan(s.status)),
    ),
  }
}

/** Drop prior recovery attempts for a specific missed session. */
function withoutRecoveryFor(data: FocusFlowData, missedId: ID): FocusFlowData {
  return {
    ...data,
    sessions: data.sessions.filter(
      (s) => !(s.origin === 'recovery' && s.rescheduledFromId === missedId),
    ),
  }
}

export interface TimetableOutcome {
  data: FocusFlowData
  result: ScheduleResult
}

/** Build (or rebuild) the deterministic timetable for all unfinished topics. */
export function generateTimetable(data: FocusFlowData, now = new Date()): TimetableOutcome {
  const pruned = withoutGeneratedPlan(data)
  const result = generatePlan(pruned, now)
  return { data: applyPlan(pruned, result), result }
}

/** Smart Recovery: redistribute one missed session's work into free slots. */
export function recoverSession(
  data: FocusFlowData,
  missedSessionId: ID,
  now = new Date(),
): TimetableOutcome {
  const pruned = withoutGeneratedPlan(withoutRecoveryFor(data, missedSessionId))
  const result = recoverFromMissed(pruned, now, { missedSessionId })
  return { data: applyRecovery(pruned, result, missedSessionId), result }
}

export function setSessionStatus(
  data: FocusFlowData,
  sessionId: ID,
  status: SessionStatus,
): FocusFlowData {
  return {
    ...data,
    sessions: data.sessions.map((s) => {
      if (s.id !== sessionId) return s
      if (status === 'completed') {
        const minutes = Math.max(
          1,
          Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000),
        )
        return { ...s, status, actualMinutes: s.actualMinutes ?? minutes, completedAt: toISODateTime(new Date()) }
      }
      return { ...s, status, completedAt: undefined, actualMinutes: undefined }
    }),
  }
}

/** Any recovery sessions already produced for a missed session? */
export function hasRecovery(data: FocusFlowData, missedSessionId: ID): boolean {
  return data.sessions.some((s) => s.origin === 'recovery' && s.rescheduledFromId === missedSessionId)
}
