import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, JSX } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-pop hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-soft',
  ghost: 'text-ink hover:bg-soft-2',
  danger: 'bg-danger text-on-primary hover:brightness-95',
  soft: 'bg-primary-soft text-primary-strong hover:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  children,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      aria-busy={loading}
      {...props}
    >
      {children}
    </button>
  )
}

export type { ButtonProps, Variant as ButtonVariant, Size as ButtonSize }
