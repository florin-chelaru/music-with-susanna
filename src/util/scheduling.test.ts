import {
  applyCancellation,
  AvailabilityBlock,
  AvailabilityLabel,
  findConflict,
  LABEL_SCORES,
  LessonInstance,
  computeCombinedScore,
  isWithinCancellationWindow,
  fromStoredAvailability,
  fromStoredSubmission,
  fromStoredSuggestion,
  removeOverlaps,
  reverted,
  SCHEDULING_CONFIG,
  scoreForDayTime,
  weightBandKey,
  toStoredAvailability
} from './scheduling'

test('returns 0 when teacher score is 0 (hard block)', () => {
  expect(computeCombinedScore(0, 10)).toBe(0)
})

test('returns 0 when student score is 0 (hard block)', () => {
  expect(computeCombinedScore(10, 0)).toBe(0)
})

test('returns 0 when both scores are 0', () => {
  expect(computeCombinedScore(0, 0)).toBe(0)
})

test('both preferred (10, 10) → max combined score of 10', () => {
  expect(computeCombinedScore(10, 10)).toBe(10)
})

test('applies configured weights: teacher=10 student=6 → 10×0.7 + 6×0.3 = 8.8', () => {
  expect(computeCombinedScore(10, 6)).toBeCloseTo(8.8)
})

test('applies configured weights: teacher=6 student=10 → 6×0.7 + 10×0.3 = 7.2', () => {
  expect(computeCombinedScore(6, 10)).toBeCloseTo(7.2)
})

test('teacher preferred + student last resort scores higher than the reverse', () => {
  // teacher weight (0.7) > student weight (0.3), so teacher's preference matters more
  expect(computeCombinedScore(10, 2)).toBeGreaterThan(computeCombinedScore(2, 10))
})

test('result matches the weight formula directly', () => {
  const { TEACHER_WEIGHT, STUDENT_WEIGHT } = SCHEDULING_CONFIG
  expect(computeCombinedScore(8, 4)).toBeCloseTo(8 * TEACHER_WEIGHT + 4 * STUDENT_WEIGHT)
})

// ─── removeOverlaps ───────────────────────────────────────────────────────────
//
// Drawing a block on the availability calendar lets it claim its time range outright:
// whatever was there is clipped out of the way, silently. Getting this wrong shows up as
// blocks that visually overlap, or that disappear when they should only have been trimmed.
//
// removeOverlaps returns only the *surviving existing* blocks — the caller appends `incoming`.

const MON = 0
const TUE = 1

function block(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  label = AvailabilityLabel.AVAILABLE
): AvailabilityBlock {
  return { dayOfWeek, startTime, endTime, label, score: LABEL_SCORES[label] }
}

describe('removeOverlaps', () => {
  test('leaves non-overlapping blocks on the same day untouched', () => {
    const existing = [block(MON, '09:00', '10:00'), block(MON, '14:00', '15:00')]
    const incoming = block(MON, '11:00', '12:00')
    expect(removeOverlaps(existing, incoming)).toEqual(existing)
  })

  test('touching edges do not count as an overlap', () => {
    const existing = [block(MON, '09:00', '10:00'), block(MON, '11:00', '12:00')]
    // incoming sits exactly between them, sharing both boundaries
    expect(removeOverlaps(existing, block(MON, '10:00', '11:00'))).toEqual(existing)
  })

  test('trims an existing block that overlaps on its right edge', () => {
    const existing = [block(MON, '09:00', '11:00')]
    const result = removeOverlaps(existing, block(MON, '10:00', '12:00'))
    expect(result).toEqual([block(MON, '09:00', '10:00')])
  })

  test('pushes forward an existing block that overlaps on its left edge', () => {
    const existing = [block(MON, '10:00', '12:00')]
    const result = removeOverlaps(existing, block(MON, '09:00', '11:00'))
    expect(result).toEqual([block(MON, '11:00', '12:00')])
  })

  test('splits an existing block that the incoming one punches through', () => {
    const existing = [block(MON, '09:00', '13:00')]
    const result = removeOverlaps(existing, block(MON, '10:00', '11:00'))
    expect(result).toEqual([block(MON, '09:00', '10:00'), block(MON, '11:00', '13:00')])
  })

  test('drops an existing block that is fully covered', () => {
    const existing = [block(MON, '10:00', '11:00')]
    expect(removeOverlaps(existing, block(MON, '09:00', '12:00'))).toEqual([])
  })

  test('drops an existing block with exactly the same range', () => {
    const existing = [block(MON, '10:00', '11:00')]
    expect(removeOverlaps(existing, block(MON, '10:00', '11:00'))).toEqual([])
  })

  test('never touches blocks on other days', () => {
    const existing = [block(TUE, '10:00', '11:00'), block(MON, '10:00', '11:00')]
    const result = removeOverlaps(existing, block(MON, '09:00', '12:00'))
    expect(result).toEqual([block(TUE, '10:00', '11:00')])
  })

  test('preserves the label and score of a clipped block', () => {
    const existing = [block(MON, '09:00', '13:00', AvailabilityLabel.PREFERRED)]
    const result = removeOverlaps(existing, block(MON, '10:00', '11:00'))
    expect(result).toHaveLength(2)
    result.forEach((b) => {
      expect(b.label).toBe(AvailabilityLabel.PREFERRED)
      expect(b.score).toBe(LABEL_SCORES[AvailabilityLabel.PREFERRED])
    })
  })

  test('does not include the incoming block — the caller appends it', () => {
    const incoming = block(MON, '10:00', '11:00')
    expect(removeOverlaps([], incoming)).toEqual([])
  })

  test('clips several existing blocks in one pass', () => {
    const existing = [
      block(MON, '08:00', '09:00'), // untouched, before
      block(MON, '09:30', '10:30'), // trimmed on the right
      block(MON, '10:30', '11:00'), // fully covered
      block(MON, '11:30', '13:00'), // pushed forward
      block(MON, '14:00', '15:00') // untouched, after
    ]
    const result = removeOverlaps(existing, block(MON, '10:00', '12:00'))
    expect(result).toEqual([
      block(MON, '08:00', '09:00'),
      block(MON, '09:30', '10:00'),
      block(MON, '12:00', '13:00'),
      block(MON, '14:00', '15:00')
    ])
  })
})

// ─── isWithinCancellationWindow ───────────────────────────────────────────────

describe('isWithinCancellationWindow', () => {
  const NOW = new Date('2026-10-08T12:00:00Z').getTime()
  const hours = (n: number) => NOW + n * 60 * 60 * 1000

  test('a lesson further away than the window is outside it', () => {
    expect(isWithinCancellationWindow(hours(25), 24, NOW)).toBe(false)
  })

  test('a lesson closer than the window is inside it', () => {
    expect(isWithinCancellationWindow(hours(23), 24, NOW)).toBe(true)
  })

  test('exactly at the window boundary counts as outside', () => {
    expect(isWithinCancellationWindow(hours(24), 24, NOW)).toBe(false)
  })

  // A no-show has to behave like a late cancellation, not a free one.
  test('a lesson already in the past is inside the window', () => {
    expect(isWithinCancellationWindow(hours(-1), 24, NOW)).toBe(true)
  })

  test('respects a per-student window override', () => {
    expect(isWithinCancellationWindow(hours(40), 48, NOW)).toBe(true)
    expect(isWithinCancellationWindow(hours(40), 24, NOW)).toBe(false)
  })
})

// ─── findConflict ─────────────────────────────────────────────────────────────
//
// Two callers with deliberately different policies: the solver passes the default minimum
// break, the drag editor passes 0 because that break is a constraint for the algorithm and
// not a rule to impose on the teacher. Both paths are covered.

const span = (date: string, startTime: string, endTime: string) => ({ date, startTime, endTime })

describe('findConflict', () => {
  const existing = [span('2026-10-19', '10:00', '11:00')]

  test('a lesson clear of the break does not conflict', () => {
    expect(findConflict(span('2026-10-19', '11:10', '12:00'), existing)).toBeNull()
    expect(findConflict(span('2026-10-19', '09:00', '09:50'), existing)).toBeNull()
  })

  test('a lesson inside the break conflicts even without overlapping', () => {
    expect(findConflict(span('2026-10-19', '11:05', '12:00'), existing)).not.toBeNull()
    expect(findConflict(span('2026-10-19', '09:00', '09:55'), existing)).not.toBeNull()
  })

  test('exactly touching counts as a conflict at the default break', () => {
    expect(findConflict(span('2026-10-19', '11:00', '12:00'), existing)).not.toBeNull()
  })

  // The editor passes 0 so the teacher can place lessons back to back on purpose.
  test('with a zero break, touching is allowed but overlapping is not', () => {
    expect(findConflict(span('2026-10-19', '11:00', '12:00'), existing, 0)).toBeNull()
    expect(findConflict(span('2026-10-19', '09:00', '10:00'), existing, 0)).toBeNull()
    expect(findConflict(span('2026-10-19', '10:59', '12:00'), existing, 0)).not.toBeNull()
  })

  test('overlap in any arrangement conflicts', () => {
    expect(findConflict(span('2026-10-19', '10:15', '10:45'), existing)).not.toBeNull() // inside
    expect(findConflict(span('2026-10-19', '09:00', '12:00'), existing)).not.toBeNull() // around
    expect(findConflict(span('2026-10-19', '10:00', '11:00'), existing)).not.toBeNull() // identical
  })

  test('a different date never conflicts', () => {
    expect(findConflict(span('2026-10-20', '10:00', '11:00'), existing)).toBeNull()
  })

  test('returns the offending lesson so the caller can name it', () => {
    const blockers = [span('2026-10-19', '08:00', '09:00'), span('2026-10-19', '10:00', '11:00')]
    expect(findConflict(span('2026-10-19', '10:30', '11:30'), blockers)).toBe(blockers[1])
  })
})

// ─── applyCancellation ────────────────────────────────────────────────────────

describe('applyCancellation', () => {
  const lesson = (
    id: string,
    studentId: string,
    start: number,
    status: LessonInstance['status'] = 'scheduled'
  ): LessonInstance => ({
    id,
    studentId,
    locationId: 'loc',
    scheduledStart: start,
    scheduledEnd: start + 45 * 60000,
    timezone: 'Europe/Bucharest',
    status,
    isAdHoc: false,
    isMakeup: false,
    calendarSequence: 0,
    createdAt: 0
  })

  const DAY = 86400000
  const lessons = [
    lesson('a1', 'ana', 1 * DAY),
    lesson('a2', 'ana', 2 * DAY),
    lesson('a3', 'ana', 3 * DAY),
    lesson('b1', 'bob', 2 * DAY),
    lesson('b2', 'bob', 3 * DAY)
  ]
  const byId = (result: LessonInstance[], id: string) => result.find((l) => l.id === id)?.status

  test('cancels only the target when not cancelling forward', () => {
    const result = applyCancellation(lessons, lessons[1], false)
    expect(byId(result, 'a2')).toBe('canceled')
    expect(byId(result, 'a3')).toBe('scheduled')
    expect(byId(result, 'a1')).toBe('scheduled')
  })

  test("cancelling forward also cancels that student's later lessons", () => {
    const result = applyCancellation(lessons, lessons[1], true)
    expect(byId(result, 'a2')).toBe('canceled')
    expect(byId(result, 'a3')).toBe('canceled')
  })

  test('never touches earlier lessons', () => {
    const result = applyCancellation(lessons, lessons[1], true)
    expect(byId(result, 'a1')).toBe('scheduled')
  })

  // The teacher's calendar holds every student's lessons, so the scope matters there.
  test('never touches another student', () => {
    const result = applyCancellation(lessons, lessons[1], true)
    expect(byId(result, 'b1')).toBe('scheduled')
    expect(byId(result, 'b2')).toBe('scheduled')
  })

  test('leaves already completed lessons alone', () => {
    const withCompleted = [...lessons, lesson('a4', 'ana', 4 * DAY, 'completed')]
    const result = applyCancellation(withCompleted, withCompleted[1], true)
    expect(byId(result, 'a4')).toBe('completed')
  })

  test('does not mutate the input', () => {
    const before = lessons.map((l) => l.status)
    applyCancellation(lessons, lessons[1], true)
    expect(lessons.map((l) => l.status)).toEqual(before)
  })
})

// ─── scoreForDayTime ──────────────────────────────────────────────────────────

describe('scoreForDayTime', () => {
  const blocks = [
    block(MON, '09:00', '12:00', AvailabilityLabel.PREFERRED),
    block(TUE, '14:00', '16:00', AvailabilityLabel.LAST_RESORT)
  ]

  test("returns the covering block's score", () => {
    expect(scoreForDayTime(blocks, MON, '10:00')).toBe(LABEL_SCORES[AvailabilityLabel.PREFERRED])
    expect(scoreForDayTime(blocks, TUE, '15:00')).toBe(LABEL_SCORES[AvailabilityLabel.LAST_RESORT])
  })

  // Half-open: a block covers its start but not its end, so two touching blocks never both
  // claim the boundary minute.
  test('the start is covered and the end is not', () => {
    expect(scoreForDayTime(blocks, MON, '09:00')).toBe(LABEL_SCORES[AvailabilityLabel.PREFERRED])
    expect(scoreForDayTime(blocks, MON, '12:00')).toBe(0)
  })

  test('uncovered times score 0, which is also the hard-block value', () => {
    expect(scoreForDayTime(blocks, MON, '08:00')).toBe(0)
    expect(scoreForDayTime(blocks, MON, '13:00')).toBe(0)
  })

  test('the day has to match', () => {
    expect(scoreForDayTime(blocks, TUE, '10:00')).toBe(0)
    expect(scoreForDayTime([], MON, '10:00')).toBe(0)
  })
})

// ─── reverted ─────────────────────────────────────────────────────────────────

describe('reverted', () => {
  const moved = {
    studentId: 'ana',
    date: '2026-01-07',
    startTime: '14:00',
    endTime: '14:45',
    teacherScore: 2,
    studentScore: 6,
    combinedScore: 3.2,
    moved: true,
    original: {
      date: '2026-01-05',
      startTime: '09:00',
      endTime: '09:45',
      teacherScore: 10,
      studentScore: 10,
      combinedScore: 10
    }
  }

  // The bug this guards: restoring the times alone left the lesson wearing the score of a time
  // it no longer occupied, so undoing every edit changed the calendar and not the averages.
  test('restores what the lesson was worth, not only when it was', () => {
    const back = reverted(moved)
    expect(back.date).toBe('2026-01-05')
    expect(back.startTime).toBe('09:00')
    expect(back.teacherScore).toBe(10)
    expect(back.studentScore).toBe(10)
    expect(back.combinedScore).toBe(10)
  })

  test('marks the slot untouched again', () => {
    const back = reverted(moved)
    expect(back.moved).toBe(false)
    expect(back.original).toBeUndefined()
  })

  test('leaves a slot nobody moved exactly as it was', () => {
    const untouched = { ...moved, moved: undefined, original: undefined }
    expect(reverted(untouched)).toBe(untouched)
  })
})

// ─── Availability storage round-trip ──────────────────────────────────────────
//
// RTDB discards empty objects and arrays. Everything here is about what that destroys.

describe('availability storage', () => {
  test('reads back a record that lost its empty keys', () => {
    // What a teacher with hours but no overrides actually comes back as: `weekOverrides: {}`
    // was written and stored as nothing at all.
    const stored = { weeklyTemplate: { blocks: [] } }
    expect(fromStoredAvailability(stored)).toEqual({
      weeklyTemplate: { blocks: [] },
      weekOverrides: {}
    })
    // And a semester nobody has touched reads back as nothing whatsoever.
    expect(fromStoredAvailability(null)).toEqual({
      weeklyTemplate: { blocks: [] },
      weekOverrides: {}
    })
  })

  // The bug this guards is silent rather than loud: "away all week" is an override with no
  // blocks, which collapses to an empty node and disappears, turning "I am away" into "I never
  // said anything" — and the lessons get scheduled.
  test('keeps an away-all-week override from collapsing to nothing', () => {
    const stored = toStoredAvailability({
      weeklyTemplate: { blocks: [] },
      weekOverrides: { '2026-11-09': { blocks: [] } }
    })
    const node = stored.weekOverrides['2026-11-09']
    expect(Object.keys(node).length).toBeGreaterThan(0)
    expect(fromStoredAvailability(stored).weekOverrides['2026-11-09'].blocks).toEqual([])
  })

  test('an override that lost its blocks still means away, not missing', () => {
    const roundTripped = fromStoredAvailability({ weekOverrides: { '2026-11-09': {} } })
    expect(roundTripped.weekOverrides['2026-11-09']).toEqual({
      blocks: [],
      savedAt: undefined
    })
  })
})

// The schedule with nothing missing is exactly the one RTDB strips keys from, so the happiest
// result is the one that reads back broken.
describe('fromStoredSuggestion', () => {
  test('restores the keys an empty record loses', () => {
    const restored = fromStoredSuggestion({ weightFrom: 0.5, weightTo: 0.5 })
    expect(restored.slots).toEqual([])
    expect(restored.missedLessonsByStudent).toEqual({})
    expect(restored.totalScore).toBe(0)
  })

  test('leaves a complete record alone', () => {
    const stored = {
      slots: [{ studentId: 'ana' }],
      missedLessonsByStudent: { bob: 1 },
      totalScore: 42
    }
    expect(fromStoredSuggestion(stored)).toMatchObject(stored)
  })
})

// The third place the same rule bit: a student who marked no weeks away reads back with no
// weekOverrides key at all, and the solver dereferences it while generating candidates.
describe('fromStoredSubmission', () => {
  test('restores the keys an empty record loses', () => {
    const restored = fromStoredSubmission({ studentId: 'ana', status: 'submitted' })
    expect(restored.recurringPreferences).toEqual([])
    expect(restored.weekOverrides).toEqual({})
  })

  test('an override that lost its blocks still means away', () => {
    const restored = fromStoredSubmission({ weekOverrides: { '2026-11-09': {} } })
    expect(restored.weekOverrides['2026-11-09'].blocks).toEqual([])
  })
})

// RTDB forbids '.' in a key, which is exactly what the obvious `${weightFrom}-${weightTo}`
// produces — the write failed outright with "invalid key (0.6-0.9)".
describe('weightBandKey', () => {
  test('contains no character RTDB rejects', () => {
    const key = weightBandKey(0.6, 0.9)
    expect(key).toBe('60_90')
    expect(key).not.toMatch(/[.#$/[\]]/)
  })

  test('a band reached by repeated addition keys the same as one written down', () => {
    // 0.1 + 0.1 + 0.1 is 0.30000000000000004, which is how the sweep produces its bounds.
    expect(weightBandKey(0.1 + 0.1 + 0.1, 0.9)).toBe(weightBandKey(0.3, 0.9))
  })
})
