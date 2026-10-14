import { get, push, ref, update } from 'firebase/database'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as paths from './schedulingPaths'
import {
  acknowledgeCancellation,
  cancelLessons,
  confirmSchedule,
  deleteSemester
} from './schedulingWrites'

jest.mock('firebase/database')
jest.mock('../store/Firebase', () => ({ database: {}, auth: {}, storage: {}, analytics: {} }))

// The mirrors are the part of this schema nothing else can check.
//
// RTDB cannot filter a list, and a read granted on a child does not grant listing its parent — so
// a student discovers their lessons and their cancellations only through an index the teacher
// writes for them. That makes every such record two records, and a write that updates one and
// forgets the other is invisible: the teacher's screen stays right while the student's goes
// stale, or the other way round, with no error anywhere.
//
// So rather than assert the exact payload of each write, these tests assert the invariant: the
// same record ids, and the same fields within them, are touched on both sides of every mirror.
// A write that reaches one side only fails here, including one added later — which is the point.

const TEACHER = 't1'
const SEMESTER = 's1'

/** Each mirror, as the pair of path shapes that must stay in step. */
const MIRRORS = [
  {
    name: 'lessons',
    source: /^lessonInstances\/teachers\/[^/]+\/semesters\/[^/]+\/lessons\/([^/]+)(\/.*)?$/,
    index: /^studentLessons\/[^/]+\/([^/]+)(\/.*)?$/
  },
  {
    name: 'cancellations',
    source: /^cancellations\/teachers\/[^/]+\/semesters\/[^/]+\/([^/]+)(\/.*)?$/,
    index: /^studentCancellations\/[^/]+\/([^/]+)(\/.*)?$/
  }
]

const mockRef = ref as jest.Mock
const mockGet = get as jest.Mock
const mockPush = push as jest.Mock
const mockUpdate = update as jest.Mock

/** What the fake database holds, keyed by path. Only `deleteSemester` reads anything. */
let stored: Record<string, unknown> = {}

beforeEach(() => {
  jest.clearAllMocks()
  stored = {}
  // A ref that remembers its path, so `get` can answer from `stored` and the assertions can read
  // the paths an update was addressed to.
  mockRef.mockImplementation((_database: unknown, path?: string) => ({ path }))
  mockGet.mockImplementation(
    async (reference: { path?: string }) =>
      await Promise.resolve({ val: () => stored[reference.path ?? ''] ?? null })
  )
  // The shared mock hands back one fixed key, which would collapse several records into one.
  let keys = 0
  mockPush.mockImplementation(() => ({ key: `key-${++keys}` }))
})

/** The paths and values of the one root-level update the call under test made. */
function writtenUpdates(): Record<string, unknown> {
  expect(mockUpdate).toHaveBeenCalledTimes(1)
  expect((mockUpdate.mock.calls[0][0] as { path?: string }).path).toBeUndefined()
  return mockUpdate.mock.calls[0][1] as Record<string, unknown>
}

/** What a set of paths touched, keyed by the record id and field: "id" or "id/field". */
function touched(updates: Record<string, unknown>, shape: RegExp): Map<string, unknown> {
  const byKey = new Map<string, unknown>()
  Object.entries(updates).forEach(([path, value]) => {
    const match = shape.exec(path)
    if (match) byKey.set(`${match[1]}${match[2] ?? ''}`, value)
  })
  return byKey
}

/**
 * Both sides of every mirror were written, with the same ids, fields and values.
 *
 * The index may carry more than the record it mirrors — a student's copy adds the teacher and
 * semester its flat key cannot express — so the check is that nothing in the record is missing
 * or different, not that the two are identical.
 */
function expectMirrored(updates: Record<string, unknown>) {
  MIRRORS.forEach(({ name, source, index }) => {
    const written = touched(updates, source)
    const mirrored = touched(updates, index)
    // Named in the expectation so a failure says which mirror broke, not just which keys differ.
    expect({ mirror: name, keys: [...written.keys()].sort() }).toEqual({
      mirror: name,
      keys: [...mirrored.keys()].sort()
    })

    written.forEach((record, key) => {
      const copy = mirrored.get(key)
      if (record === null || typeof record !== 'object') {
        expect({ mirror: name, key, value: copy }).toEqual({ mirror: name, key, value: record })
        return
      }
      Object.entries(record).forEach(([field, value]) => {
        const seen = (copy as Record<string, unknown>)[field]
        expect({ mirror: name, key, field, value: seen }).toEqual({
          mirror: name,
          key,
          field,
          value
        })
      })
    })
  })
}

describe('mirrored writes', () => {
  test('confirming a schedule writes every lesson to the student index too', async () => {
    await confirmSchedule(TEACHER, SEMESTER, 'r1', [
      { studentId: 'ana', locationId: 'l1', scheduledStart: 1, scheduledEnd: 2, timezone: 'UTC' },
      { studentId: 'bob', locationId: 'l1', scheduledStart: 3, scheduledEnd: 4, timezone: 'UTC' }
    ])

    const updates = writtenUpdates()
    expectMirrored(updates)
    // The student's copy has to say where it came from: their index is flat, so without these a
    // lesson could not be traced back to the semester that owns it.
    expect(updates['studentLessons/ana/key-1']).toMatchObject({
      teacherId: TEACHER,
      semesterId: SEMESTER
    })
  })

  test('cancelling writes the record, its mirror, and both copies of the lesson status', async () => {
    await cancelLessons(
      TEACHER,
      SEMESTER,
      [
        { id: 'lesson-a', studentId: 'ana' },
        { id: 'lesson-b', studentId: 'ana' }
      ],
      { canceledBy: 'ana', otherParty: TEACHER, withinWindow: true, makeupOffered: false }
    )

    const updates = writtenUpdates()
    expectMirrored(updates)
    expect(updates['lessonInstances/teachers/t1/semesters/s1/lessons/lesson-a/status']).toBe(
      'canceled'
    )
    expect(updates['studentCancellations/ana/key-1']).toMatchObject({
      lessonId: 'lesson-a',
      studentId: 'ana',
      charged: true
    })
  })

  // The charge is the one field a student has a stake in, and it is decided here rather than at
  // cancellation time — so a waiver that never leaves the teacher's copy is a kindness the
  // student never learns about.
  test('acknowledging reaches the student’s copy as well', async () => {
    await acknowledgeCancellation(TEACHER, SEMESTER, { id: 'c1', studentId: 'ana' }, false)

    const updates = writtenUpdates()
    expectMirrored(updates)
    expect(updates['studentCancellations/ana/c1/charged']).toBe(false)
    expect(updates['studentCancellations/ana/c1/acknowledgmentStatus']).toBe('acknowledged')
  })

  // Deleting is the asymmetric case: the teacher's side goes in one stroke by removing the
  // collection, while every index entry has to be named. Miss one and a student goes on seeing a
  // lesson from a semester that no longer exists.
  test('deleting a semester clears every mirrored entry', async () => {
    stored[paths.lessonsPath(TEACHER, SEMESTER)] = {
      'lesson-a': { studentId: 'ana' },
      'lesson-b': { studentId: 'bob' }
    }
    stored[paths.cancellationsPath(TEACHER, SEMESTER)] = { c1: { studentId: 'ana' } }

    await deleteSemester(TEACHER, SEMESTER)

    const updates = writtenUpdates()
    expect(updates['studentLessons/ana/lesson-a']).toBeNull()
    expect(updates['studentLessons/bob/lesson-b']).toBeNull()
    expect(updates['studentCancellations/ana/c1']).toBeNull()
    // And the teacher's own copies went with them.
    expect(updates[paths.lessonsPath(TEACHER, SEMESTER)]).toBeNull()
    expect(updates[paths.cancellationsPath(TEACHER, SEMESTER)]).toBeNull()
  })
})

// A path and the rule that grants it are written in different files and neither mentions the
// other. A new path with no rules block reads as an empty page in the app and as nothing at all
// here — so check that every root the feature addresses is one the rules know about.
describe('paths and rules', () => {
  test('every scheduling path has a rules block at its root', () => {
    // Read rather than imported: the rules live outside `src`, which CRA will not bundle from.
    const source = readFileSync(join(__dirname, '..', '..', 'database.rules.json'), 'utf8')
    const rules = (JSON.parse(source) as { rules: Record<string, unknown> }).rules

    const roots = new Set(
      Object.values(paths)
        .filter(
          (builder): builder is (...args: string[]) => string => typeof builder === 'function'
        )
        .map((builder) => builder('a', 'b', 'c').split('/')[0])
    )

    expect([...roots].filter((root) => !(root in rules))).toEqual([])
  })
})
