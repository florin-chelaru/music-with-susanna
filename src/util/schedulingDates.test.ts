import dayjs from 'dayjs'
import {
  daysBetween,
  eachDateInRange,
  eachWeekStartInRange,
  formatCountdown,
  formatDate,
  formatMinutes,
  parseDate,
  parseMinutes,
  snapUpMinutes,
  toDayOfWeek,
  weekStartDate
} from './schedulingDates'

// These helpers exist because date handling here is timezone-sensitive. The suite is pinned
// to Europe/Bucharest in jest.config.js — east of UTC, where the original bug manifested.
// If that pin is ever dropped, the regression tests below silently stop testing anything,
// so assert it up front.
test('test suite runs in the pinned Europe/Bucharest timezone', () => {
  expect(process.env.TZ).toBe('Europe/Bucharest')
  expect(dayjs('2026-07-01T12:00:00').utcOffset()).toBe(180)
})

// ─── weekStartDate ────────────────────────────────────────────────────────────

describe('weekStartDate', () => {
  // The regression: the previous implementation used `.toISOString().slice(0, 10)` on a
  // local-midnight Date, which rolls back a day east of UTC — every one of these returned
  // 2026-03-08 (the Sunday before) instead of the Monday.
  test.each([
    ['2026-03-09', 'Monday'],
    ['2026-03-10', 'Tuesday'],
    ['2026-03-11', 'Wednesday'],
    ['2026-03-12', 'Thursday'],
    ['2026-03-13', 'Friday'],
    ['2026-03-14', 'Saturday'],
    ['2026-03-15', 'Sunday']
  ])('%s (%s) resolves to the Monday of its week', (date) => {
    expect(weekStartDate(date)).toBe('2026-03-09')
  })

  test('a Monday is its own week start', () => {
    expect(weekStartDate('2026-03-09')).toBe('2026-03-09')
  })

  // This is the production path and the one the original bug actually hit: the MUI DatePicker
  // hands back a Dayjs at *local midnight*, and `.toISOString()` on local midnight in UTC+2
  // lands on 22:00 the previous day. Note a date-only string would not have caught this —
  // parseDate anchors those at noon, which happens to mask the error.
  test.each([
    ['2026-03-09', 'Monday'],
    ['2026-03-10', 'Tuesday'],
    ['2026-03-11', 'Wednesday'],
    ['2026-03-12', 'Thursday'],
    ['2026-03-13', 'Friday'],
    ['2026-03-14', 'Saturday'],
    ['2026-03-15', 'Sunday']
  ])('a local-midnight Dayjs for %s (%s) resolves to the Monday of its week', (date) => {
    const fromDatePicker = dayjs(date).startOf('day')
    expect(fromDatePicker.hour()).toBe(0)
    expect(weekStartDate(fromDatePicker)).toBe('2026-03-09')
  })

  test('accepts a local-midnight Date', () => {
    expect(weekStartDate(new Date(2026, 2, 11))).toBe('2026-03-09')
    expect(weekStartDate(new Date(2026, 2, 15))).toBe('2026-03-09')
  })

  // Mon 23 Mar → Sun 29 Mar 2026 spans Romania's spring-forward transition (UTC+2 → UTC+3).
  test('is correct across the spring DST transition', () => {
    expect(weekStartDate('2026-03-29')).toBe('2026-03-23')
    expect(weekStartDate('2026-03-30')).toBe('2026-03-30')
  })

  // Mon 19 Oct → Sun 25 Oct 2026 spans the autumn transition (UTC+3 → UTC+2).
  test('is correct across the autumn DST transition', () => {
    expect(weekStartDate('2026-10-25')).toBe('2026-10-19')
  })
})

// ─── toDayOfWeek ──────────────────────────────────────────────────────────────

describe('toDayOfWeek', () => {
  // AvailabilityBlock uses 0=Mon … 6=Sun, not the JS 0=Sun … 6=Sat.
  test.each([
    ['2026-03-09', 0],
    ['2026-03-10', 1],
    ['2026-03-11', 2],
    ['2026-03-12', 3],
    ['2026-03-13', 4],
    ['2026-03-14', 5],
    ['2026-03-15', 6]
  ])('%s → %i', (date, expected) => {
    expect(toDayOfWeek(date)).toBe(expected)
    expect(toDayOfWeek(dayjs(date).startOf('day'))).toBe(expected)
  })
})

// ─── parseDate / formatDate ───────────────────────────────────────────────────

describe('parseDate and formatDate', () => {
  // `new Date('2026-03-09')` is UTC midnight, which renders as 2026-03-09T02:00 local in
  // Bucharest and formats back to the previous day via toISOString. Round-tripping must not shift.
  test('a date-only string round-trips unchanged', () => {
    expect(formatDate('2026-03-09')).toBe('2026-03-09')
    expect(formatDate('2026-01-01')).toBe('2026-01-01')
    expect(formatDate('2026-12-31')).toBe('2026-12-31')
  })

  test('date-only strings are anchored at local noon, so day arithmetic is DST-safe', () => {
    expect(parseDate('2026-03-29').hour()).toBe(12)
    expect(formatDate(parseDate('2026-03-28').add(1, 'day'))).toBe('2026-03-29')
  })
})

// ─── Range helpers ────────────────────────────────────────────────────────────

describe('eachDateInRange', () => {
  test('is inclusive of both ends', () => {
    expect(eachDateInRange('2026-03-09', '2026-03-12')).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12'
    ])
  })

  test('a single-day range yields that day', () => {
    expect(eachDateInRange('2026-03-09', '2026-03-09')).toEqual(['2026-03-09'])
  })

  test('does not skip or duplicate a day across the DST transition', () => {
    const dates = eachDateInRange('2026-03-27', '2026-03-31')
    expect(dates).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'])
  })

  test('covers a full semester without drift', () => {
    // Spring 2026 in the mock data: 2 Feb – 20 Jun.
    const dates = eachDateInRange('2026-02-02', '2026-06-20')
    expect(dates).toHaveLength(139)
    expect(dates[0]).toBe('2026-02-02')
    expect(dates[dates.length - 1]).toBe('2026-06-20')
  })
})

describe('eachWeekStartInRange', () => {
  test('returns the Monday of every overlapping week', () => {
    expect(eachWeekStartInRange('2026-03-09', '2026-03-29')).toEqual([
      '2026-03-09',
      '2026-03-16',
      '2026-03-23'
    ])
  })

  test('starts from the Monday before a mid-week start date', () => {
    expect(eachWeekStartInRange('2026-03-11', '2026-03-20')).toEqual(['2026-03-09', '2026-03-16'])
  })

  test('every entry is a Monday', () => {
    const weeks = eachWeekStartInRange('2026-02-02', '2026-06-20')
    weeks.forEach((week) => {
      expect(toDayOfWeek(week)).toBe(0)
    })
  })
})

describe('daysBetween', () => {
  test('counts whole calendar days', () => {
    expect(daysBetween('2026-03-09', '2026-03-16')).toBe(7)
    expect(daysBetween('2026-03-09', '2026-03-09')).toBe(0)
  })

  test('is negative when the range runs backwards', () => {
    expect(daysBetween('2026-03-16', '2026-03-09')).toBe(-7)
  })

  // A 23-hour day must still count as one day, or lesson spacing drifts after March.
  test('is exact across the DST transition', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-03-23', '2026-03-30')).toBe(7)
  })
})

// ─── Time-of-day helpers ──────────────────────────────────────────────────────

describe('time-of-day helpers', () => {
  test('parseMinutes converts "HH:mm" to minutes since midnight', () => {
    expect(parseMinutes('00:00')).toBe(0)
    expect(parseMinutes('09:30')).toBe(570)
    expect(parseMinutes('23:59')).toBe(1439)
  })

  test('formatMinutes is the inverse of parseMinutes', () => {
    expect(formatMinutes(0)).toBe('00:00')
    expect(formatMinutes(570)).toBe('09:30')
    expect(formatMinutes(parseMinutes('14:45'))).toBe('14:45')
  })

  test('snapUpMinutes rounds up to the snap grid and leaves exact points alone', () => {
    expect(snapUpMinutes(67, 15)).toBe(75)
    expect(snapUpMinutes(60, 15)).toBe(60)
    expect(snapUpMinutes(1, 15)).toBe(15)
  })
})

// ─── formatCountdown ──────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  const minutes = (n: number) => n * 60000
  const hours = (n: number) => minutes(n * 60)
  const days = (n: number) => hours(n * 24)

  test('shows days and hours once at least a day remains', () => {
    expect(formatCountdown(days(2) + hours(5))).toBe('2d 5h')
    expect(formatCountdown(days(1))).toBe('1d 0h')
  })

  test('drops to hours and minutes under a day', () => {
    expect(formatCountdown(hours(5) + minutes(20))).toBe('5h 20m')
    expect(formatCountdown(hours(23) + minutes(59))).toBe('23h 59m')
  })

  test('shows minutes only under an hour', () => {
    expect(formatCountdown(minutes(18))).toBe('18m')
    expect(formatCountdown(minutes(1))).toBe('1m')
  })

  test('rounds down rather than up, so it never overstates the time left', () => {
    expect(formatCountdown(minutes(5) + 59000)).toBe('5m')
  })

  // The caller shows "deadline passed" instead, but the formatter must not emit "-3m".
  test('clamps at zero for an elapsed deadline', () => {
    expect(formatCountdown(0)).toBe('0m')
    expect(formatCountdown(-minutes(3))).toBe('0m')
  })
})
