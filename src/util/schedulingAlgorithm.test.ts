import {
  computeSchedule,
  generateAllCandidates,
  generateAllSuggestions,
  getEffectiveBlocksForDate,
  getScoreForSpan,
  pickSpread,
  SchedulingInput
} from './schedulingAlgorithm'
import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  SCHEDULING_CONFIG,
  StudentSubmission,
  weeklyQuota
} from './scheduling'
import { weekStartDate } from './schedulingDates'

const MON = 0
const WED = 2

function block(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  label: AvailabilityLabel
): AvailabilityBlock {
  return { dayOfWeek, startTime, endTime, label, score: LABEL_SCORES[label] }
}

function submission(blocks: AvailabilityBlock[], weekOverrides = {}): StudentSubmission {
  return { studentId: '', status: 'submitted', recurringPreferences: blocks, weekOverrides }
}

// Two weeks, Mon 5 – Fri 16 January 2026. The teacher has Monday mornings only, so every
// candidate has to come out of one three-hour window — which is what makes the students
// compete for it.
const TEACHER_MON = [block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)]

function input(overrides: Partial<SchedulingInput> = {}): SchedulingInput {
  return {
    semesterStart: '2026-01-05',
    semesterEnd: '2026-01-16',
    teacherAvailability: { weeklyTemplate: { blocks: TEACHER_MON }, weekOverrides: {} },
    enrollments: [
      { studentId: 'ana', lessonDurationMinutes: 45, totalLessons: 2 },
      { studentId: 'bob', lessonDurationMinutes: 45, totalLessons: 2 }
    ],
    submissions: {
      ana: submission([block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)]),
      bob: submission([block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)])
    },
    ...overrides
  }
}

// ─── weeklyQuota ──────────────────────────────────────────────────────────────

describe('weeklyQuota', () => {
  test('spreads the surplus through the term by default', () => {
    expect(weeklyQuota(15, 10, 'even')).toEqual([2, 1, 2, 1, 2, 1, 2, 1, 2, 1])
  })

  test('front-loads or back-loads it when asked', () => {
    expect(weeklyQuota(15, 10, 'start')).toEqual([2, 2, 2, 2, 2, 1, 1, 1, 1, 1])
    expect(weeklyQuota(15, 10, 'end')).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2])
  })

  // The case the remainder rule alone gets wrong: a bi-weekly student must stay bi-weekly
  // rather than take eight lessons in a row and then stop.
  test('keeps a bi-weekly student bi-weekly', () => {
    expect(weeklyQuota(8, 15, 'even')).toEqual([1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0])
    expect(weeklyQuota(8, 15, 'start')).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
  })

  test('all three agree when the lessons divide evenly', () => {
    const even = weeklyQuota(15, 15, 'even')
    expect(even).toEqual(new Array(15).fill(1))
    expect(weeklyQuota(15, 15, 'start')).toEqual(even)
    expect(weeklyQuota(15, 15, 'end')).toEqual(even)
  })

  test('always totals the lessons asked for', () => {
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
    expect(sum(weeklyQuota(15, 10))).toBe(15)
    expect(sum(weeklyQuota(8, 15))).toBe(8)
    expect(sum(weeklyQuota(0, 15))).toBe(0)
  })
})

// ─── getEffectiveBlocksForDate ────────────────────────────────────────────────

describe('getEffectiveBlocksForDate', () => {
  const weekly = [block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)]

  test('falls back to the weekly template', () => {
    expect(getEffectiveBlocksForDate(weekly, {}, '2026-01-05')).toHaveLength(1)
    expect(getEffectiveBlocksForDate(weekly, {}, '2026-01-06')).toHaveLength(0) // a Tuesday
  })

  // The override key must agree with what the UI writes, or overrides silently never apply.
  test('an override is found under the key weekStartDate produces', () => {
    const overrides = { [weekStartDate('2026-01-07')]: { blocks: [] } }
    expect(getEffectiveBlocksForDate(weekly, overrides, '2026-01-05')).toHaveLength(0)
  })

  test('an empty override means the whole week is off', () => {
    const overrides = { '2026-01-05': { blocks: [] } }
    expect(getEffectiveBlocksForDate(weekly, overrides, '2026-01-05')).toHaveLength(0)
  })

  // Overrides replace the template in both directions, so one can add availability too.
  test('an override can add availability the template does not have', () => {
    const overrides = {
      '2026-01-05': { blocks: [block(WED, '14:00', '16:00', AvailabilityLabel.AVAILABLE)] }
    }
    expect(getEffectiveBlocksForDate(weekly, overrides, '2026-01-07')).toHaveLength(1)
  })
})

// ─── getScoreForSpan ──────────────────────────────────────────────────────────

describe('getScoreForSpan', () => {
  const blocks = [
    block(MON, '09:00', '10:00', AvailabilityLabel.PREFERRED),
    block(MON, '10:00', '11:00', AvailabilityLabel.AVAILABLE)
  ]

  test('averages across the blocks a lesson spans', () => {
    expect(getScoreForSpan(blocks, '09:30', 45)).toBeCloseTo((30 * 10 + 15 * 6) / 45)
  })

  // A lesson is only as good as its worst minute: half-covered is not usable at all.
  test('returns 0 when any part of the span is uncovered', () => {
    expect(getScoreForSpan(blocks, '10:30', 60)).toBe(0) // runs past the end
    expect(getScoreForSpan(blocks, '08:30', 60)).toBe(0) // starts before the beginning
  })
})

// ─── Scheduling ───────────────────────────────────────────────────────────────

describe('computeSchedule', () => {
  test('places every student every week they are due', () => {
    const data = input()
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    expect(result.slots).toHaveLength(4) // two students × two weeks
    expect(result.missedLessonsByStudent).toEqual({})
  })

  // Both want the same three-hour window, so the solver has to separate them.
  test('two students competing for one window do not collide', () => {
    const data = input()
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    const monday = result.slots.filter((s) => s.date === '2026-01-05')
    expect(monday).toHaveLength(2)
    expect(monday[0].startTime).not.toBe(monday[1].startTime)
  })

  test('a student with no overlapping availability is reported, not silently dropped', () => {
    const data = input({
      submissions: {
        ana: submission([block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)]),
        bob: submission([block(WED, '09:00', '12:00', AvailabilityLabel.PREFERRED)])
      }
    })
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    expect(result.missedLessonsByStudent.bob).toBe(2) // both of bob's lessons
    expect(result.slots.some((s) => s.studentId === 'bob')).toBe(false)
    expect(result.slots.some((s) => s.studentId === 'ana')).toBe(true)
  })

  // Missing one week is not the same as being unschedulable. Counting a single bad week as
  // "could not be scheduled" made a student who is away for one week of the term show a full
  // set of scores and a cannot-schedule warning at the same time.
  test('a student away for one week loses that lesson, not the whole term', () => {
    const data = input({
      submissions: {
        ana: submission([block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)]),
        bob: submission([block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED)], {
          '2026-01-12': { blocks: [] }
        })
      }
    })
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    expect(result.missedLessonsByStudent.bob).toBe(1)
    expect(result.slots.filter((s) => s.studentId === 'bob')).toHaveLength(1)
  })

  test('a fully blocked week produces no lessons for it', () => {
    const data = input({
      teacherAvailability: {
        weeklyTemplate: { blocks: TEACHER_MON },
        weekOverrides: { '2026-01-12': { blocks: [] } }
      }
    })
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    expect(result.slots.every((s) => s.date < '2026-01-12')).toBe(true)
  })

  test('lessons that recur at the same time share a series id', () => {
    const data = input()
    const result = computeSchedule(data, generateAllCandidates(data), 0.5)
    const ana = result.slots.filter((s) => s.studentId === 'ana')
    expect(new Set(ana.map((s) => s.seriesId)).size).toBe(1)
    const bob = result.slots.filter((s) => s.studentId === 'bob')
    expect(ana[0].seriesId).not.toBe(bob[0].seriesId)
  })
})

// ─── Weight sweep ─────────────────────────────────────────────────────────────

describe('generateAllSuggestions', () => {
  // Ana and the teacher both want the early slot; Bob wants the late one. The weight decides
  // whose preference wins, which is the whole reason the sweep exists.
  const contested = input({
    teacherAvailability: {
      weeklyTemplate: {
        blocks: [
          block(MON, '09:00', '10:00', AvailabilityLabel.PREFERRED),
          block(MON, '10:00', '12:00', AvailabilityLabel.LAST_RESORT)
        ]
      },
      weekOverrides: {}
    },
    enrollments: [{ studentId: 'ana', lessonDurationMinutes: 45, totalLessons: 2 }],
    submissions: {
      ana: submission([
        block(MON, '09:00', '10:00', AvailabilityLabel.LAST_RESORT),
        block(MON, '10:00', '12:00', AvailabilityLabel.PREFERRED)
      ])
    }
  })

  test('returns schedules ordered most teacher-favouring first', () => {
    const suggestions = generateAllSuggestions(contested)
    expect(suggestions.length).toBeGreaterThan(1)
    expect(suggestions[0].weightFrom).toBeGreaterThan(
      suggestions[suggestions.length - 1].weightFrom
    )
  })

  // The list is ordered teacher-favouring first, but each entry's own range still reads low to
  // high, so a card can label itself "0.5 to 1.0".
  test('each schedule carries an ascending weight range, and the ranges cover the sweep', () => {
    const suggestions = generateAllSuggestions(contested)
    suggestions.forEach((s) => {
      expect(s.weightFrom).toBeLessThanOrEqual(s.weightTo)
    })
    const ascending = [...suggestions].reverse()
    expect(ascending[0].weightFrom).toBe(SCHEDULING_CONFIG.WEIGHT_SWEEP_MIN)
    expect(ascending[ascending.length - 1].weightTo).toBe(SCHEDULING_CONFIG.WEIGHT_SWEEP_MAX)
  })

  // Neither end of the sweep may zero out a side's score: with nothing to break ties on, the
  // solver would give the unfavoured side an "available" slot where a "preferred" one was free.
  test('the sweep never drops either side out of the formula', () => {
    generateAllSuggestions(contested).forEach((s) => {
      expect(s.weightFrom).toBeGreaterThan(0)
      expect(s.weightTo).toBeLessThan(1)
    })
  })

  test('the extremes genuinely differ', () => {
    const suggestions = generateAllSuggestions(contested)
    const first = suggestions[0].slots.map((s) => s.startTime).join()
    const last = suggestions[suggestions.length - 1].slots.map((s) => s.startTime).join()
    expect(first).not.toBe(last)
  })

  test('identical schedules are not offered twice', () => {
    const signatures = generateAllSuggestions(contested).map((s) =>
      s.slots
        .map((slot) => `${slot.studentId}${slot.date}${slot.startTime}`)
        .sort()
        .join('|')
    )
    expect(new Set(signatures).size).toBe(signatures.length)
  })
})

describe('pickSpread', () => {
  test('keeps everything when it already fits', () => {
    expect(pickSpread([1, 2, 3], 10)).toEqual([1, 2, 3])
  })

  // Dropping the tail would hide the most student-favouring option, which is half the point.
  test('always keeps both extremes', () => {
    const many = Array.from({ length: 30 }, (_, i) => i)
    const picked = pickSpread(many, 10)
    expect(picked).toHaveLength(10)
    expect(picked[0]).toBe(0)
    expect(picked[picked.length - 1]).toBe(29)
  })
})
