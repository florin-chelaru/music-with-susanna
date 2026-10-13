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

export const suggestionsPath = (tid: string, sid: string, rid: string): string =>
  `scheduleSuggestions/${T}/${tid}/semesters/${sid}/rounds/${rid}`

export const confirmedSchedulePath = (tid: string, sid: string): string =>
  `confirmedSchedules/${T}/${tid}/semesters/${sid}`

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
export const cancellationBundlesPath = (tid: string, sid: string): string =>
  `cancellationBundles/${T}/${tid}/semesters/${sid}`
export const cancellationRequestsPath = (tid: string, sid: string): string =>
  `cancellationRequests/${T}/${tid}/semesters/${sid}`

export const notificationsPath = (tid: string): string => `notifications/${T}/${tid}`

/** The teacher's own students, from the mapping that predates this feature. */
export const teacherStudentsPath = (tid: string): string => `${T}/${tid}/students`
