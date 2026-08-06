import { computeCombinedScore, SCHEDULING_CONFIG } from './scheduling'

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
