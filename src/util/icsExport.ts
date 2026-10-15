import { LessonInstance } from './scheduling'

// Writing lessons out as an iCalendar file.
//
// The point is not the download itself but the UIDs in it: each event is keyed by its lesson id,
// which is the same id the cancellation emails put in their `calendarEvent`. Import this once and
// a later cancellation lands on the event it is about, instead of being an orphan the client
// quietly discards.
//
// Hand-written rather than pulled from a library. The format is a few hundred bytes of text, the
// parts that are easy to get wrong are the parts a library would hide (folding counts octets, not
// characters, which matters the moment a Romanian name appears), and nothing here needs recurrence
// rules or timezone definitions.

const PRODID = '-//Vioara cu Susanna//Scheduling//EN'

/** 75 octets per line, per RFC 5545. A continuation begins with one space, which also counts. */
const LINE_LIMIT = 75

export interface IcsEvent {
  /** The lesson id. Shared with the cancellation emails so the two refer to one event. */
  uid: string
  start: number
  end: number
  summary: string
  location?: string
  description?: string
  /** Rises with each message about this uid, so a later one supersedes an earlier. */
  sequence?: number
  cancelled?: boolean
}

/**
 * How many octets one character occupies in UTF-8.
 *
 * Computed rather than measured with `TextEncoder`, which every browser has and jsdom does not —
 * and a module that cannot be tested without a polyfill is a module that stops being tested.
 */
function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (code < 0x80) return 1
  if (code < 0x800) return 2
  if (code < 0x10000) return 3
  return 4
}

/**
 * Breaks a long line the way RFC 5545 requires.
 *
 * Counted in octets rather than characters: "Lecție cu Ștefan" is shorter than its byte length,
 * and a fold placed by character count would eventually split a multi-byte character in half.
 */
function fold(line: string): string {
  const parts: string[] = []
  let current = ''
  let bytes = 0

  for (const char of line) {
    const size = utf8Length(char)
    // The first line may use all 75; every continuation spends one on its leading space.
    const limit = parts.length === 0 ? LINE_LIMIT : LINE_LIMIT - 1
    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)

  return parts.join('\r\n ')
}

/** Commas, semicolons and backslashes are delimiters in a TEXT value; newlines are written \n. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * A UTC timestamp, "20261019T143000Z".
 *
 * `toISOString` is forbidden elsewhere in this codebase because it shifts a date-only value into
 * the previous day. Here it is exactly right: these are absolute instants, and iCalendar wants
 * them in UTC. Writing them in local time would need a VTIMEZONE block to mean anything.
 */
function stamp(ms: number): string {
  return `${new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')}`
}

/** One calendar holding every event, as the text of a `.ics` file. */
export function buildIcs(events: IcsEvent[], calendarName: string, now = Date.now()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`
  ]

  events.forEach((event) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`
    )
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
    if (event.sequence) lines.push(`SEQUENCE:${event.sequence}`)
    // Cancelled lessons are written out rather than left behind. Exporting again after a
    // cancellation is then a sync: the event already in the reader's calendar is struck out,
    // where omitting it would leave the lesson sitting there looking like it still stands.
    lines.push(`STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`)
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  return `${lines.map(fold).join('\r\n')}\r\n`
}

export interface LessonsToIcsOptions {
  /** What each lesson is called: the student for a teacher, the subject for a student. */
  titleFor: (lesson: LessonInstance) => string
  locationName?: string
}

export function lessonsToIcs(
  lessons: LessonInstance[],
  calendarName: string,
  options: LessonsToIcsOptions
): string {
  return buildIcs(
    lessons.map((lesson) => ({
      uid: lesson.id,
      start: lesson.scheduledStart,
      end: lesson.scheduledEnd,
      summary: options.titleFor(lesson),
      location: options.locationName,
      sequence: lesson.calendarSequence,
      cancelled: lesson.status === 'canceled'
    })),
    calendarName
  )
}

/** Safe for a filename on every platform, and still readable. */
export function icsFileName(calendarName: string): string {
  const slug = calendarName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${slug || 'lessons'}.ics`
}

/** Hands the file to the browser. */
export function downloadIcs(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
