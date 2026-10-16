/**
 * Domain models for FocusFlow.
 *
 * These types are the single source of truth for the shape of application data.
 * They are intentionally framework-free so that scheduling, recovery and
 * analytics logic can be unit-tested without a DOM.
 */

export type ID = string

/** `yyyy-mm-dd` in local time. */
export type ISODate = string
/** ISO-8601 timestamp, e.g. `2026-10-16T16:30:00.000Z`. */
export type ISODateTime = string

export type Difficulty = 1 | 2 | 3 | 4 | 5
export type ExamImportance = 1 | 2 | 3 | 4 | 5

export type TopicStatus = 'not_started' | 'in_progress' | 'mastered'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

export type SessionStatus = 'planned' | 'completed' | 'missed' | 'rescheduled'
export type SessionKind = 'study' | 'break'
export type SessionOrigin = 'plan' | 'recovery' | 'manual'

export type TimerMode = 'focus' | 'short_break' | 'long_break'

/** A window of the day, measured in minutes from local midnight. */
export interface TimeWindow {
  start: number
  end: number
}

export interface Subject {
  id: ID
  name: string
  /** A palette token key, resolved by `subjectColorClass`. */
  color: string
  /** A Lucide icon name key, resolved by `subjectIcon`. */
  icon: string
  createdAt: ISODateTime
}

export interface Topic {
  id: ID
  subjectId: ID
  name: string
  difficulty: Difficulty
  /** Self-reported mastery, 0–100. Higher means more confident. */
  confidence: number
  status: TopicStatus
  priority: PriorityLevel
  /** Total estimated workload for this topic, in minutes. */
  estimatedMinutes: number
  /** Optional examination this topic is being prepared for. */
  examId?: ID
  notes?: string
  createdAt: ISODateTime
}

export interface Exam {
  id: ID
  /** Optional: an exam can be global or tied to a subject. */
  subjectId?: ID
  name: string
  date: ISODate
  importance: ExamImportance
  createdAt: ISODateTime
}

export interface Task {
  id: ID
  title: string
  subjectId?: ID
  dueDate?: ISODate
  priority: PriorityLevel
  completed: boolean
  completedAt?: ISODateTime
  notes?: string
  createdAt: ISODateTime
}

export interface StudySession {
  id: ID
  title: string
  kind: SessionKind
  subjectId?: ID
  topicId?: ID
  /** ISO timestamp of the session start. */
  start: ISODateTime
  /** ISO timestamp of the session end. */
  end: ISODateTime
  status: SessionStatus
  origin: SessionOrigin
  completedAt?: ISODateTime
  /** Minutes actually studied, recorded on completion. */
  actualMinutes?: number
  note?: string
  /** Set when a recovery plan moved this session's work elsewhere. */
  rescheduledFromId?: ID
}

export interface FocusRecord {
  id: ID
  mode: TimerMode
  startedAt: ISODateTime
  endedAt: ISODateTime
  /** Focus minutes only; breaks are recorded with `counted: false`. */
  minutes: number
  counted: boolean
  topicId?: ID
  subjectId?: ID
}

export interface Preferences {
  /** Days of the week the student can study. 0 = Sunday … 6 = Saturday. */
  studyDays: number[]
  /** Maximum hours of study per day. */
  dailyStudyHours: number
  /** Preferred single focus-session length, in minutes. */
  sessionMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  /** Insert a long break after this many consecutive focus sessions. */
  longBreakEvery: number
  /** Windows of the day the student is available, in minutes from midnight. */
  studyWindows: TimeWindow[]
}

export interface PlanMeta {
  generatedAt: ISODateTime
  warnings: string[]
  /** Topic ids that could not fully fit into the available time. */
  uncovered: { topicId: ID; missingMinutes: number }[]
}

export interface Profile {
  name: string
}

export interface FocusFlowData {
  /** Storage schema version, used for migrations. */
  version: number
  onboarded: boolean
  demo: boolean
  profile: Profile
  preferences: Preferences
  subjects: Subject[]
  topics: Topic[]
  exams: Exam[]
  tasks: Task[]
  sessions: StudySession[]
  focusRecords: FocusRecord[]
  planMeta: PlanMeta | null
}

/** Result of a scheduling pass, produced by the scheduler and recovery service. */
export interface ScheduleResult {
  /** Newly created study sessions (breaks are included as separate entries). */
  sessions: StudySession[]
  warnings: string[]
  uncovered: { topicId: ID; missingMinutes: number }[]
  stats: {
    scheduledMinutes: number
    requestedMinutes: number
    placedTopics: number
    totalTopics: number
  }
}

export const DATA_VERSION = 3
