import { formatMinutes, parseMinutes } from './schedulingDates'

export enum AvailabilityLabel {
  PREFERRED = 'preferred',
  AVAILABLE = 'available',
  LAST_RESORT = 'last_resort',
  UNAVAILABLE = 'unavailable'
}

export const LABEL_SCORES: Record<AvailabilityLabel, number> = {
  [AvailabilityLabel.PREFERRED]: 10,
  [AvailabilityLabel.AVAILABLE]: 6,
  [AvailabilityLabel.LAST_RESORT]: 2,
  [AvailabilityLabel.UNAVAILABLE]: 0
}

export const SCHEDULING_CONFIG = {
  SLOT_SNAP_MINUTES: 15,
  MIN_BREAK_MINUTES: 10,
  GAP_PENALTY_THRESHOLD_MINUTES: 30,
  GAP_PENALTY_PER_MINUTE: 0.05,
  TEACHER_WEIGHT: 0.7,
  STUDENT_WEIGHT: 0.3,
  MIN_STUDENT_PREFERENCES: 3,
  MIN_PREFERRED_PREFERENCES: 1,
  // Caps the per-week search so a pathologically tight week cannot hang the browser. The best
  // placement found so far is kept when it runs out, which is never worse than the greedy
  // answer because greedy is the first branch explored.
  MAX_SEARCH_NODES_PER_WEEK: 200000,
  // Granularity of the teacher-weight sweep. Finer finds narrower bands at linear cost.
  WEIGHT_SWEEP_STEP: 0.1,
  // The sweep never reaches 0 or 1. At either end one side's score drops out of the formula
  // entirely, so the solver has nothing to break ties with and will hand out a merely-available
  // slot where a preferred one scored the same for the favoured side. Keeping a tenth of the
  // weight on the other side costs the favoured side almost nothing and stops that happening.
  WEIGHT_SWEEP_MIN: 0.1,
  WEIGHT_SWEEP_MAX: 0.9
} as const

// dayOfWeek: 0=Mon, 1=Tue, ..., 6=Sun (matches react-big-calendar with weekStartsOn:1)
export interface AvailabilityBlock {
  dayOfWeek: number
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  label: AvailabilityLabel
  score: number // stored for fast access; must equal LABEL_SCORES[label]
}

export interface WeeklyAvailability {
  weeklyTemplate: { blocks: AvailabilityBlock[] }
  // key: Monday date "YYYY-MM-DD". Empty blocks array = fully unavailable that week.
  weekOverrides: Record<string, { blocks: AvailabilityBlock[] }>
}

export interface Location {
  id: string
  name: string
  address?: string
  createdAt: number
}

export type SemesterStatus = 'draft' | 'scheduling' | 'active' | 'completed'

export interface Semester {
  id: string
  locationId: string
  name: string
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  status: SemesterStatus
  defaultCancellationWindowHours: number
  timezone: string // e.g. "Europe/Bucharest"
  createdAt: number
}

/** How a student's lessons spread across the weeks of a semester. */
export type LessonDistribution = 'even' | 'start' | 'end'

export interface StudentEnrollment {
  studentId: string
  lessonDurationMinutes: number
  /** Authoritative: the teacher types this, and the solver fits exactly this many lessons. */
  totalLessons: number
  distribution?: LessonDistribution // defaults to 'even'
  cancellationWindowHours?: number // falls back to semester default when absent
}

export type RoundStatus = 'collecting' | 'ready' | 'suggested' | 'finalized'

export interface SchedulingRound {
  id: string
  roundNumber: number
  status: RoundStatus
  deadline: number // timestamp ms
  createdAt: number
}

export interface StudentSubmission {
  studentId: string
  status: 'pending' | 'submitted'
  submittedAt?: number
  recurringPreferences: AvailabilityBlock[]
  // key: Monday date "YYYY-MM-DD". Empty blocks = fully unavailable that week.
  weekOverrides: Record<string, { blocks: AvailabilityBlock[] }>
}

export interface SuggestedSlot {
  studentId: string
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  teacherScore: number
  studentScore: number
  combinedScore: number
}

/** When a lesson sits: the three fields a move or resize can change. */
export type SlotTime = Pick<SuggestedSlot, 'date' | 'startTime' | 'endTime'>

/** How well a time suits both sides. Recomputed whenever a lesson is placed by hand. */
export type SlotScores = Pick<SuggestedSlot, 'teacherScore' | 'studentScore' | 'combinedScore'>

/** Mean of a set of scores, 0 for an empty set rather than NaN. */
export function averageScore(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

/** Where a lesson was placed, and what it was worth there. */
export type OriginalPlacement = SlotTime & SlotScores

/**
 * A suggested slot, possibly moved or hand-placed by the teacher.
 *
 * `moved` records the override so Step O can tell a hand-placed lesson from a generated one.
 *
 * `original` keeps where the solver put it AND what it was worth there, captured on the FIRST
 * move and never overwritten, so three drags in a row still revert to the suggestion rather than
 * to the second drag.
 *
 * `added` marks a lesson the teacher placed that the solver never proposed. It has no suggestion
 * to revert to, so it is removed rather than reverted.
 */
export interface EditableSlot extends SuggestedSlot {
  moved?: boolean
  original?: OriginalPlacement
  added?: boolean
}

/**
 * Puts a slot back where the solver placed it.
 *
 * Restores the scores along with the times. A move rescores the lesson against where it landed,
 * so putting only the times back leaves it wearing the score of a time it no longer occupies —
 * which is how undoing every edit left the satisfaction averages unchanged.
 *
 * Dropping `original` matters as much: its absence is what marks the slot untouched again, for
 * the edit counter and for the faded styling.
 */
export function reverted(slot: EditableSlot): EditableSlot {
  if (!slot.original) return slot
  const { original, ...rest } = slot
  return { ...rest, ...original, moved: false }
}

export function sameTime(a: SlotTime, b: SlotTime): boolean {
  return a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime
}

export type SuggestionStrategy = 'teacher_best' | 'student_best' | 'balanced'

export interface ScheduleSuggestion {
  slots: SuggestedSlot[]
  /** Lessons the solver could not place, per student. See SchedulingResult for the semantics. */
  missedLessonsByStudent: Record<string, number>
  /** Raw sum of the placed lessons' scores, less the gap penalty. Used to rank internally. */
  totalScore: number
}

export interface ConfirmedSchedule {
  roundId: string
  strategy: SuggestionStrategy
  confirmedAt: number
  editedFromSuggestion: boolean
}

export type LessonStatus = 'scheduled' | 'canceled' | 'completed' | 'rescheduled'

export interface LessonInstance {
  id: string
  studentId: string
  locationId: string
  scheduledStart: number // timestamp ms
  scheduledEnd: number
  timezone: string
  status: LessonStatus
  isAdHoc: boolean
  isMakeup: boolean
  parentLessonId?: string
  calendarSequence: number
  createdAt: number
}

export interface Cancellation {
  id: string
  lessonId: string
  canceledBy: string // uid
  otherParty: string // uid; stored explicitly so read rules need no join
  canceledAt: number
  withinWindow: boolean
  charged: boolean
  makeupOffered: boolean
  makeupLessonId?: string
  acknowledgmentStatus: 'pending' | 'acknowledged'
  acknowledgmentAt?: number
  bundleId?: string
}

export interface CancellationBundle {
  id: string
  studentId: string
  lessonCount: number
  fromDate: string // "YYYY-MM-DD"
  acknowledgmentStatus: 'pending' | 'acknowledged'
  acknowledgmentAt?: number
}

export enum NotificationType {
  AVAILABILITY_REQUEST = 'availability_request',
  AVAILABILITY_REMINDER = 'availability_reminder',
  STUDENT_SUBMITTED = 'student_submitted',
  SCHEDULE_CONFIRMED = 'schedule_confirmed',
  LESSON_REMINDER = 'lesson_reminder',
  STUDENT_CANCELED = 'student_canceled',
  TEACHER_CANCELED = 'teacher_canceled',
  ACKNOWLEDGMENT_DUE = 'acknowledgment_due',
  MAKEUP_PROPOSED = 'makeup_proposed',
  STUDENT_NOT_SCHEDULABLE = 'student_not_schedulable'
}

export interface SchedulingNotification {
  id: string
  type: NotificationType
  recipientId: string // uid; may be teacher or student
  semesterId: string
  lessonId?: string
  cancellationId?: string
  roundId?: string
  channel: 'email' | 'in_app'
  status: 'pending' | 'sent' | 'failed'
  createdAt: number
  sentAt?: number
}

export const schedulingPaths = {
  locations: (tid: string) => `locations/teachers/${tid}`,
  location: (tid: string, lid: string) => `locations/teachers/${tid}/${lid}`,
  semesters: (tid: string) => `semesters/teachers/${tid}`,
  semester: (tid: string, sid: string) => `semesters/teachers/${tid}/${sid}`,
  teacherAvailability: (tid: string, sid: string) =>
    `teacherAvailability/teachers/${tid}/semesters/${sid}`,
  studentEnrollments: (tid: string, sid: string) =>
    `studentEnrollments/teachers/${tid}/semesters/${sid}/students`,
  studentEnrollment: (tid: string, sid: string, uid: string) =>
    `studentEnrollments/teachers/${tid}/semesters/${sid}/students/${uid}`,
  schedulingRounds: (tid: string, sid: string) =>
    `schedulingRounds/teachers/${tid}/semesters/${sid}/rounds`,
  schedulingRound: (tid: string, sid: string, rid: string) =>
    `schedulingRounds/teachers/${tid}/semesters/${sid}/rounds/${rid}`,
  studentSubmissions: (tid: string, sid: string, rid: string) =>
    `studentSubmissions/teachers/${tid}/semesters/${sid}/rounds/${rid}/students`,
  studentSubmission: (tid: string, sid: string, rid: string, uid: string) =>
    `studentSubmissions/teachers/${tid}/semesters/${sid}/rounds/${rid}/students/${uid}`,
  scheduleSuggestions: (tid: string, sid: string, rid: string) =>
    `scheduleSuggestions/teachers/${tid}/semesters/${sid}/rounds/${rid}`,
  scheduleSuggestion: (tid: string, sid: string, rid: string, strategy: SuggestionStrategy) =>
    `scheduleSuggestions/teachers/${tid}/semesters/${sid}/rounds/${rid}/${strategy}`,
  confirmedSchedule: (tid: string, sid: string) =>
    `confirmedSchedules/teachers/${tid}/semesters/${sid}`,
  lessonInstances: (tid: string, sid: string) =>
    `lessonInstances/teachers/${tid}/semesters/${sid}/lessons`,
  lessonInstance: (tid: string, sid: string, lid: string) =>
    `lessonInstances/teachers/${tid}/semesters/${sid}/lessons/${lid}`,
  cancellations: (tid: string, sid: string) => `cancellations/teachers/${tid}/semesters/${sid}`,
  cancellation: (tid: string, sid: string, cid: string) =>
    `cancellations/teachers/${tid}/semesters/${sid}/${cid}`,
  cancellationBundles: (tid: string, sid: string) =>
    `cancellationBundles/teachers/${tid}/semesters/${sid}`,
  cancellationBundle: (tid: string, sid: string, bid: string) =>
    `cancellationBundles/teachers/${tid}/semesters/${sid}/${bid}`,
  notifications: (tid: string) => `notifications/teachers/${tid}`,
  notification: (tid: string, nid: string) => `notifications/teachers/${tid}/${nid}`
}

// Combined slot score. Returns 0 if either party has a hard block (score 0).
//
// Formula: teacherScore × teacherWeight + studentScore × (1 − teacherWeight). The weights sum
// to 1, so the result stays on the same 0–10 scale as its inputs at every weight.
//
// The weight is a parameter because the suggestion engine sweeps it: one formula produces the
// whole range from "best for the teacher" to "best for the students". It defaults to the
// configured weight for callers that just want the house blend.
export function computeCombinedScore(
  teacherScore: number,
  studentScore: number,
  teacherWeight: number = SCHEDULING_CONFIG.TEACHER_WEIGHT
): number {
  if (teacherScore === 0 || studentScore === 0) return 0
  return teacherScore * teacherWeight + studentScore * (1 - teacherWeight)
}

// Clip every existing block that overlaps `incoming` on the same day.
//
// `incoming` is NOT included in the result — the caller appends it. The new block always
// wins its time range outright; there is no error or confirmation, it simply claims the span.
//
// Five outcomes per existing block:
//   no overlap            → kept unchanged (touching edges do not overlap)
//   straddles `incoming`  → split into a left and a right fragment
//   overlaps on the right → end trimmed back to incoming.startTime
//   overlaps on the left  → start pushed forward to incoming.endTime
//   fully covered         → dropped
//
// Blocks on other days are always kept.
export function removeOverlaps(
  existing: AvailabilityBlock[],
  incoming: AvailabilityBlock
): AvailabilityBlock[] {
  const ns = parseMinutes(incoming.startTime)
  const ne = parseMinutes(incoming.endTime)
  const result: AvailabilityBlock[] = []
  for (const b of existing) {
    if (b.dayOfWeek !== incoming.dayOfWeek) {
      result.push(b)
      continue
    }
    const bs = parseMinutes(b.startTime)
    const be = parseMinutes(b.endTime)
    if (be <= ns || bs >= ne) {
      result.push(b) // no overlap
    } else if (bs < ns && be > ne) {
      result.push({ ...b, endTime: formatMinutes(ns) }) // incoming punches through middle — left fragment
      result.push({ ...b, startTime: formatMinutes(ne) }) // right fragment
    } else if (bs < ns) {
      result.push({ ...b, endTime: formatMinutes(ns) }) // overlap at right end of existing — trim right
    } else if (be > ne) {
      result.push({ ...b, startTime: formatMinutes(ne) }) // overlap at left end of existing — trim left
    }
    // else: existing fully covered by incoming — drop it
  }
  return result
}

// True when a cancellation lands inside the policy window — i.e. close enough to the lesson
// that the late-cancellation terms apply. A lesson already in the past is always inside the
// window, which is what makes a no-show behave like a late cancellation.
//
// Stored on the Cancellation record as `withinWindow`.
export function isWithinCancellationWindow(
  scheduledStart: number,
  windowHours: number,
  now: number = Date.now()
): boolean {
  return scheduledStart - now < windowHours * 60 * 60 * 1000
}

// A time span on one specific date. Both SuggestedSlot and LessonSlot satisfy this.
export interface TimeSpan {
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
}

// The first lesson `candidate` clashes with, or null when it fits.
//
// Two lessons clash when they overlap OR sit closer together than the minimum break — the
// teacher needs a gap between students, so back-to-back is a conflict, not a tight fit.
// Lessons on different dates never clash.
//
// Returns the offending lesson rather than a boolean so callers can say *what* it collided
// with. Step L's assignment pass needs the same rule.
export function findConflict<T extends TimeSpan>(
  candidate: TimeSpan,
  others: T[],
  minBreakMinutes: number = SCHEDULING_CONFIG.MIN_BREAK_MINUTES
): T | null {
  const start = parseMinutes(candidate.startTime)
  const end = parseMinutes(candidate.endTime)
  for (const other of others) {
    if (other.date !== candidate.date) continue
    const otherStart = parseMinutes(other.startTime)
    const otherEnd = parseMinutes(other.endTime)
    const clears = end + minBreakMinutes <= otherStart || otherEnd + minBreakMinutes <= start
    if (!clears) return other
  }
  return null
}

// Apply a cancellation to a list of lessons, returning a new list.
//
// `cancelAllForward` also cancels that student's later scheduled lessons — scoped to the
// student even in a view that only ever holds one student's lessons, so the rule is the same
// wherever it runs. Lessons already completed or canceled are left alone.
export function applyCancellation(
  lessons: LessonInstance[],
  target: LessonInstance,
  cancelAllForward: boolean
): LessonInstance[] {
  return lessons.map((lesson) => {
    if (lesson.id === target.id) return { ...lesson, status: 'canceled' }
    const laterForSameStudent =
      cancelAllForward &&
      lesson.studentId === target.studentId &&
      lesson.scheduledStart > target.scheduledStart &&
      lesson.status === 'scheduled'
    return laterForSameStudent ? { ...lesson, status: 'canceled' } : lesson
  })
}

// The score a block list gives one weekday and time of day, or 0 when nothing covers it.
//
// 0 means "not available", which is why it doubles as the hard-block value in
// computeCombinedScore: an uncovered time and an explicitly refused one are the same thing.
export function scoreForDayTime(
  blocks: AvailabilityBlock[],
  dayOfWeek: number,
  startTime: string
): number {
  const minutes = parseMinutes(startTime)
  const covering = blocks.find(
    (b) =>
      b.dayOfWeek === dayOfWeek &&
      parseMinutes(b.startTime) <= minutes &&
      minutes < parseMinutes(b.endTime)
  )
  return covering?.score ?? 0
}

// How many lessons a student gets in each week of the semester.
//
// Replaces the old `targetSpacing` heuristic and its 0.8 fudge factor: the quota is decided up
// front and the solver simply fills it. The enrollment dialog draws its preview from this same
// function, so what the teacher is shown and what they get cannot disagree.
//
//   even  → lesson i lands in week floor(i × weeks / total), spreading the surplus through the
//           term and, when there are fewer lessons than weeks, spacing them out instead of
//           clustering. This is what keeps a bi-weekly student bi-weekly.
//   start → every week gets floor(total / weeks) and the first (total mod weeks) weeks get one
//           extra. With fewer lessons than weeks this front-loads them and leaves the tail
//           empty, which is a real choice but is NOT bi-weekly.
//   end   → the same, reversed.
export function weeklyQuota(
  totalLessons: number,
  weeks: number,
  distribution: LessonDistribution = 'even'
): number[] {
  if (weeks <= 0 || totalLessons <= 0) return new Array(Math.max(0, weeks)).fill(0)

  if (distribution === 'even') {
    const quota = new Array(weeks).fill(0)
    for (let i = 0; i < totalLessons; i++) {
      quota[Math.floor((i * weeks) / totalLessons)]++
    }
    return quota
  }

  const base = Math.floor(totalLessons / weeks)
  const remainder = totalLessons % weeks
  const quota = Array.from({ length: weeks }, (_, week) => base + (week < remainder ? 1 : 0))
  return distribution === 'end' ? quota.reverse() : quota
}
