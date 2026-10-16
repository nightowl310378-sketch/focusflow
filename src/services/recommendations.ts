import type { FocusFlowData } from '@/domain/types'
import {
  computeSubjectStats,
  computeTopicStats,
  studyConsistency,
  upcomingWorkloadMinutes,
} from './analytics'
import { diffInDays, parseISODate, today } from '@/utils/dates'
import { formatMinutes } from '@/utils/format'

export type RecommendationTone = 'primary' | 'warning' | 'success' | 'cyan' | 'violet'

export interface Recommendation {
  id: string
  tone: RecommendationTone
  title: string
  body: string
  to?: string
  cta?: string
}

/**
 * Contextual, data-driven advice. Every recommendation is derived from the
 * student's actual sessions, topics and exams — no generic filler.
 */
export function buildRecommendations(data: FocusFlowData): Recommendation[] {
  const out: Recommendation[] = []
  const missed = data.sessions.filter((s) => s.status === 'missed')
  const planned = data.sessions.filter((s) => s.status === 'planned')
  const completed = data.sessions.filter((s) => s.status === 'completed')

  if (data.topics.length === 0) {
    out.push({
      id: 'add-topics',
      tone: 'primary',
      title: 'Add topics to plan',
      body: 'The scheduler needs topics with difficulty and confidence before it can build a timetable.',
      to: '/app/subjects',
      cta: 'Add topics',
    })
    return out
  }

  if (planned.length === 0 && missed.length === 0) {
    out.push({
      id: 'generate',
      tone: 'primary',
      title: 'Build your study timetable',
      body: 'You have topics but no scheduled sessions. Generate a plan based on your exams and free time.',
      to: '/app/plan',
      cta: 'Open planner',
    })
  }

  if (missed.length > 0) {
    out.push({
      id: 'recover',
      tone: 'warning',
      title: `${missed.length} missed session${missed.length === 1 ? '' : 's'} to recover`,
      body: 'Smart Recovery can redistribute this unfinished work without moving completed sessions.',
      to: '/app/plan',
      cta: 'Recover now',
    })
  }

  const capacity7 = Math.round(data.preferences.dailyStudyHours * 60 * data.preferences.studyDays.length)
  const workload7 = upcomingWorkloadMinutes(data, 7)
  if (workload7 > capacity7) {
    out.push({
      id: 'overbooked',
      tone: 'warning',
      title: 'Next 7 days look overbooked',
      body: `${formatMinutes(workload7)} scheduled against roughly ${formatMinutes(capacity7)} of available time. Consider trimming low-priority topics.`,
      to: '/app/plan',
      cta: 'Review plan',
    })
  }

  const consistency = studyConsistency(data, 30)
  if (completed.length >= 3 && consistency < 50) {
    out.push({
      id: 'consistency',
      tone: 'violet',
      title: 'Your study consistency is low',
      body: `You studied on ${consistency}% of the last 30 days. Shorter, regular sessions beat long gaps.`,
      to: '/app/timer',
      cta: 'Start a session',
    })
  }

  const urgent = data.exams
    .filter((e) => diffInDays(today(), parseISODate(e.date)) >= 0)
    .filter((e) => diffInDays(today(), parseISODate(e.date)) <= 7)
    .sort((a, b) => diffInDays(today(), parseISODate(a.date)) - diffInDays(today(), parseISODate(b.date)))[0]

  if (urgent) {
    const days = diffInDays(today(), parseISODate(urgent.date))
    const subject = data.subjects.find((s) => s.id === urgent.subjectId)
    const topics = data.topics.filter((t) => t.examId === urgent.id && t.status !== 'mastered')
    if (topics.length > 0) {
      out.push({
        id: `exam-${urgent.id}`,
        tone: 'cyan',
        title: `${urgent.name} in ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}`,
        body: `${topics.length} topic${topics.length === 1 ? '' : 's'} for ${subject?.name ?? 'this exam'} still need work. Prioritise the lowest-confidence ones.`,
        to: '/app/subjects',
        cta: 'Review topics',
      })
    }
  }

  const subjectStats = computeSubjectStats(data).filter((s) => s.plannedMinutes + s.completedMinutes > 0)
  const weakest = [...subjectStats].sort((a, b) => a.progress - b.progress)[0]
  if (weakest && weakest.progress < 40) {
    out.push({
      id: `weak-${weakest.subjectId}`,
      tone: 'primary',
      title: `${weakest.name} is behind`,
      body: `Only ${weakest.progress}% of scheduled ${weakest.name} work is done. A focused block today will close the gap.`,
      to: '/app/timer',
      cta: 'Focus now',
    })
  }

  const topicStats = computeTopicStats(data)
  const shaky = topicStats
    .filter((t) => t.status !== 'mastered' && t.confidence < 40)
    .sort((a, b) => a.confidence - b.confidence)[0]
  if (shaky) {
    out.push({
      id: `shaky-${shaky.topicId}`,
      tone: 'violet',
      title: 'Low confidence detected',
      body: `“${shaky.name}” has ${shaky.confidence}% confidence. Extra practice here gives the biggest score lift.`,
      to: '/app/subjects',
      cta: 'Open topic',
    })
  }

  return out
}
