import { get, push, ref, remove, set, update } from 'firebase/database'
import { database } from '../store/Firebase'
import {
  cancellationBundlesPath,
  cancellationRequestsPath,
  cancellationsPath,
  confirmedSchedulePath,
  deletedSemesterPath,
  enrollmentPath,
  enrollmentsPath,
  lessonsPath,
  locationPath,
  locationsPath,
  roundPath,
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
  AvailabilityBlock,
  Location,
  RoundStatus,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  toStoredAvailability,
  WeeklyAvailability
} from './scheduling'

// Writes for the scheduling paths.
//
// Separate from the hooks because reading and writing have different failure modes: a read that
// is denied renders an empty page, a write that is denied loses what the teacher just typed. All
// of these return the promise so the caller can surface that rather than swallow it.
//
// Paths come from schedulingPaths, which the hooks and the security rules also use.

/** The key RTDB generated, which becomes the record's own `id`. */
function newKey(path: string): string {
  const key = push(ref(database, path)).key
  // push() only returns null with no database connection configured at all, which would mean
  // the app is misconfigured rather than offline — offline pushes still generate a key locally.
  if (!key) throw new Error(`Could not generate a key under ${path}`)
  return key
}

export async function createLocation(
  teacherId: string,
  data: Pick<Location, 'name' | 'address'>
): Promise<string> {
  const id = newKey(locationsPath(teacherId))
  await set(ref(database, locationPath(teacherId, id)), {
    ...data,
    id,
    createdAt: Date.now()
  })
  return id
}

export type NewSemester = Pick<
  Semester,
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'defaultCancellationWindowHours'
  | 'dayStartHour'
  | 'dayEndHour'
>

export async function createSemester(
  teacherId: string,
  locationId: string,
  data: NewSemester,
  timezone: string
): Promise<string> {
  const id = newKey(semestersPath(teacherId))
  await set(
    ref(database, semesterPath(teacherId, id)),
    stripUndefined({
      ...data,
      id,
      locationId,
      status: 'draft' as const,
      timezone,
      createdAt: Date.now()
    })
  )
  return id
}

export async function saveTeacherAvailability(
  teacherId: string,
  semesterId: string,
  availability: WeeklyAvailability
): Promise<void> {
  // Written whole rather than merged. The template and the overrides are one document the
  // calendar edits as a unit, and a partial update cannot express "this week's override is
  // gone" — RTDB treats a missing key as "leave it alone", not "delete it".
  await set(
    ref(database, teacherAvailabilityPath(teacherId, semesterId)),
    toStoredAvailability(availability)
  )
}

export async function saveEnrollment(
  teacherId: string,
  semesterId: string,
  enrollment: StudentEnrollment
): Promise<void> {
  // Keyed by student id, so enrolling the same student twice updates rather than duplicates.
  await set(
    ref(database, enrollmentPath(teacherId, semesterId, enrollment.studentId)),
    stripUndefined(enrollment)
  )
}

export async function removeEnrollment(
  teacherId: string,
  semesterId: string,
  studentId: string
): Promise<void> {
  await remove(ref(database, enrollmentPath(teacherId, semesterId, studentId)))
}

export async function updateEnrollments(
  teacherId: string,
  semesterId: string,
  enrollments: StudentEnrollment[]
): Promise<void> {
  const byStudent: Record<string, unknown> = {}
  enrollments.forEach((enrollment) => {
    byStudent[enrollment.studentId] = stripUndefined(enrollment)
  })
  await update(ref(database, enrollmentsPath(teacherId, semesterId)), byStudent)
}

/**
 * RTDB rejects `undefined` outright rather than treating it as absent.
 *
 * Optional fields reach here as `undefined` all the time — a cancellation window left at the
 * semester default, a distribution never chosen — so stripping them is what lets an optional
 * field actually be optional.
 */
function stripUndefined<T extends object>(value: T): Partial<T> {
  const result: Record<string, unknown> = {}
  Object.entries(value).forEach(([key, item]) => {
    if (item !== undefined) result[key] = item
  })
  return result as Partial<T>
}

// ─── Student submissions ──────────────────────────────────────────────────────

/**
 * A student's answer to a round.
 *
 * Written by the student themselves. The rules refuse it once the round stops collecting or the
 * deadline passes, so a late submission fails here rather than quietly corrupting a round the
 * teacher has already acted on — the UI disabling the button is a courtesy, not the guard.
 *
 * Week overrides get the same `savedAt` treatment as the teacher's: an override meaning "away
 * all week" is an empty block list, and RTDB discards empty values outright.
 */
export async function saveSubmission(
  teacherId: string,
  semesterId: string,
  roundId: string,
  studentId: string,
  submission: Pick<StudentSubmission, 'recurringPreferences' | 'weekOverrides'>
): Promise<void> {
  const weekOverrides: Record<string, { blocks: AvailabilityBlock[]; savedAt: number }> = {}
  Object.entries(submission.weekOverrides).forEach(([weekStart, override]) => {
    weekOverrides[weekStart] = { blocks: override.blocks, savedAt: Date.now() }
  })
  await set(ref(database, submissionPath(teacherId, semesterId, roundId, studentId)), {
    studentId,
    status: 'submitted',
    submittedAt: Date.now(),
    recurringPreferences: submission.recurringPreferences,
    weekOverrides
  })
}

// ─── Scheduling rounds ────────────────────────────────────────────────────────

/**
 * Opens a round for a semester.
 *
 * `roundNumber` is handed in rather than derived here: the caller already has the existing
 * rounds on screen, and counting them at write time would need a read that could race with
 * another tab doing the same.
 */
export async function createRound(
  teacherId: string,
  semesterId: string,
  roundNumber: number,
  deadline: number
): Promise<string> {
  const id = newKey(roundsPath(teacherId, semesterId))
  await set(ref(database, roundPath(teacherId, semesterId, id)), {
    id,
    roundNumber,
    status: 'collecting',
    deadline,
    createdAt: Date.now()
  })
  return id
}

/**
 * Moves a round to its next state.
 *
 * Written as a merge rather than a whole record: the round's submissions live under it, and
 * replacing the node would take them with it.
 */
export async function setRoundStatus(
  teacherId: string,
  semesterId: string,
  roundId: string,
  status: RoundStatus
): Promise<void> {
  await update(ref(database, roundPath(teacherId, semesterId, roundId)), { status })
}

// ─── Deleting a semester ──────────────────────────────────────────────────────

/** Everything a semester owns, by the name it is archived under. */
function ownedPaths(teacherId: string, semesterId: string): Record<string, string> {
  return {
    semester: semesterPath(teacherId, semesterId),
    availability: teacherAvailabilityPath(teacherId, semesterId),
    enrollments: enrollmentsPath(teacherId, semesterId),
    rounds: roundsPath(teacherId, semesterId),
    submissions: `studentSubmissions/teachers/${teacherId}/semesters/${semesterId}`,
    suggestions: `scheduleSuggestions/teachers/${teacherId}/semesters/${semesterId}`,
    confirmedSchedule: confirmedSchedulePath(teacherId, semesterId),
    lessons: lessonsPath(teacherId, semesterId),
    cancellations: cancellationsPath(teacherId, semesterId),
    cancellationBundles: cancellationBundlesPath(teacherId, semesterId),
    cancellationRequests: cancellationRequestsPath(teacherId, semesterId)
  }
}

export interface SemesterContents {
  students: number
  lessons: number
  rounds: number
}

/** What a delete would take with it, read live so the confirmation states facts. */
export async function countSemesterContents(
  teacherId: string,
  semesterId: string
): Promise<SemesterContents> {
  const [enrollments, lessons, rounds] = await Promise.all([
    get(ref(database, enrollmentsPath(teacherId, semesterId))),
    get(ref(database, lessonsPath(teacherId, semesterId))),
    get(ref(database, roundsPath(teacherId, semesterId)))
  ])
  const size = (value: unknown): number => Object.keys((value ?? {}) as object).length
  return {
    students: size(enrollments.val()),
    lessons: size(lessons.val()),
    rounds: size(rounds.val())
  }
}

/**
 * Archives a semester and everything it owns, then removes it.
 *
 * Done as one root-level update so the archive and the removal cannot half-happen: a crash
 * between them would otherwise leave a semester that is gone from the teacher's list but still
 * feeding lessons to its students.
 *
 * The per-student lesson index is the reason this is more than deleting a subtree. It is keyed
 * by student rather than by semester, so its entries have to be removed one at a time — miss
 * them and a student goes on seeing lessons for a semester that no longer exists.
 *
 * Those entries are derived from the lessons rather than read back from the index, because a
 * teacher cannot read the index: the rule granting them a lesson is declared on the entry, and
 * a grant on a child does not grant listing its parent. The lesson id is the index key, so the
 * lessons already fetched say everything needed. Step O must keep writing them that way.
 */
export async function deleteSemester(teacherId: string, semesterId: string): Promise<void> {
  const owned = ownedPaths(teacherId, semesterId)
  const archive = deletedSemesterPath(teacherId, semesterId)

  const snapshots = await Promise.all(
    Object.values(owned).map(async (path) => await get(ref(database, path)))
  )

  const updates: Record<string, unknown> = { [`${archive}/deletedAt`]: Date.now() }
  Object.keys(owned).forEach((name, index) => {
    const value = snapshots[index].val()
    // A path that holds nothing needs neither archiving nor removing; writing null for it would
    // be harmless but writing undefined is rejected outright, so skip rather than special-case.
    if (value === null) return
    updates[`${archive}/${name}`] = value
    updates[owned[name]] = null
  })

  // The index entries to clear, taken from the lessons themselves. Not archived separately:
  // the index is a mirror, and the lessons it mirrors are archived above.
  const lessonsValue = snapshots[Object.keys(owned).indexOf('lessons')].val()
  const lessons = (lessonsValue ?? {}) as Record<string, { studentId?: string }>
  Object.entries(lessons).forEach(([lessonId, lesson]) => {
    if (!lesson?.studentId) return
    updates[`${studentLessonsPath(lesson.studentId)}/${lessonId}`] = null
  })

  await update(ref(database), updates)
}
