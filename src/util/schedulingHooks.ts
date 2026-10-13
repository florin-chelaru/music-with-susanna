import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
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
  submissionPath,
  submissionsPath,
  suggestionsPath,
  teacherAvailabilityPath
} from './schedulingPaths'
import {
  Cancellation,
  ConfirmedSchedule,
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
  const values = value ? Object.entries(value).map(([id, item]) => ({ ...item, id })) : []
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
  return { availability: value, loading }
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
