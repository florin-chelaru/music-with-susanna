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
  MIN_PREFERRED_PREFERENCES: 1
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

export interface StudentEnrollment {
  studentId: string
  lessonDurationMinutes: number
  totalLessons: number
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

export type SuggestionStrategy = 'teacher_best' | 'student_best' | 'balanced'

export interface ScheduleSuggestion {
  slots: SuggestedSlot[]
  unscheduledStudentIds: string[]
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
// Formula: teacherScore × TEACHER_WEIGHT + studentScore × STUDENT_WEIGHT
// Max score is 10 (when both are PREFERRED and weights sum to 1).
export function computeCombinedScore(teacherScore: number, studentScore: number): number {
  if (teacherScore === 0 || studentScore === 0) return 0
  return (
    teacherScore * SCHEDULING_CONFIG.TEACHER_WEIGHT +
    studentScore * SCHEDULING_CONFIG.STUDENT_WEIGHT
  )
}
