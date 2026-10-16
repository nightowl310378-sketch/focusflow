import type { ISODate, ISODateTime } from '@/domain/types'

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

const pad = (n: number) => String(n).padStart(2, '0')

/** Local `yyyy-mm-dd` for a date. Never uses UTC so it matches the user's calendar. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse a `yyyy-mm-dd` string into a local-midnight Date. */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Whole days from `a` to `b`, ignoring time-of-day (b - a). */
export function diffInDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY)
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Build a local Date from a `yyyy-mm-dd` date and minutes-from-midnight. */
export function atMinutes(day: ISODate | Date, minutes: number): Date {
  const base = typeof day === 'string' ? parseISODate(day) : startOfDay(day)
  return addMinutes(base, minutes)
}

export function toHHMM(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function toISODateTime(date: Date): ISODateTime {
  return date.toISOString()
}

export function formatTime(value: Date | ISODateTime): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(value: Date | ISODateTime, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString(
    undefined,
    opts ?? { weekday: 'short', month: 'short', day: 'numeric' },
  )
}

export function formatDateTime(value: Date | ISODateTime): string {
  return `${formatDate(value, { month: 'short', day: 'numeric' })} · ${formatTime(value)}`
}

export function today(): Date {
  return startOfDay(new Date())
}

/** Inclusive list of day-starts between two dates. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = []
  let cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor.getTime() <= end.getTime() && days.length < 400) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function relativeDayLabel(value: Date | ISODateTime): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const delta = diffInDays(today(), startOfDay(d))
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  if (delta > 1 && delta < 7) return `In ${delta} days`
  if (delta < -1 && delta > -7) return `${Math.abs(delta)} days ago`
  return formatDate(d)
}
