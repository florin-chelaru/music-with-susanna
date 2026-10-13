import { renderHook } from '@testing-library/react'
import { onValue, ref } from 'firebase/database'
import {
  useMyLessons,
  useMyNotifications,
  useSchedulingRounds,
  useStudentSubmissions
} from './schedulingHooks'

jest.mock('firebase/database')
jest.mock('../store/Firebase', () => ({ database: {}, auth: {}, storage: {}, analytics: {} }))

const mockOnValue = onValue as jest.Mock
const mockRef = ref as jest.Mock

/** Makes the next onValue call hand back this value instead of null. */
function nextSnapshot(value: unknown) {
  mockOnValue.mockImplementationOnce((_, listener: (snap: { val: () => unknown }) => void) => {
    listener({ val: () => value })
    return jest.fn()
  })
}

/** The path the hook subscribed to, which is what has to line up with the security rules. */
function subscribedPath(): string {
  return mockRef.mock.calls[0][1] as string
}

describe('scheduling hooks', () => {
  test('folds an RTDB object into a list, keeping the key as the id', () => {
    nextSnapshot({ 'round-1': { roundNumber: 1 }, 'round-2': { roundNumber: 2 } })
    const { result } = renderHook(() => useSchedulingRounds('t1', 's1'))

    expect(result.current.rounds).toEqual([
      { id: 'round-1', roundNumber: 1 },
      { id: 'round-2', roundNumber: 2 }
    ])
    expect(result.current.loading).toBe(false)
  })

  // The paths are the half of this that the type system cannot check: a hook reading a path the
  // rules do not grant fails at runtime with a permission error and nowhere earlier.
  test('subscribes to the path the security rules grant', () => {
    renderHook(() => useStudentSubmissions('t1', 's1', 'r1'))
    expect(subscribedPath()).toBe('studentSubmissions/teachers/t1/semesters/s1/rounds/r1/students')
  })

  // Lessons are read from the index, not from lessonInstances: the rules grant a student one
  // lesson at a time by studentId, which RTDB cannot turn into a listable query.
  test('reads a student’s own lessons from the index', () => {
    renderHook(() => useMyLessons('ana'))
    expect(subscribedPath()).toBe('studentLessons/ana')
  })

  // An id that has not resolved yet is "wait", not "read the parent" — subscribing without it
  // would read every teacher's data and be refused.
  test('does not subscribe until the ids it needs exist', () => {
    const { result } = renderHook(() => useSchedulingRounds('t1', null))
    expect(mockOnValue).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    expect(result.current.rounds).toEqual([])
  })

  test('empty data loads rather than hanging', () => {
    const { result } = renderHook(() => useStudentSubmissions('t1', 's1', 'r1'))
    expect(result.current.submissions).toEqual({})
    expect(result.current.loading).toBe(false)
  })

  test('a student sees only notifications addressed to them', () => {
    nextSnapshot({ n1: { recipientId: 'ana' }, n2: { recipientId: 'bob' } })
    const { result } = renderHook(() => useMyNotifications('t1', 'ana'))
    expect(result.current.notifications.map((n) => n.id)).toEqual(['n1'])
  })
})
