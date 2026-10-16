import type { Exam, Preferences, Profile, FocusFlowData, Topic } from '@/domain/types'
import { DATA_VERSION } from '@/domain/types'
import { uid } from '@/utils/format'
import { startOfDay, addDays, toISODate, toISODateTime } from '@/utils/dates'

export const DEFAULT_PROFILE: Profile = {
  name: 'Student',
}

export const DEFAULT_PREFERENCES: Preferences = {
  studyDays: [1, 2, 3, 4, 5, 6], // Mon–Sat
  dailyStudyHours: 4,
  sessionMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  studyWindows: [
    // 17:00 – 21:00 local
    { start: 17 * 60, end: 21 * 60 },
  ],
}

export function createInitialData(opts?: { demo?: boolean; name?: string }): FocusFlowData {
  const now = new Date()
  const tomorrowStr = toISODate(addDays(now, 1))

  const base: FocusFlowData = {
    version: DATA_VERSION,
    onboarded: false,
    demo: opts?.demo ?? false,
    profile: { name: opts?.name ?? DEFAULT_PROFILE.name },
    preferences: { ...DEFAULT_PREFERENCES },
    subjects: [],
    topics: [],
    exams: [],
    tasks: [],
    sessions: [],
    focusRecords: [],
    planMeta: null,
  }

  if (!opts?.demo) return base

  const subjMath = {
    id: uid('subj'),
    name: 'Mathematics',
    color: 'subj-indigo',
    icon: 'calc',
    createdAt: toISODateTime(now),
  }
  const subjPhy = {
    id: uid('subj'),
    name: 'Physics',
    color: 'subj-violet',
    icon: 'flask',
    createdAt: toISODateTime(now),
  }
  const subjEng = {
    id: uid('subj'),
    name: 'English',
    color: 'subj-cyan',
    icon: 'book',
    createdAt: toISODateTime(now),
  }

  const examMath: Exam = {
    id: uid('exam'),
    subjectId: subjMath.id,
    name: 'Math Midterm',
    date: tomorrowStr,
    importance: 5,
    createdAt: toISODateTime(now),
  }
  const examPhy: Exam = {
    id: uid('exam'),
    subjectId: subjPhy.id,
    name: 'Physics Quiz',
    date: toISODate(addDays(now, 3)),
    importance: 4,
    createdAt: toISODateTime(now),
  }
  const examEng: Exam = {
    id: uid('exam'),
    subjectId: subjEng.id,
    name: 'English Vocab',
    date: toISODate(addDays(now, 5)),
    importance: 3,
    createdAt: toISODateTime(now),
  }

  const topicAlgebra: Topic = {
    id: uid('topic'),
    subjectId: subjMath.id,
    name: 'Algebra — Quadratics',
    difficulty: 4,
    confidence: 40,
    status: 'not_started' as const,
    priority: 'high' as const,
    estimatedMinutes: 120,
    examId: examMath.id,
    createdAt: toISODateTime(now),
  }
  const topicTrig: Topic = {
    id: uid('topic'),
    subjectId: subjMath.id,
    name: 'Trigonometry — Identities',
    difficulty: 3,
    confidence: 55,
    status: 'not_started' as const,
    priority: 'medium' as const,
    estimatedMinutes: 90,
    examId: examMath.id,
    createdAt: toISODateTime(now),
  }
  const topicKinematics: Topic = {
    id: uid('topic'),
    subjectId: subjPhy.id,
    name: 'Kinematics — Motion',
    difficulty: 3,
    confidence: 50,
    status: 'in_progress' as const,
    priority: 'medium' as const,
    estimatedMinutes: 75,
    examId: examPhy.id,
    createdAt: toISODateTime(now),
  }
  const topicGrammar: Topic = {
    id: uid('topic'),
    subjectId: subjEng.id,
    name: 'Grammar — Tenses',
    difficulty: 2,
    confidence: 70,
    status: 'in_progress' as const,
    priority: 'medium' as const,
    estimatedMinutes: 60,
    examId: examEng.id,
    createdAt: toISODateTime(now),
  }
  const topicVocab: Topic = {
    id: uid('topic'),
    subjectId: subjEng.id,
    name: 'Vocabulary — Root Words',
    difficulty: 1,
    confidence: 65,
    status: 'not_started' as const,
    priority: 'low' as const,
    estimatedMinutes: 30,
    examId: examEng.id,
    createdAt: toISODateTime(now),
  }

  const tDay = startOfDay(now)
  const t0 = new Date(tDay.getFullYear(), tDay.getMonth(), tDay.getDate(), 17, 0, 0, 0)
  const makeSession = (
    id: string,
    title: string,
    subjectId: string,
    topicId: string,
    startOffsetMin: number,
    lenMin: number,
    status: 'planned' | 'completed' | 'missed' = 'planned',
  ) => {
    const start = new Date(t0.getTime() + startOffsetMin * 60_000)
    const end = new Date(start.getTime() + lenMin * 60_000)
    return {
      id,
      title,
      kind: 'study' as const,
      subjectId,
      topicId,
      start: toISODateTime(start),
      end: toISODateTime(end),
      status,
      origin: 'manual' as const,
      createdAt: toISODateTime(now),
      actualMinutes: status === 'completed' ? lenMin : undefined,
      completedAt: status === 'completed' ? toISODateTime(end) : undefined,
    }
  }

  // A short history so analytics, consistency and the 14-day chart show real,
  // non-zero values straight away in demo mode.
  const pastWindow = (daysAgo: number, hour: number, minutes: number) => {
    const day = startOfDay(addDays(now, -daysAgo))
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0)
    const end = new Date(start.getTime() + minutes * 60_000)
    return { start, end }
  }
  const makePastSession = (
    daysAgo: number,
    hour: number,
    title: string,
    subjectId: string,
    topicId: string,
    lenMin: number,
  ) => {
    const { start, end } = pastWindow(daysAgo, hour, lenMin)
    return {
      id: uid('sess'),
      title,
      kind: 'study' as const,
      subjectId,
      topicId,
      start: toISODateTime(start),
      end: toISODateTime(end),
      status: 'completed' as const,
      origin: 'manual' as const,
      createdAt: toISODateTime(now),
      actualMinutes: lenMin,
      completedAt: toISODateTime(end),
    }
  }
  const makeFocus = (
    daysAgo: number,
    hour: number,
    minutes: number,
    subjectId: string,
    topicId: string,
    counted = true,
  ) => {
    const { start, end } = pastWindow(daysAgo, hour, minutes)
    return {
      id: uid('focus'),
      mode: 'focus' as const,
      startedAt: toISODateTime(start),
      endedAt: toISODateTime(end),
      minutes,
      counted,
      subjectId,
      topicId,
    }
  }

  return {
    ...base,
    demo: true,
    onboarded: true,
    subjects: [subjMath, subjPhy, subjEng],
    exams: [examMath, examPhy, examEng],
    topics: [topicAlgebra, topicTrig, topicKinematics, topicGrammar, topicVocab],
    sessions: [
      // today
      makeSession(uid('sess'), topicAlgebra.name, subjMath.id, topicAlgebra.id, 0, 40, 'completed'),
      makeSession(uid('sess'), topicKinematics.name, subjPhy.id, topicKinematics.id, 60, 40, 'planned'),
      makeSession(uid('sess'), topicGrammar.name, subjEng.id, topicGrammar.id, 120, 25, 'planned'),
      // recent history (completed)
      makePastSession(1, 17, topicAlgebra.name, subjMath.id, topicAlgebra.id, 40),
      makePastSession(2, 18, topicKinematics.name, subjPhy.id, topicKinematics.id, 35),
      makePastSession(3, 17, topicTrig.name, subjMath.id, topicTrig.id, 45),
      makePastSession(4, 19, topicGrammar.name, subjEng.id, topicGrammar.id, 30),
      makePastSession(6, 17, topicVocab.name, subjEng.id, topicVocab.id, 25),
    ],
    tasks: [
      {
        id: uid('task'),
        title: 'Revise quadratic formula',
        subjectId: subjMath.id,
        dueDate: tomorrowStr,
        priority: 'high',
        completed: false,
        createdAt: toISODateTime(now),
        notes: 'Practice 8–10 problems',
      },
      {
        id: uid('task'),
        title: 'Physics numericals — unit 1',
        subjectId: subjPhy.id,
        dueDate: toISODate(addDays(now, 2)),
        priority: 'medium',
        completed: false,
        createdAt: toISODateTime(now),
      },
      {
        id: uid('task'),
        title: 'Learn 5 new vocab words',
        subjectId: subjEng.id,
        dueDate: toISODate(addDays(now, 4)),
        priority: 'low',
        completed: true,
        completedAt: toISODateTime(now),
        createdAt: toISODateTime(now),
      },
    ],
    focusRecords: [
      makeFocus(1, 17, 40, subjMath.id, topicAlgebra.id),
      makeFocus(1, 18, 20, subjPhy.id, topicKinematics.id),
      makeFocus(2, 18, 35, subjPhy.id, topicKinematics.id),
      makeFocus(3, 17, 45, subjMath.id, topicTrig.id),
      makeFocus(4, 19, 30, subjEng.id, topicGrammar.id),
      makeFocus(6, 17, 25, subjEng.id, topicVocab.id),
    ],
    planMeta: null,
  }
}
