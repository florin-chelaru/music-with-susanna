import { get, onValue, ref, Unsubscribe } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { database } from '../store/Firebase'
import {
  cancellationsPath,
  confirmedSchedulePath,
  enrollmentsPath,
  lessonsPath,
  locationsPath,
  notificationsPath,
  roundsPath,
  semesterPath,
  semestersPath,
  studentLessonsPath,
  studentTeachersPath,
  submissionPath,
  teacherStudentsPath,
  submissionsPath,
  suggestionsPath,
  teacherAvailabilityPath,
  userPath
} from './schedulingPaths'
import {
  Cancellation,
  ConfirmedSchedule,
  fromStoredAvailability,
  LessonInstance,
  Location,
  ScheduleSuggestion,
  SchedulingNotification,
  SchedulingRound,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  WeeklyAvailability
} from './scheduling'

// Live reads for the scheduling paths.
//
// One hook per subscription, each a thin wrapper over `onValue`. The paths mirror the security
// rules exactly: a hook that reads a path the rules do not grant fails at runtime with a
// permission error rather than at compile time, so the two are written to be read side by side.
//
// Every hook returns `loading` so a caller can tell "no data yet" from "no data" — a distinction
// that matters here, since an empty semester and an unloaded one look identical otherwise.

/** Null ids are legitimate — a page renders before its route params resolve — and mean "wait". */
type Id = string | null | undefined

function useNode<T>(path: string | null): { value: T | null; loading: boolean } {
  const [value, setValue] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) {
      setValue(null)
      setLoading(false)
      return
    }
    setLoading(true)
    // onValue returns its own unsubscribe, which is what the effect cleans up with. Returning it
    // directly rather than wrapping keeps the subscription and its teardown impossible to
    // separate when someone later edits the body.
    return onValue(ref(database, path), (snap) => {
      setValue((snap.val() as T | null) ?? null)
      setLoading(false)
    })
  }, [path])

  return { value, loading }
}

/**
 * Several nodes at once, when the count is not known until the data arrives.
 *
 * A student belongs to one or two teachers, each with some semesters, and nothing can be read
 * until the previous read says what to ask for. Hooks cannot be called in a loop, so the
 * subscriptions are managed by hand here and torn down together.
 */
function useNodes(paths: string[]): { values: Record<string, unknown>; loading: boolean } {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  // Compared as a string: the array is rebuilt by the caller on every render, so depending on
  // its identity would tear down and recreate every listener each time.
  const key = paths.join('|')

  useEffect(() => {
    const list = key ? key.split('|') : []
    if (list.length === 0) {
      setValues({})
      setLoading(false)
      return
    }
    setLoading(true)
    const seen = new Set<string>()
    const unsubscribes: Unsubscribe[] = list.map((path) =>
      onValue(ref(database, path), (snap) => {
        setValues((previous) => ({ ...previous, [path]: snap.val() }))
        seen.add(path)
        // Loaded when every path has answered once, not when the first does — otherwise the
        // page renders "nothing here" while half the reads are still outstanding.
        if (seen.size === list.length) setLoading(false)
      })
    )
    return () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe()
      })
    }
  }, [key])

  return { values, loading }
}

/**
 * The same subscription, read as a list.
 *
 * RTDB stores collections as objects keyed by id, and every caller wants an array with the key
 * folded in as `id`. Doing that in one place stops each page inventing its own `Object.entries`
 * dance and disagreeing about whether the key or a stored `id` field wins.
 */
function useCollection<T>(path: string | null): {
  values: Array<T & { id: string }>
  loading: boolean
} {
  const { value, loading } = useNode<Record<string, T>>(path)
  // Memoised on the snapshot, not rebuilt per render. A new array identity every render makes
  // every caller's dependency array meaningless, and any effect that syncs from one of these
  // loops forever.
  const values = useMemo(
    () => (value ? Object.entries(value).map(([id, item]) => ({ ...item, id })) : []),
    [value]
  )
  return { values, loading }
}

// ─── Teacher-scoped ───────────────────────────────────────────────────────────

export function useLocations(teacherId: Id) {
  const { values, loading } = useCollection<Location>(teacherId ? locationsPath(teacherId) : null)
  return { locations: values, loading }
}

export function useSemesters(teacherId: Id) {
  const { values, loading } = useCollection<Semester>(teacherId ? semestersPath(teacherId) : null)
  return { semesters: values, loading }
}

export function useSemester(teacherId: Id, semesterId: Id) {
  const { value, loading } = useNode<Semester>(
    teacherId && semesterId ? semesterPath(teacherId, semesterId) : null
  )
  return { semester: value, loading }
}

export function useTeacherAvailability(teacherId: Id, semesterId: Id) {
  const { value, loading } = useNode<WeeklyAvailability>(
    teacherId && semesterId ? teacherAvailabilityPath(teacherId, semesterId) : null
  )
  // Normalised here rather than in each page: RTDB drops empty objects and arrays, so a teacher
  // with no overrides reads back with no `weekOverrides` key and every consumer would otherwise
  // have to defend against it. Memoised for the reason above — normalising returns a new object,
  // which without this fires the page's sync effect on every render.
  const availability = useMemo(() => (value ? fromStoredAvailability(value) : null), [value])
  return { availability, loading }
}

export function useStudentEnrollments(teacherId: Id, semesterId: Id) {
  const { values, loading } = useCollection<StudentEnrollment>(
    teacherId && semesterId ? enrollmentsPath(teacherId, semesterId) : null
  )
  return { enrollments: values, loading }
}

export function useSchedulingRounds(teacherId: Id, semesterId: Id) {
  const { values, loading } = useCollection<SchedulingRound>(
    teacherId && semesterId ? roundsPath(teacherId, semesterId) : null
  )
  return { rounds: values, loading }
}

export function useStudentSubmissions(teacherId: Id, semesterId: Id, roundId: Id) {
  const { value, loading } = useNode<Record<string, StudentSubmission>>(
    teacherId && semesterId && roundId ? submissionsPath(teacherId, semesterId, roundId) : null
  )
  return { submissions: value ?? {}, loading }
}

/**
 * The schedules the solver produced for a round, keyed by the weight band that produced each.
 *
 * Not keyed by strategy: the three fixed strategies are gone, and the weight sweep yields
 * however many distinct schedules genuinely exist — which is a different number per round.
 */
export function useScheduleSuggestions(teacherId: Id, semesterId: Id, roundId: Id) {
  const { value, loading } = useNode<Record<string, ScheduleSuggestion>>(
    teacherId && semesterId && roundId ? suggestionsPath(teacherId, semesterId, roundId) : null
  )
  return { suggestions: value ?? {}, loading }
}

export function useConfirmedSchedule(teacherId: Id, semesterId: Id) {
  const { value, loading } = useNode<ConfirmedSchedule>(
    teacherId && semesterId ? confirmedSchedulePath(teacherId, semesterId) : null
  )
  return { schedule: value, loading }
}

export function useLessonInstances(teacherId: Id, semesterId: Id) {
  const { values, loading } = useCollection<LessonInstance>(
    teacherId && semesterId ? lessonsPath(teacherId, semesterId) : null
  )
  return { lessons: values, loading }
}

export function useCancellations(teacherId: Id, semesterId: Id) {
  const { values, loading } = useCollection<Cancellation>(
    teacherId && semesterId ? cancellationsPath(teacherId, semesterId) : null
  )
  return { cancellations: values, loading }
}

// ─── Student-scoped ───────────────────────────────────────────────────────────

export function useMySubmission(teacherId: Id, semesterId: Id, roundId: Id, studentId: Id) {
  const { value, loading } = useNode<StudentSubmission>(
    teacherId && semesterId && roundId && studentId
      ? submissionPath(teacherId, semesterId, roundId, studentId)
      : null
  )
  return { submission: value, loading }
}

/**
 * A student's own lessons, from the index rather than from `lessonInstances`.
 *
 * The rules grant a student read on a lesson whose `studentId` matches them, and RTDB cannot
 * turn a per-node condition into a listable query — a student can read a lesson they already
 * know the id of, and cannot discover which ids those are. So the teacher mirrors each lesson
 * into `/studentLessons/{uid}`, which the student can read whole. The index is the only path a
 * student reads for lessons; `lessonInstances` stays the teacher's source of truth.
 */
export function useMyLessons(studentId: Id) {
  const { values, loading } = useCollection<
    LessonInstance & { teacherId: string; semesterId: string }
  >(studentId ? studentLessonsPath(studentId) : null)
  return { lessons: values, loading }
}

export function useMyNotifications(teacherId: Id, studentId: Id) {
  const { values, loading } = useCollection<SchedulingNotification>(
    teacherId ? notificationsPath(teacherId) : null
  )
  return {
    // The rules allow a student to read only their own notification nodes, so a teacher's
    // subscription returns everything and a student's returns theirs; filtering here keeps the
    // caller from having to know which of the two it is.
    notifications: studentId ? values.filter((n) => n.recipientId === studentId) : values,
    loading
  }
}

// ─── Directory ────────────────────────────────────────────────────────────────

/**
 * The teacher's own students, with the names to show them by.
 *
 * Deliberately not every account with role 'student'. The studio has two teachers, and thirteen
 * student accounts belong to neither — listing all of them would let one teacher enroll the
 * other's students and bury the real ones. `/teachers/{tid}/students` is the mapping that
 * predates this feature and already answers the question.
 *
 * The values under that mapping are empty strings: it is a set of ids, so the names come from
 * `/users`, which any signed-in user may read.
 */
export function useTeacherStudents(teacherId: Id) {
  const { value: ids, loading: idsLoading } = useNode<Record<string, unknown>>(
    teacherId ? teacherStudentsPath(teacherId) : null
  )
  const [students, setStudents] = useState<Record<string, { name: string; email: string }>>({})
  const [loading, setLoading] = useState(true)

  // A string rather than the object, so the effect re-runs when the set of students changes and
  // not merely when a new snapshot arrives carrying the same ids.
  const idList = Object.keys(ids ?? {})
    .sort()
    .join(',')

  useEffect(() => {
    const uids = idList ? idList.split(',') : []
    if (uids.length === 0) {
      setStudents({})
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all(
      uids.map(async (uid) => [uid, (await get(ref(database, userPath(uid)))).val()] as const)
    ).then((entries) => {
      if (cancelled) return
      const directory: Record<string, { name: string; email: string }> = {}
      entries.forEach(([uid, record]) => {
        const user = record as { name?: string; email?: string } | null
        // An id with no user record is a dangling mapping, not a student — offering the raw uid
        // in a dropdown would be worse than leaving it out.
        if (user) directory[uid] = { name: user.name ?? uid, email: user.email ?? '' }
      })
      setStudents(directory)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [idList])

  return { students, loading: idsLoading || loading }
}

// ─── A student's own view ─────────────────────────────────────────────────────

export interface EnrolledSemester {
  teacherId: string
  semester: Semester
  rounds: SchedulingRound[]
}

/**
 * Every semester a student is enrolled in, with that semester's rounds.
 *
 * Assembled in three waves, because each read says what to ask for next: the teachers a student
 * belongs to, then each teacher's semesters, then each semester's rounds and this student's own
 * enrollment in it.
 *
 * The enrollment read is what makes it *their* semesters rather than the teacher's. A student
 * may list a teacher's terms, but being listed is not being enrolled — only an enrollment record
 * naming them says they belong in one.
 */
export function useMyEnrolledSemesters(studentId: Id): {
  semesters: EnrolledSemester[]
  loading: boolean
} {
  const { value: teacherMap, loading: teachersLoading } = useNode<Record<string, unknown>>(
    studentId ? studentTeachersPath(studentId) : null
  )
  const teacherIds = useMemo(() => Object.keys(teacherMap ?? {}).sort(), [teacherMap])

  const { values: semesterLists, loading: semestersLoading } = useNodes(
    teacherIds.map((tid) => semestersPath(tid))
  )

  // Flattened to (teacher, semester) pairs before anything else is asked for.
  const pairs = useMemo(() => {
    const found: Array<{ teacherId: string; semester: Semester }> = []
    teacherIds.forEach((teacherId) => {
      const list = (semesterLists[semestersPath(teacherId)] ?? {}) as Record<string, Semester>
      Object.entries(list).forEach(([id, semester]) => {
        found.push({ teacherId, semester: { ...semester, id } })
      })
    })
    return found
  }, [teacherIds, semesterLists])

  const { values: extra, loading: extraLoading } = useNodes(
    pairs.flatMap(({ teacherId, semester }) => [
      roundsPath(teacherId, semester.id),
      studentId ? `${enrollmentsPath(teacherId, semester.id)}/${studentId}` : ''
    ])
  )

  const semesters = useMemo(
    () =>
      pairs
        .filter(({ teacherId, semester }) =>
          Boolean(extra[`${enrollmentsPath(teacherId, semester.id)}/${studentId ?? ''}`])
        )
        .map(({ teacherId, semester }) => {
          const rounds = (extra[roundsPath(teacherId, semester.id)] ?? {}) as Record<
            string,
            SchedulingRound
          >
          return {
            teacherId,
            semester,
            rounds: Object.entries(rounds).map(([id, round]) => ({ ...round, id }))
          }
        }),
    [pairs, extra, studentId]
  )

  return {
    semesters,
    loading: teachersLoading || semestersLoading || extraLoading
  }
}

/**
 * The names and subjects of a student's teachers.
 *
 * Read one record at a time, like every other directory here: the grant on `users` is declared
 * at `$uid`, so the collection cannot be listed.
 */
export function useMyTeachers(studentId: Id) {
  const { value: teacherMap } = useNode<Record<string, unknown>>(
    studentId ? studentTeachersPath(studentId) : null
  )
  const [teachers, setTeachers] = useState<Record<string, { name: string; subject: string }>>({})

  const idList = Object.keys(teacherMap ?? {})
    .sort()
    .join(',')

  useEffect(() => {
    const ids = idList ? idList.split(',') : []
    if (ids.length === 0) {
      setTeachers({})
      return
    }
    let cancelled = false
    void Promise.all(
      ids.map(async (uid) => [uid, (await get(ref(database, userPath(uid)))).val()] as const)
    ).then((entries) => {
      if (cancelled) return
      const directory: Record<string, { name: string; subject: string }> = {}
      entries.forEach(([uid, record]) => {
        const user = record as { name?: string; subject?: string } | null
        if (user) directory[uid] = { name: user.name ?? uid, subject: user.subject ?? '' }
      })
      setTeachers(directory)
    })
    return () => {
      cancelled = true
    }
  }, [idList])

  return { teachers }
}

/**
 * Which of these rounds the student has already answered.
 *
 * Their own submission is the only one they may read, which is exactly what this needs — the
 * question is "have I replied?", not "who else has".
 */
export function useMySubmittedRounds(
  studentId: Id,
  rounds: Array<{ teacherId: string; semesterId: string; roundId: string }>
): string[] {
  const { values } = useNodes(
    studentId
      ? rounds.map(({ teacherId, semesterId, roundId }) =>
          submissionPath(teacherId, semesterId, roundId, studentId)
        )
      : []
  )

  return useMemo(() => {
    if (!studentId) return []
    return rounds
      .filter(({ teacherId, semesterId, roundId }) => {
        const submission = values[
          submissionPath(teacherId, semesterId, roundId, studentId)
        ] as StudentSubmission | null
        return submission?.status === 'submitted'
      })
      .map(({ roundId }) => roundId)
  }, [rounds, values, studentId])
}
