import { push, ref, remove, set, update } from 'firebase/database'
import { database } from '../store/Firebase'
import {
  enrollmentPath,
  enrollmentsPath,
  locationPath,
  locationsPath,
  semesterPath,
  semestersPath,
  teacherAvailabilityPath
} from './schedulingPaths'
import { Location, Semester, StudentEnrollment, WeeklyAvailability } from './scheduling'

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

export async function createSemester(
  teacherId: string,
  locationId: string,
  data: Pick<Semester, 'name' | 'startDate' | 'endDate' | 'defaultCancellationWindowHours'>,
  timezone: string
): Promise<string> {
  const id = newKey(semestersPath(teacherId))
  await set(ref(database, semesterPath(teacherId, id)), {
    ...data,
    id,
    locationId,
    status: 'draft',
    timezone,
    createdAt: Date.now()
  })
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
  await set(ref(database, teacherAvailabilityPath(teacherId, semesterId)), availability)
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
