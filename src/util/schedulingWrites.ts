import { get, push, ref, remove, serverTimestamp, set, update } from 'firebase/database'
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
  lessonPath,
  roundPath,
  roundsPath,
  semesterPath,
  semestersPath,
  studentCancellationPath,
  studentCancellationsPath,
  studentLessonPath,
  studentLessonsPath,
  submissionPath,
  submissionsPath,
  suggestionsPath,
  teacherAvailabilityPath
} from './schedulingPaths'
import {
  AvailabilityBlock,
  Cancellation,
  Location,
  RoundStatus,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  toStoredAvailability,
  WeeklyAvailability,
  weightBandKey
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
  deadline: number,
  carryFromRoundId?: string
): Promise<string> {
  const id = newKey(roundsPath(teacherId, semesterId))
  const updates: Record<string, unknown> = {
    [roundPath(teacherId, semesterId, id)]: {
      id,
      roundNumber,
      status: 'collecting',
      deadline,
      createdAt: Date.now()
    }
  }

  // Students amend rather than re-enter: the new round starts from what each of them said last
  // time, reset to pending so the teacher can still see who has actually confirmed it.
  if (carryFromRoundId) {
    const previous = await get(
      ref(database, submissionsPath(teacherId, semesterId, carryFromRoundId))
    )
    const answers = (previous.val() ?? {}) as Record<string, StudentSubmission>
    Object.entries(answers).forEach(([studentId, answer]) => {
      updates[submissionPath(teacherId, semesterId, id, studentId)] = stripUndefined({
        studentId,
        status: 'pending' as const,
        recurringPreferences: answer.recurringPreferences ?? [],
        weekOverrides: answer.weekOverrides ?? {},
        carriedForward: true
      })
    })
  }

  await update(ref(database), updates)
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

// ─── Closing a round ──────────────────────────────────────────────────────────

/**
 * Writes down the schedules the solver found, and closes the round to further submissions.
 *
 * Stored rather than recomputed per render. The solver reads the teacher's availability and the
 * students' submissions, both of which keep changing — so a page that recomputed would show the
 * teacher different cards each time they looked, and could change the one they were halfway
 * through choosing. Once written, the options are a fact about a moment.
 *
 * Keyed by weight band, which is what a card *is*. The old scheme keyed them by strategy, from
 * when there were three fixed ones.
 */
export async function closeRoundWithSuggestions(
  teacherId: string,
  semesterId: string,
  roundId: string,
  suggestions: Array<{ weightFrom: number; weightTo: number }>
): Promise<void> {
  const stored: Record<string, unknown> = {}
  suggestions.forEach((suggestion) => {
    stored[weightBandKey(suggestion.weightFrom, suggestion.weightTo)] = stripUndefined(suggestion)
  })
  await update(ref(database), {
    [suggestionsPath(teacherId, semesterId, roundId)]: stored,
    [`${roundPath(teacherId, semesterId, roundId)}/status`]: 'suggested'
  })
}

/**
 * Gives up on a round without destroying it.
 *
 * The submissions stay where they are: the point of abandoning rather than deleting is that the
 * next round can be seeded from them. The stored suggestions stay too — they are what was
 * rejected, and keeping them costs nothing.
 */
export async function abandonRound(
  teacherId: string,
  semesterId: string,
  roundId: string,
  currentStatus: RoundStatus
): Promise<void> {
  await update(ref(database, roundPath(teacherId, semesterId, roundId)), {
    status: 'abandoned',
    abandonedAt: Date.now(),
    // Recorded rather than inferred on the way back. A round abandoned while still collecting
    // and one abandoned after its suggestions were seen return to different places, and guessing
    // from whether suggestions exist would be a guess that is usually right.
    abandonedFrom: currentStatus
  })
}

/**
 * Puts an abandoned round back where it was.
 *
 * For a teacher who ran a second round and liked the first one better. The round still holds its
 * submissions and its suggestions, so there is nothing to rebuild — only the status to restore.
 */
export async function reviveRound(
  teacherId: string,
  semesterId: string,
  roundId: string,
  status: RoundStatus
): Promise<void> {
  await update(ref(database, roundPath(teacherId, semesterId, roundId)), {
    status,
    abandonedAt: null,
    abandonedFrom: null
  })
}

/** What a round delete would take with it, read live so the confirmation states facts. */
export async function countRoundSubmissions(
  teacherId: string,
  semesterId: string,
  roundId: string
): Promise<number> {
  const snapshot = await get(ref(database, submissionsPath(teacherId, semesterId, roundId)))
  return Object.keys((snapshot.val() ?? {}) as object).length
}

/**
 * Archives a round with its submissions and suggestions, then removes it.
 *
 * For a round opened by mistake. A finalized round is refused by the caller, not here: its
 * lessons exist and are being taught, and deleting the round that produced them would leave
 * them with no account of where they came from.
 *
 * Archived under `deletedRounds` rather than `rounds`, because deleting the whole semester later
 * writes the live `rounds` node to `${archive}/rounds` — which would overwrite anything already
 * filed there.
 */
export async function deleteRound(
  teacherId: string,
  semesterId: string,
  roundId: string
): Promise<void> {
  const owned = {
    round: roundPath(teacherId, semesterId, roundId),
    submissions: submissionsPath(teacherId, semesterId, roundId),
    suggestions: suggestionsPath(teacherId, semesterId, roundId)
  }
  const archive = `${deletedSemesterPath(teacherId, semesterId)}/deletedRounds/${roundId}`

  const snapshots = await Promise.all(
    Object.values(owned).map(async (path) => await get(ref(database, path)))
  )

  const updates: Record<string, unknown> = { [`${archive}/deletedAt`]: Date.now() }
  Object.keys(owned).forEach((name, index) => {
    const value = snapshots[index].val()
    if (value === null) return
    updates[`${archive}/${name}`] = value
    updates[owned[name as keyof typeof owned]] = null
  })

  await update(ref(database), updates)
}

// ─── Confirming a schedule ────────────────────────────────────────────────────

/** A lesson about to be created, before it has an id. */
export interface PlannedLesson {
  studentId: string
  locationId: string
  scheduledStart: number
  scheduledEnd: number
  timezone: string
}

/**
 * Confirms a schedule and creates every lesson in it.
 *
 * One root-level update, like the semester delete: a term half-created would leave students
 * holding lessons their teacher cannot see, and no way to tell that had happened.
 *
 * **Each lesson is written twice** — under the teacher's semester, and into the student's own
 * index at the same id. The index is the only path by which a student can discover their
 * lessons, since the rules grant those per lesson by `studentId` and RTDB cannot turn that into
 * a query; and `deleteSemester` clears the index by that id without reading it. Anything that
 * later moves or cancels a lesson has to touch both.
 */
export async function confirmSchedule(
  teacherId: string,
  semesterId: string,
  roundId: string,
  lessons: PlannedLesson[]
): Promise<void> {
  const updates: Record<string, unknown> = {
    [confirmedSchedulePath(teacherId, semesterId)]: {
      roundId,
      confirmedAt: Date.now(),
      lessonCount: lessons.length
    },
    [`${roundPath(teacherId, semesterId, roundId)}/status`]: 'finalized',
    [`${semesterPath(teacherId, semesterId)}/status`]: 'active'
  }

  lessons.forEach((lesson) => {
    const id = newKey(lessonsPath(teacherId, semesterId))
    const record = {
      ...lesson,
      id,
      status: 'scheduled' as const,
      isAdHoc: false,
      isMakeup: false,
      calendarSequence: 0,
      createdAt: Date.now()
    }
    updates[lessonPath(teacherId, semesterId, id)] = record
    // The student's copy carries the teacher and semester it belongs to: their index is flat,
    // so without them a student's lesson could not be traced back to where it lives.
    updates[studentLessonPath(lesson.studentId, id)] = { ...record, teacherId, semesterId }
  })

  await update(ref(database), updates)
}

// ─── Cancelling lessons ───────────────────────────────────────────────────────

export interface CancellableLesson {
  id: string
  studentId: string
}

export interface CancellationDetails {
  /** uid of whoever pressed cancel. */
  canceledBy: string
  /** The uid on the other side, stored outright so a read rule needs no join. */
  otherParty: string
  withinWindow: boolean
  makeupOffered: boolean
  reason?: string
}

/**
 * Cancels one lesson, or a lesson and everything after it, in a single update.
 *
 * Each lesson is touched in **four** places: the cancellation record and its student-side mirror,
 * and the lesson marked canceled in both `lessonInstances` and the student's lesson index. A
 * student may write only that one status field, and only from `scheduled` to `canceled`, which is
 * what lets them cancel at all without a server.
 *
 * `canceledAt` is the server's clock, not the caller's. The rules demand it of a student, because
 * whether a cancellation was late is the one fact the teacher's judgement rests on and the one
 * thing rules can check. Writing `Date.now()` here would be rejected — and should be.
 */
export async function cancelLessons(
  teacherId: string,
  semesterId: string,
  lessons: CancellableLesson[],
  details: CancellationDetails
): Promise<void> {
  const updates: Record<string, unknown> = {}

  lessons.forEach((lesson) => {
    const id = newKey(cancellationsPath(teacherId, semesterId))
    const record = stripUndefined({
      id,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      canceledBy: details.canceledBy,
      otherParty: details.otherParty,
      canceledAt: serverTimestamp(),
      withinWindow: details.withinWindow,
      // Inside the window the lesson is charged and no makeup is offered; outside it, neither.
      charged: details.withinWindow,
      makeupOffered: details.makeupOffered,
      acknowledgmentStatus: 'pending' as const,
      reason: details.reason
    })
    updates[`${cancellationsPath(teacherId, semesterId)}/${id}`] = record
    // The student's copy carries the teacher and semester, like their lessons do: their index is
    // flat, so without them a cancellation could not be traced back to the record it mirrors.
    updates[studentCancellationPath(lesson.studentId, id)] = { ...record, teacherId, semesterId }
    updates[`${lessonPath(teacherId, semesterId, lesson.id)}/status`] = 'canceled'
    updates[`${studentLessonPath(lesson.studentId, lesson.id)}/status`] = 'canceled'
  })

  await update(ref(database), updates)
}

/**
 * The teacher's reply to a cancellation: seen, and whether it is charged after all.
 *
 * `charged` is decided here rather than at cancellation time. The window rule says what happens
 * by default, but a teacher who reads "my daughter has a temperature" can waive it — and the
 * record should say what was actually decided, not what the rule would have said.
 *
 * Which is exactly why this has to reach the student's mirror as well. The charge is the part of
 * a cancellation they care about, and a waived one that never leaves the teacher's copy is a
 * kindness the student never learns about.
 */
export async function acknowledgeCancellation(
  teacherId: string,
  semesterId: string,
  cancellation: Pick<Cancellation, 'id' | 'studentId'>,
  charged: boolean
): Promise<void> {
  const reply = {
    acknowledgmentStatus: 'acknowledged' as const,
    acknowledgmentAt: Date.now(),
    charged
  }
  await update(ref(database), {
    ...prefixed(`${cancellationsPath(teacherId, semesterId)}/${cancellation.id}`, reply),
    ...prefixed(studentCancellationPath(cancellation.studentId, cancellation.id), reply)
  })
}

/**
 * The fields of a merge, rewritten as root-relative paths.
 *
 * A merge into one node is an `update()` on that node; a merge into two is an `update()` at the
 * root, which takes whole paths. Spelling those out by hand is how a mirror ends up with one
 * field fewer than the record it mirrors.
 */
function prefixed(path: string, fields: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  Object.entries(fields).forEach(([key, value]) => {
    updates[`${path}/${key}`] = value
  })
  return updates
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
 * The per-student indexes are the reason this is more than deleting a subtree. Both are keyed by
 * student rather than by semester, so their entries have to be removed one at a time — miss them
 * and a student goes on seeing lessons and cancellations for a semester that no longer exists.
 *
 * Those entries are derived from the records rather than read back from the indexes, because a
 * teacher cannot read either one: the rule granting them an entry is declared on the entry, and
 * a grant on a child does not grant listing its parent. Each record's id is its index key, so the
 * snapshots already fetched say everything needed.
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

  // The mirrored entries to clear, taken from the records themselves. Not archived separately:
  // an index is a mirror, and everything it mirrors is archived above.
  //
  // Both mirrors are keyed by the record's own id and addressed by its `studentId`, so the
  // snapshots already say everything needed. A third mirror belongs in this table.
  const mirrors: Array<[string, (uid: string) => string]> = [
    ['lessons', studentLessonsPath],
    ['cancellations', studentCancellationsPath]
  ]
  mirrors.forEach(([name, indexPath]) => {
    const value = snapshots[Object.keys(owned).indexOf(name)].val()
    const records = (value ?? {}) as Record<string, { studentId?: string }>
    Object.entries(records).forEach(([id, record]) => {
      if (!record?.studentId) return
      updates[`${indexPath(record.studentId)}/${id}`] = null
    })
  })

  await update(ref(database), updates)
}
