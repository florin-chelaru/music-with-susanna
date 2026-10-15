// Every RTDB path the scheduling feature touches, in one place.
//
// Reads and writes have to agree exactly, and the security rules are written against these same
// strings — a path typo is not a compile error, it is a permission denial at best and a write
// into a node nothing reads at worst. Building them here means the hook and the write that
// disagree cannot exist.
//
// Each path mirrors a block in database.rules.json; keep the two in step.

const T = 'teachers'

export const locationsPath = (tid: string): string => `locations/${T}/${tid}`
export const locationPath = (tid: string, lid: string): string => `${locationsPath(tid)}/${lid}`

export const semestersPath = (tid: string): string => `semesters/${T}/${tid}`
export const semesterPath = (tid: string, sid: string): string => `${semestersPath(tid)}/${sid}`

export const teacherAvailabilityPath = (tid: string, sid: string): string =>
  `teacherAvailability/${T}/${tid}/semesters/${sid}`

export const enrollmentsPath = (tid: string, sid: string): string =>
  `studentEnrollments/${T}/${tid}/semesters/${sid}/students`
export const enrollmentPath = (tid: string, sid: string, uid: string): string =>
  `${enrollmentsPath(tid, sid)}/${uid}`

export const roundsPath = (tid: string, sid: string): string =>
  `schedulingRounds/${T}/${tid}/semesters/${sid}/rounds`
export const roundPath = (tid: string, sid: string, rid: string): string =>
  `${roundsPath(tid, sid)}/${rid}`

export const submissionsPath = (tid: string, sid: string, rid: string): string =>
  `studentSubmissions/${T}/${tid}/semesters/${sid}/rounds/${rid}/students`
export const submissionPath = (tid: string, sid: string, rid: string, uid: string): string =>
  `${submissionsPath(tid, sid, rid)}/${uid}`

/** Every round's submissions at once, which is how the teacher sees who has answered what. */
export const allSubmissionsPath = (tid: string, sid: string): string =>
  `studentSubmissions/${T}/${tid}/semesters/${sid}/rounds`

/**
 * What the teacher has left for one round, as the students in it should see it.
 *
 * Its own node rather than a field on the round: the student schedule page subscribes to every
 * round of every semester they are enrolled in, and a term's worth of free/busy on each would be
 * paid for on every page load. This is read only when a student opens the round itself.
 */
export const roundCapacityPath = (tid: string, sid: string, rid: string): string =>
  `roundCapacity/${T}/${tid}/semesters/${sid}/rounds/${rid}`

export const suggestionsPath = (tid: string, sid: string, rid: string): string =>
  `scheduleSuggestions/${T}/${tid}/semesters/${sid}/rounds/${rid}`

export const confirmedSchedulePath = (tid: string, sid: string): string =>
  `confirmedSchedules/${T}/${tid}/semesters/${sid}`

/**
 * One round's confirmation, not one semester's.
 *
 * Keyed per round because a semester can be scheduled more than once — a partial round for a
 * student who joined late settles only them, and must not overwrite the account of the round
 * that settled everyone else.
 */
export const confirmedRoundPath = (tid: string, sid: string, rid: string): string =>
  `${confirmedSchedulePath(tid, sid)}/rounds/${rid}`

export const lessonsPath = (tid: string, sid: string): string =>
  `lessonInstances/${T}/${tid}/semesters/${sid}/lessons`
export const lessonPath = (tid: string, sid: string, lid: string): string =>
  `${lessonsPath(tid, sid)}/${lid}`

/**
 * The student-readable mirror of a lesson.
 *
 * Not a convenience: the rules grant a student read on a lesson by `studentId`, and RTDB cannot
 * turn that into a listable query, so this index is the only way a student can discover their
 * own lessons. Every write to `lessonPath` needs the matching write here.
 */
export const studentLessonsPath = (uid: string): string => `studentLessons/${uid}`
export const studentLessonPath = (uid: string, lid: string): string =>
  `${studentLessonsPath(uid)}/${lid}`

export const cancellationsPath = (tid: string, sid: string): string =>
  `cancellations/${T}/${tid}/semesters/${sid}`

/**
 * The student-readable mirror of a cancellation, for the same reason as `studentLessonsPath`.
 *
 * The teacher's record is readable by the student it names, but only one at a time and only once
 * they know the id — and the ids live under the teacher, which a student cannot list. A blanket
 * listing grant there is not an option either: one semester's cancellations hold every student's,
 * reasons included. So each record is written twice, and the student lists their own copy.
 *
 * Every write to `cancellationsPath` needs the matching write here. `schedulingWrites.test.ts`
 * holds that to account.
 */
export const studentCancellationsPath = (uid: string): string => `studentCancellations/${uid}`
export const studentCancellationPath = (uid: string, cid: string): string =>
  `${studentCancellationsPath(uid)}/${cid}`
export const cancellationBundlesPath = (tid: string, sid: string): string =>
  `cancellationBundles/${T}/${tid}/semesters/${sid}`
export const cancellationRequestsPath = (tid: string, sid: string): string =>
  `cancellationRequests/${T}/${tid}/semesters/${sid}`

export const notificationsPath = (tid: string): string => `notifications/${T}/${tid}`

/** The teacher's own students, from the mapping that predates this feature. */
export const teacherStudentsPath = (tid: string): string => `${T}/${tid}/students`

/**
 * One user record.
 *
 * Only ever one: the rule granting a read is declared at `users/$uid`, and a grant on a child
 * does not grant its parent, so the `users` collection itself cannot be listed. Anything needing
 * several records reads them one at a time, which is what the students page has always done.
 */
export const userPath = (uid: string): string => `users/${uid}`

/** The teachers a student belongs to, from the mapping that predates this feature. */
export const studentTeachersPath = (uid: string): string => `students/${uid}/teachers`

/**
 * The language to write to someone in.
 *
 * Its own node rather than a field on the user record: `users/$uid` validates that the record it
 * is given has `role === 'student'`, and a teacher saving their own language must not have to
 * satisfy a rule about students.
 */
export const userLocalePath = (uid: string): string => `userLocales/${uid}`

/**
 * Where a deleted semester and everything it owned is archived.
 *
 * Deletes in this repo are always soft — the homework, resources, videos and posts paths all do
 * the same copy-then-remove — so a semester deleted by mistake is still recoverable from the
 * console even though the app offers no way back.
 */
export const deletedSemesterPath = (tid: string, sid: string): string =>
  `deleted/scheduling/${T}/${tid}/semesters/${sid}`
