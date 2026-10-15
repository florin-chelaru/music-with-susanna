import { buildIcs, icsFileName, lessonsToIcs } from './icsExport'
import { LessonInstance } from './scheduling'

// An .ics file is accepted or silently ignored by a calendar app with no error either way, so the
// things worth pinning are the ones that fail quietly: the UID that ties an event to the
// cancellation emails, the octet-counted folding, and the escaping of a name with a comma in it.

const NOW = new Date('2026-10-15T09:00:00Z').getTime()
const START = new Date('2026-10-19T14:30:00Z').getTime()
const END = new Date('2026-10-19T15:15:00Z').getTime()

function lines(ics: string): string[] {
  return ics.split('\r\n')
}

describe('buildIcs', () => {
  test('writes a calendar an app will accept', () => {
    const ics = buildIcs(
      [{ uid: 'lesson-1', start: START, end: END, summary: 'Ana Ionescu' }],
      'Toamnă 2026',
      NOW
    )
    expect(lines(ics)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vioara cu Susanna//Scheduling//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Toamnă 2026',
      'BEGIN:VEVENT',
      'UID:lesson-1',
      'DTSTAMP:20261015T090000Z',
      'DTSTART:20261019T143000Z',
      'DTEND:20261019T151500Z',
      'SUMMARY:Ana Ionescu',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ])
  })

  // Exporting again after a cancellation has to strike the event out. Leaving it out instead
  // would leave a cancelled lesson sitting in the reader's calendar looking like it still stands.
  test('marks a cancelled lesson cancelled rather than dropping it', () => {
    const ics = buildIcs(
      [{ uid: 'lesson-1', start: START, end: END, summary: 'Ana', cancelled: true }],
      'Toamnă 2026',
      NOW
    )
    expect(ics).toContain('UID:lesson-1')
    expect(ics).toContain('STATUS:CANCELLED')
  })

  test('escapes the delimiters of a TEXT value', () => {
    const ics = buildIcs(
      [
        {
          uid: 'x',
          start: START,
          end: END,
          summary: 'Pop, Barbara; viola',
          description: 'Line one\nline two'
        }
      ],
      'Term',
      NOW
    )
    expect(ics).toContain('SUMMARY:Pop\\, Barbara\\; viola')
    expect(ics).toContain('DESCRIPTION:Line one\\nline two')
  })

  // Folding is counted in octets, so a line of Romanian folds earlier than its character count
  // suggests — and a fold placed by character count would eventually cut a character in half.
  test('folds long lines at 75 octets, never mid-character', () => {
    const ics = buildIcs(
      [{ uid: 'x', start: START, end: END, summary: 'ă'.repeat(80) }],
      'Term',
      NOW
    )
    // Measured independently of the module's own arithmetic, so the test is a check and not
    // a restatement.
    lines(ics).forEach((line) => {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
    })
    // Unfolding puts it back exactly, which is what proves nothing was lost at a boundary.
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain(`SUMMARY:${'ă'.repeat(80)}`)
  })
})

describe('lessonsToIcs', () => {
  const lesson: LessonInstance = {
    id: 'lesson-7',
    studentId: 'ana',
    locationId: 'loc-1',
    scheduledStart: START,
    scheduledEnd: END,
    timezone: 'Europe/Bucharest',
    status: 'scheduled',
    isAdHoc: false,
    isMakeup: false,
    calendarSequence: 0,
    createdAt: NOW
  }

  // The whole reason this file exists: the cancellation emails put the lesson id in their
  // calendarEvent uid, so an imported event and a later cancellation have to be the same event.
  test('keys each event by its lesson id', () => {
    const ics = lessonsToIcs([lesson], 'Toamnă 2026', { titleFor: () => 'Vioară' })
    expect(ics).toContain('UID:lesson-7')
    expect(ics).toContain('SUMMARY:Vioară')
  })

  test('carries the location when there is one', () => {
    const ics = lessonsToIcs([lesson], 'Term', {
      titleFor: () => 'Vioară',
      locationName: 'Str. Mihai Eminescu 1'
    })
    expect(ics).toContain('LOCATION:Str. Mihai Eminescu 1')
  })
})

describe('icsFileName', () => {
  test('strips diacritics and punctuation', () => {
    expect(icsFileName('Toamnă 2026')).toBe('toamna-2026.ics')
    expect(icsFileName('Lecțiile mele')).toBe('lectiile-mele.ics')
  })

  test('falls back rather than producing a nameless file', () => {
    expect(icsFileName('！！！')).toBe('lessons.ics')
  })
})
