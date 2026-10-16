import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'primary' | 'success' | 'warning' | 'cyan' | 'violet'

const tones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  cyan: 'bg-cyan-soft text-cyan-ink',
  violet: 'bg-violet-soft text-violet-ink',
}

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: ReactNode
  tone?: Tone
  className?: string
}

export function StatCard({ label, value, hint, icon, tone = 'primary', className }: StatCardProps): JSX.Element {
  return (
    <div className={cn('card flex items-start gap-4 rounded-2xl p-5', className)}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tones[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink tnum">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  )
}
