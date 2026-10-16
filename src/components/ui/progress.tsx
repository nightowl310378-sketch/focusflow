import type { JSX } from 'react'
import { clamp } from '@/utils/format'
import { cn } from '@/lib/cn'

type Tone = 'primary' | 'success' | 'warning' | 'cyan' | 'violet'

const fill: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  cyan: 'bg-cyan',
  violet: 'bg-violet',
}

interface ProgressProps {
  value: number
  tone?: Tone
  className?: string
  label?: string
}

export function Progress({ value, tone = 'primary', className, label }: ProgressProps): JSX.Element {
  const v = clamp(value, 0, 100)
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-soft-3', className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out-soft', fill[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
