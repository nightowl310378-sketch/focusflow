import { ArrowRight, BrainCircuit, Send, Sparkles } from 'lucide-react'
import { useMemo, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/input'
import { useStore } from '@/storage/use-store'
import { buildRecommendations, type RecommendationTone } from '@/services/recommendations'
import { ASSISTANT_QUESTIONS, askAssistant, revisionPlanForSubject } from '@/services/assistant'
import { cn } from '@/lib/cn'
import { formatMinutes } from '@/utils/format'

const toneClass: Record<RecommendationTone, string> = {
  primary: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning-ink',
  success: 'bg-success-soft text-success-ink',
  cyan: 'bg-cyan-soft text-cyan-ink',
  violet: 'bg-violet-soft text-violet-ink',
}

export default function Assistant(): JSX.Element {
  const { data } = useStore()
  const [askedId, setAskedId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')

  const answer = useMemo(() => (askedId ? askAssistant(askedId, data) : null), [askedId, data])
  const recommendations = useMemo(() => buildRecommendations(data), [data])
  const revisionPlan = useMemo(
    () => (subjectId ? revisionPlanForSubject(data, subjectId) : []),
    [data, subjectId],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assistant"
        title="Smart study assistant"
        description="Rule-based guidance computed from your own topics, exams and sessions. No external AI service required."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Ask FocusFlow</CardTitle>
              <p className="mt-0.5 text-sm text-ink-muted">
                {ASSISTANT_QUESTIONS.length} data-driven questions
              </p>
            </div>
            <BrainCircuit className="h-5 w-5 text-primary" />
          </CardHeader>

          <div className="flex flex-wrap gap-2">
            {ASSISTANT_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setAskedId(q.id)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-xs font-medium transition-colors',
                  askedId === q.id
                    ? 'border-primary bg-primary-soft text-primary-strong'
                    : 'border-line text-ink-2 hover:bg-soft',
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {!answer ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Pick a question to begin"
                description="Every answer is derived from your current data — change a topic or exam and answers update instantly."
              />
            ) : (
              <div className="rounded-2xl border border-line p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClass[answer.tone])}>
                    <Send className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{answer.question}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{answer.summary}</p>
                  </div>
                </div>
                {answer.bullets.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {answer.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {answer.to ? (
                  <Link
                    to={answer.to}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {answer.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revision plan by subject</CardTitle>
            </CardHeader>
            <p className="mb-3 text-sm text-ink-muted">
              Order topics within a subject by the same priority score the scheduler uses.
            </p>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Choose a subject…</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {subjectId ? (
              revisionPlan.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-soft p-3 text-sm text-ink-muted">
                  No unfinished topics in this subject.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {revisionPlan.map((r) => (
                    <li key={r.name} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-strong">
                        {r.order}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                      <Badge tone="neutral">{formatMinutes(r.minutes)}</Badge>
                    </li>
                  ))}
                </ol>
              )
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contextual nudges</CardTitle>
              <Badge tone="primary">{recommendations.length}</Badge>
            </CardHeader>
            {recommendations.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="All clear"
                description="No issues detected in your current plan."
              />
            ) : (
              <ul className="space-y-3">
                {recommendations.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', toneClass[r.tone])}>
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm font-semibold text-ink">{r.title}</p>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{r.body}</p>
                    {r.to ? (
                      <Link
                        to={r.to}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {r.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
