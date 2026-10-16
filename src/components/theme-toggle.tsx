import { Eye, Moon, Sun } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import { THEME_LABELS, THEME_MODES, useTheme, type ThemeMode } from '@/theme/theme'

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  comfort: Eye,
}

const HINTS: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  comfort: 'Eye comfort mode',
}

/**
 * Compact, keyboard-accessible appearance switcher.
 * Each mode is a real button with a descriptive accessible label.
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Appearance"
      className={cn('inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5', className)}
    >
      {THEME_MODES.map((mode) => {
        const Icon = ICONS[mode]
        const active = theme === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-label={HINTS[mode]}
            aria-pressed={active}
            title={THEME_LABELS[mode]}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active ? 'bg-primary text-on-primary' : 'text-ink-muted hover:bg-soft-2 hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
