import { range } from './array'

test('range is correct', () => {
  expect(range(5)).toEqual([0, 1, 2, 3, 4])
  expect(range(5, 3)).toEqual([3, 4, 5, 6, 7])
  expect(range(5, 3, 5)).toEqual([3, 8, 13, 18, 23])
})
