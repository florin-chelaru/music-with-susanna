import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  computeCombinedScore,
  isWithinCancellationWindow,
  removeOverlaps,
  SCHEDULING_CONFIG
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
