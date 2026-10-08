import dayjs, { Dayjs } from 'dayjs'

// Shared date/time helpers for the scheduling feature.
//
// Every week/day calculation in the scheduling UI *and* the scheduling algorithm must go
// through this module. Two hazards motivate it:
//
//  1. `new Date('2026-03-09')` parses as UTC midnight, and `.toISOString()` formats in UTC.
//     Either one shifts the calendar day by one in any timezone east of UTC — including
//     Europe/Bucharest, the timezone every semester is configured with.
//  2. Anchoring a date-only value at local midnight breaks on DST-transition days in some
//     zones. Anchoring at local noon never does.
//
// So: date-only strings are parsed at local noon, and formatting always goes through
// dayjs `.format()` (local), never `.toISOString()`.

export type DateInput = Dayjs | Date | string

export const DATE_FORMAT = 'YYYY-MM-DD'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Normalize any accepted input to a Dayjs in local time.
// A bare "YYYY-MM-DD" is anchored at local noon so day arithmetic survives DST transitions.
export function parseDate(value: DateInput): Dayjs {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    return dayjs(`${value}T12:00:00`)
  }
  return dayjs(value)
}

// Format any accepted input as a local "YYYY-MM-DD" date string.
export function formatDate(value: DateInput): string {
  return parseDate(value).format(DATE_FORMAT)
}

// Day of week in the AvailabilityBlock convention: 0=Mon, 1=Tue, … 6=Sun.
// dayjs `.day()` returns 0=Sun … 6=Sat, so Sunday is remapped to the end of the week.
export function toDayOfWeek(value: DateInput): number {
  const jsDay = parseDate(value).day()
  return jsDay === 0 ? 6 : jsDay - 1
}

// The Monday of the week containing `value`, preserving the input's time of day.
export function weekStartOf(value: DateInput): Dayjs {
  const date = parseDate(value)
  return date.subtract(toDayOfWeek(date), 'day')
}

// The Monday of the week containing `value`, as a "YYYY-MM-DD" string.
// This is the key format used by `weekOverrides` on both teacher availability and
// student submissions — it must agree with the algorithm's override lookup exactly.
export function weekStartDate(value: DateInput): string {
  return formatDate(weekStartOf(value))
}

// All dates from `start` to `end` inclusive, as "YYYY-MM-DD" strings.
export function eachDateInRange(start: DateInput, end: DateInput): string[] {
  const last = parseDate(end)
  const dates: string[] = []
  let cursor = parseDate(start)
  while (!cursor.isAfter(last, 'day')) {
    dates.push(cursor.format(DATE_FORMAT))
    cursor = cursor.add(1, 'day')
  }
  return dates
}

// The Monday of every week overlapping [start, end], as "YYYY-MM-DD" strings.
// The first entry may fall before `start` when `start` is not itself a Monday.
export function eachWeekStartInRange(start: DateInput, end: DateInput): string[] {
  const last = parseDate(end)
  const weeks: string[] = []
  let cursor = weekStartOf(start)
  while (!cursor.isAfter(last, 'day')) {
    weeks.push(cursor.format(DATE_FORMAT))
    cursor = cursor.add(7, 'day')
  }
  return weeks
}

// Whole calendar days from `from` to `to`. Negative when `to` precedes `from`.
export function daysBetween(from: DateInput, to: DateInput): number {
  return parseDate(to).startOf('day').diff(parseDate(from).startOf('day'), 'day')
}

// ─── Time-of-day helpers ──────────────────────────────────────────────────────
// "HH:mm" strings are handled with plain integer arithmetic. Routing a time of day
// through a Date object would reintroduce exactly the timezone hazards above.

// "09:30" → 570
export function parseMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// 570 → "09:30"
export function formatMinutes(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

// Round up to the next point on the snap grid. snapUpMinutes(67, 15) → 75
export function snapUpMinutes(minutes: number, snap: number): number {
  return Math.ceil(minutes / snap) * snap
}
