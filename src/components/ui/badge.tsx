import type { HTMLAttributes, JSX } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'cyan' | 'violet'

const tones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-strong ring-primary/25',
  neutral: 'bg-soft-2 text-ink-2 ring-line',
  success: 'bg-success-soft text-success-ink ring-success/25',
  warning: 'bg-warning-soft text-warning-ink ring-warning/25',
  danger: 'bg-danger-soft text-danger-ink ring-danger/25',
  cyan: 'bg-cyan-soft text-cyan-ink ring-cyan/25',
  violet: 'bg-violet-soft text-violet-ink ring-violet/25',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export type { Tone as BadgeTone }
