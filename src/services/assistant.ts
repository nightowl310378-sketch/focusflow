/**
 * Rule-based Smart Study Assistant.
 *
 * IMPORTANT: These are deterministic, rules-based recommendations derived from
 * the student's own data. No language model is used, so nothing here is labelled
 * as "AI-generated". If an LLM endpoint is added later it should live on a
 * server behind an environment variable, with these rules as the fallback.
 */

import type { FocusFlowData, ID } from '@/domain/types'
import { rankTopics } from './scheduler'
import { computeSubjectStats, computeTopicStats } from './analytics'
import { diffInDays, formatDate, parseISODate, startOfDay, today } from '@/utils/dates'
import { formatMinutes } from '@/utils/format'

export type AssistantTone = 'primary' | 'warning' | 'success' | 'cyan' | 'violet'

export interface AssistantOption {
  id: string
  label: string
}

export interface AssistantAnswer {
  id: string
  question: string
  tone: AssistantTone
  summary: string
  bullets: string[]
  to?: string
  cta?: string
}

export const ASSISTANT_QUESTIONS: AssistantOption[] = [
  { id: 'next-topic', label: 'Which topic should I study next?' },
  { id: 'closest-exam', label: 'Which exam is closest?' },
  { id: 'low-confidence', label: 'Which topics have low confidence?' },
  { id: 'today-plan', label: 'Suggest a plan for today' },
  { id: 'why-prioritised', label: 'Why was a session prioritised?' },
  { id: 'weak-subject', label: 'Which subject is weakest?' },
]

const PRIORITY_WEIGHTS =
  'Priority = 0.40 × urgency + 0.35 × difficulty + 0.25 × confidence gap (all normalised 0–100).'

export function askAssistant(id: string, data: FocusFlowData, now = new Date()): AssistantAnswer {
  switch (id) {
    case 'next-topic':
      return nextTopic(data, now)
    case 'closest-exam':
      return closestExam(data, now)
    case 'low-confidence':
      return lowConfidence(data)
    case 'today-plan':
      return todayPlan(data, now)
    case 'why-prioritised':
      return whyPrioritised(data, now)
    case 'weak-subject':
      return weakSubject(data)
    default:
      return {
        id: 'unknown',
        question: 'How can I help?',
        tone: 'primary',
        summary: 'Pick one of the questions to get a data-driven answer.',
        bullets: [],
      }
  }
}

function nextTopic(data: FocusFlowData, now: Date): AssistantAnswer {
  const ranked = rankTopics(data, now)
  if (ranked.length === 0) {
    return {
      id: 'next-topic',
      question: 'Which topic should I study next?',
      tone: 'success',
      summary: 'Nothing is outstanding. Every topic is either mastered or has no estimate.',
      bullets: ['Add a topic or raise an estimate to get a recommendation.'],
      to: '/app/subjects',
      cta: 'Manage topics',
    }
  }
  const top = ranked[0]
  const examWeeks = top.exam
    ? Math.max(0, diffInDays(now, parseISODate(top.exam.date)))
    : null
  return {
    id: 'next-topic',
    question: 'Which topic should I study next?',
    tone: 'primary',
    summary: `Start with “${top.topic.name}”. It has the highest weighted priority right now.`,
    bullets: [
      top.exam ? `Linked exam: ${top.exam.name} — ${examWeeks} day(s) away.` : 'No exam linked to this topic.',
      `Difficulty ${top.topic.difficulty}/5 · confidence ${top.topic.confidence}%.`,
      `Priority score ${Math.round(top.score)}/100 (urgency ${Math.round(top.urgency)}, confidence gap ${Math.round(top.confidenceGap)}).`,
      `Estimated workload: ${formatMinutes(top.topic.estimatedMinutes)}.`,
      PRIORITY_WEIGHTS,
    ],
    to: '/app/plan',
    cta: 'Open study plan',
  }
}

function closestExam(data: FocusFlowData, now: Date): AssistantAnswer {
  const upcoming = data.exams
    .filter((e) => diffInDays(startOfDay(now), parseISODate(e.date)) >= 0)
    .sort((a, b) => parseISODate(a.date).getTime() - parseISODate(b.date).getTime())
  if (upcoming.length === 0) {
    return {
      id: 'closest-exam',
      question: 'Which exam is closest?',
      tone: 'primary',
      summary: 'No upcoming exams are recorded.',
      bullets: ['Add exam dates so the planner can weigh urgency.'],
      to: '/app/settings',
      cta: 'Add an exam',
    }
  }
  const e = upcoming[0]
  const days = diffInDays(today(), parseISODate(e.date))
  const subject = data.subjects.find((s) => s.id === e.subjectId)
  const topics = data.topics.filter((t) => t.examId === e.id && t.status !== 'mastered')
  return {
    id: 'closest-exam',
    question: 'Which exam is closest?',
    tone: days <= 2 ? 'warning' : 'cyan',
    summary: `${e.name} on ${formatDate(`${e.date}T00:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })} — ${days === 0 ? 'today' : `${days} day(s)`} away.`,
    bullets: [
      subject ? `Subject: ${subject.name}.` : 'General exam.',
      `${topics.length} unfinished topic(s) linked to this exam.`,
      topics.length
        ? `Focus next on: ${topics.slice(0, 3).map((t) => `“${t.name}”`).join(', ')}.`
        : 'All linked topics are mastered — do a light revision pass.',
    ],
    to: '/app/plan',
    cta: 'Rebuild plan for this exam',
  }
}

function lowConfidence(data: FocusFlowData): AssistantAnswer {
  const shaky = computeTopicStats(data)
    .filter((t) => t.status !== 'mastered')
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 5)
  if (shaky.length === 0) {
    return {
      id: 'low-confidence',
      question: 'Which topics have low confidence?',
      tone: 'success',
      summary: 'No low-confidence topics flagged.',
      bullets: ['Either everything is mastered or confidence values are high.'],
    }
  }
  return {
    id: 'low-confidence',
    question: 'Which topics have low confidence?',
    tone: 'violet',
    summary: `${shaky.length} topic(s) could use extra practice.`,
    bullets: shaky.map((t) => `“${t.name}” — ${t.confidence}% confidence.`),
    to: '/app/subjects',
    cta: 'Update confidence',
  }
}

function todayPlan(data: FocusFlowData, now: Date): AssistantAnswer {
  const dayKey = startOfDay(now).getTime()
  const todaySessions = data.sessions
    .filter((s) => startOfDay(new Date(s.start)).getTime() === dayKey)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  const study = todaySessions.filter((s) => s.kind === 'study')
  const remaining = study.filter((s) => s.status === 'planned')
  const totalMinutes = remaining.reduce(
    (sum, s) => sum + Math.max(0, (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000),
    0,
  )
  const capacity = Math.round(data.preferences.dailyStudyHours * 60)
  if (study.length === 0) {
    return {
      id: 'today-plan',
      question: 'Suggest a plan for today',
      tone: 'primary',
      summary: 'Nothing is scheduled today.',
      bullets: [
        `You can comfortably fit up to ${formatMinutes(capacity)}.`,
        'Generate a plan, or start a focus block against your highest-priority topic.',
      ],
      to: '/app/plan',
      cta: 'Generate today’s plan',
    }
  }
  return {
    id: 'today-plan',
    question: 'Suggest a plan for today',
    tone: 'primary',
    summary: `${remaining.length} session(s) left today — about ${formatMinutes(totalMinutes)} of work.`,
    bullets: [
      ...remaining.slice(0, 5).map((s) => `${new Date(s.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${s.title}`),
      totalMinutes > capacity ? 'This exceeds your daily cap — consider trimming optional work.' : 'This fits inside your daily study cap.',
    ],
    to: '/app/calendar',
    cta: 'Open calendar',
  }
}

function whyPrioritised(data: FocusFlowData, now: Date): AssistantAnswer {
  const ranked = rankTopics(data, now).slice(0, 3)
  if (ranked.length === 0) {
    return {
      id: 'why-prioritised',
      question: 'Why was a session prioritised?',
      tone: 'primary',
      summary: 'No unfinished topics to rank yet.',
      bullets: [PRIORITY_WEIGHTS],
    }
  }
  return {
    id: 'why-prioritised',
    question: 'Why was a session prioritised?',
    tone: 'cyan',
    summary: 'Here is the transparent ranking the scheduler uses.',
    bullets: [
      ...ranked.map(
        (r) =>
          `“${r.topic.name}” → score ${Math.round(r.score)} (urgency ${Math.round(r.urgency)}, difficulty ${Math.round(r.difficultyNorm)}, confidence gap ${Math.round(r.confidenceGap)}).`,
      ),
      PRIORITY_WEIGHTS,
      'Lower confidence, higher difficulty and nearer exams all increase priority.',
    ],
  }
}

function weakSubject(data: FocusFlowData): AssistantAnswer {
  const stats = computeSubjectStats(data).filter((s) => s.plannedMinutes + s.completedMinutes > 0)
  if (stats.length === 0) {
    return {
      id: 'weak-subject',
      question: 'Which subject is weakest?',
      tone: 'primary',
      summary: 'No subject has scheduled work yet.',
      bullets: ['Generate a plan to compare subjects.'],
      to: '/app/plan',
      cta: 'Generate plan',
    }
  }
  const weakest = [...stats].sort((a, b) => a.progress - b.progress)[0]
  return {
    id: 'weak-subject',
    question: 'Which subject is weakest?',
    tone: weakest.progress < 40 ? 'warning' : 'success',
    summary: `${weakest.name} is at ${weakest.progress}% completion.`,
    bullets: [
      `Completed ${formatMinutes(weakest.completedMinutes)} of ${formatMinutes(weakest.plannedMinutes + weakest.completedMinutes)} scheduled.`,
      weakest.progress < 40 ? 'Schedule a focused block here tomorrow.' : 'This subject is on track.',
    ],
    to: '/app/analytics',
    cta: 'See analytics',
  }
}

/** Topics ordered for a single-subject revision plan (deterministic). */
export function revisionPlanForSubject(data: FocusFlowData, subjectId: ID, now = new Date()) {
  return rankTopics(data, now)
    .filter((r) => r.topic.subjectId === subjectId)
    .map((r, i) => ({
      order: i + 1,
      name: r.topic.name,
      score: Math.round(r.score),
      minutes: r.topic.estimatedMinutes,
    }))
}
