import { BookOpen, Brain, Calculator, FlaskRound, Globe, Laptop, Pen, Sparkles } from 'lucide-react'
import type { ComponentType } from 'react'

export const SUBJECT_COLORS = [
  { name: 'Indigo', class: 'subj-indigo' },
  { name: 'Violet', class: 'subj-violet' },
  { name: 'Cyan', class: 'subj-cyan' },
  { name: 'Mint', class: 'subj-mint' },
  { name: 'Orange', class: 'subj-orange' },
  { name: 'Blue', class: 'subj-blue' },
  { name: 'Rose', class: 'subj-rose' },
  { name: 'Slate', class: 'subj-slate' },
] as const

export const SUBJECT_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  book: BookOpen,
  brain: Brain,
  calc: Calculator,
  flask: FlaskRound,
  globe: Globe,
  laptop: Laptop,
  pen: Pen,
  spark: Sparkles,
}

export const DEFAULT_SUBJECT_COLOR = SUBJECT_COLORS[0].class
export const DEFAULT_SUBJECT_ICON = 'book'

const SUBJECT_KEYS = ['indigo', 'violet', 'cyan', 'mint', 'orange', 'blue', 'rose', 'slate'] as const
const LEGACY_ALIASES: Record<string, (typeof SUBJECT_KEYS)[number]> = {
  emerald: 'mint',
  sky: 'blue',
}

/**
 * Resolve a stored subject colour to a theme-aware utility class.
 * Accepts the current `subj-*` keys as well as legacy Tailwind palette
 * strings (e.g. `bg-indigo-100 …`) saved by earlier versions.
 */
export function subjectColorClass(color: string): string {
  if (!color) return DEFAULT_SUBJECT_COLOR
  if (color.startsWith('subj-')) return color
  for (const alias of Object.keys(LEGACY_ALIASES)) {
    if (color.includes(alias)) return `subj-${LEGACY_ALIASES[alias]}`
  }
  for (const key of SUBJECT_KEYS) {
    if (color.includes(key)) return `subj-${key}`
  }
  return DEFAULT_SUBJECT_COLOR
}

export function subjectIcon(name: string): ComponentType<{ className?: string }> {
  return SUBJECT_ICON_MAP[name] ?? BookOpen
}
