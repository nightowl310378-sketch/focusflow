import type { FocusFlowData } from '@/domain/types'
import { DATA_VERSION } from '@/domain/types'
import { createInitialData, DEFAULT_PREFERENCES } from '@/constants/defaults'

const KEY = 'focusflow:data-v1'

function safeParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function migrate(data: Record<string, unknown>, _version: number | undefined): FocusFlowData {
  // For now, just ensure version is current and required arrays exist.
  return {
    version: DATA_VERSION,
    onboarded: Boolean(data.onboarded),
    demo: Boolean(data.demo),
    profile: isObject(data.profile)
      ? {
          name: typeof data.profile.name === 'string' ? data.profile.name : 'Student',
        }
      : { name: 'Student' },
    preferences: isObject(data.preferences)
      ? ({ ...DEFAULT_PREFERENCES, ...(data.preferences as object) } as any)
      : { ...DEFAULT_PREFERENCES },
    subjects: Array.isArray(data.subjects) ? (data.subjects as any) : [],
    topics: Array.isArray(data.topics) ? (data.topics as any) : [],
    exams: Array.isArray(data.exams) ? (data.exams as any) : [],
    tasks: Array.isArray(data.tasks) ? (data.tasks as any) : [],
    sessions: Array.isArray(data.sessions) ? (data.sessions as any) : [],
    focusRecords: Array.isArray(data.focusRecords)
      ? (data.focusRecords as any)
      : Array.isArray(data.focusSessions)
        ? (data.focusSessions as any)
        : [],
    planMeta: (data.planMeta === null || isObject(data.planMeta)) ? (data.planMeta as any) : null,
  } as FocusFlowData
}

export function loadData(): FocusFlowData {
  const parsed = safeParse(localStorage.getItem(KEY))
  if (!isObject(parsed)) {
    const initial = createInitialData()
    saveData(initial)
    return initial
  }
  const v = typeof parsed.version === 'number' ? parsed.version : undefined
  const migrated = migrate(parsed, v)
  // Normalise a few required fields defensively.
  migrated.preferences.studyDays ??= [1, 2, 3, 4, 5, 6]
  migrated.preferences.studyWindows ??= [{ start: 17 * 60, end: 21 * 60 }]
  migrated.preferences.dailyStudyHours ??= 4
  migrated.preferences.sessionMinutes ??= 25
  migrated.preferences.breakMinutes ??= 5
  migrated.preferences.longBreakMinutes ??= 15
  migrated.preferences.longBreakEvery ??= 4
  migrated.profile.name ||= 'Student'
  migrated.subjects ||= []
  migrated.topics ||= []
  migrated.exams ||= []
  migrated.tasks ||= []
  migrated.sessions ||= []
  migrated.focusRecords ||= []
  migrated.planMeta ||= null
  return migrated
}

export function saveData(data: FocusFlowData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('Failed to persist FocusFlow data:', err)
  }
}

export function resetData(): FocusFlowData {
  localStorage.removeItem(KEY)
  const initial = createInitialData()
  saveData(initial)
  return initial
}

export function loadDemo(): FocusFlowData {
  localStorage.removeItem(KEY)
  const demo = createInitialData({ demo: true })
  saveData(demo)
  return demo
}

export function clearDemoFlag(data: FocusFlowData): FocusFlowData {
  const next = { ...data, demo: false }
  saveData(next)
  return next
}
