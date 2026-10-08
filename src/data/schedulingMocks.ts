import {
  AvailabilityBlock,
  AvailabilityLabel,
  computeCombinedScore,
  LABEL_SCORES,
  LessonInstance,
  Location,
  SchedulingRound,
  ScheduleSuggestion,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  SuggestedSlot,
  WeeklyAvailability
} from '../util/scheduling'
import { parseMinutes, toDayOfWeek } from '../util/schedulingDates'

// ─── IDs ─────────────────────────────────────────────────────────────────────

export const MOCK_TEACHER_ID = 'mock-teacher-001'

export const MOCK_LOCATION_IDS = {
  home: 'loc-home',
  school: 'loc-school'
} as const

export const MOCK_SEMESTER_IDS = {
  spring2026: 'sem-spring2026', // completed — history
  fall2026: 'sem-fall2026', // active — schedule confirmed, round 2 has suggestions waiting
  spring2027: 'sem-spring2027' // scheduling — next term, availability still being collected
} as const

export const MOCK_STUDENT_IDS = {
  ana: 'student-ana',
  barbara: 'student-barbara',
  chris: 'student-chris'
} as const

export const MOCK_ROUND_ID = 'round-001'

// Display names and emails used by teacher views
export const MOCK_STUDENTS: Record<string, { name: string; email: string }> = {
  [MOCK_STUDENT_IDS.ana]: { name: 'Ana Ionescu', email: 'ana@example.com' },
  [MOCK_STUDENT_IDS.barbara]: { name: 'Barbara Pop', email: 'barbara@example.com' },
  [MOCK_STUDENT_IDS.chris]: { name: 'Chris Munteanu', email: 'chris@example.com' }
}

// ─── Locations ───────────────────────────────────────────────────────────────

export const MOCK_LOCATIONS: Location[] = [
  {
    id: MOCK_LOCATION_IDS.home,
    name: 'Home Studio',
    address: 'Str. Muzicii 1, Cluj-Napoca',
    createdAt: 1700000000000
  },
  {
    id: MOCK_LOCATION_IDS.school,
    name: 'Music School',
    address: 'Str. Artelor 5, Cluj-Napoca',
    createdAt: 1700000000000
  }
]

// ─── Semesters ───────────────────────────────────────────────────────────────

export const MOCK_SEMESTERS: Semester[] = [
  {
    id: MOCK_SEMESTER_IDS.spring2026,
    locationId: MOCK_LOCATION_IDS.home,
    name: 'Spring 2026',
    startDate: '2026-02-02',
    endDate: '2026-06-20',
    status: 'completed',
    defaultCancellationWindowHours: 24,
    timezone: 'Europe/Bucharest',
    createdAt: 1700000000000
  },
  {
    id: MOCK_SEMESTER_IDS.fall2026,
    locationId: MOCK_LOCATION_IDS.school,
    name: 'Fall 2026',
    startDate: '2026-09-07',
    endDate: '2026-12-19',
    status: 'active',
    defaultCancellationWindowHours: 24,
    timezone: 'Europe/Bucharest',
    createdAt: 1700000000000
  },
  {
    id: MOCK_SEMESTER_IDS.spring2027,
    locationId: MOCK_LOCATION_IDS.home,
    name: 'Spring 2027',
    startDate: '2027-02-01',
    endDate: '2027-06-18',
    status: 'scheduling',
    defaultCancellationWindowHours: 24,
    timezone: 'Europe/Bucharest',
    createdAt: 1700000000000
  }
]

// ─── Availability block helper ────────────────────────────────────────────────

function block(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  label: AvailabilityLabel
): AvailabilityBlock {
  return { dayOfWeek, startTime, endTime, label, score: LABEL_SCORES[label] }
}

// ─── Teacher availability ─────────────────────────────────────────────────────

// Same template used for both semesters in the mocks.
// Mon/Wed/Fri mornings preferred; Tue/Thu available; Sat last resort.
export const MOCK_TEACHER_AVAILABILITY: WeeklyAvailability = {
  weeklyTemplate: {
    blocks: [
      block(0, '09:00', '13:00', AvailabilityLabel.PREFERRED), // Mon morning
      block(1, '10:00', '12:00', AvailabilityLabel.AVAILABLE), // Tue
      block(2, '09:00', '13:00', AvailabilityLabel.PREFERRED), // Wed morning
      block(3, '10:00', '12:00', AvailabilityLabel.AVAILABLE), // Thu
      block(4, '09:00', '13:00', AvailabilityLabel.PREFERRED), // Fri morning
      block(5, '10:00', '12:00', AvailabilityLabel.LAST_RESORT) // Sat last resort
    ]
  },
  weekOverrides: {
    // Easter week: fully unavailable
    '2026-04-06': { blocks: [] },
    // May Day week: Mon unavailable, rest normal
    '2026-04-27': {
      blocks: [
        block(1, '10:00', '12:00', AvailabilityLabel.AVAILABLE),
        block(2, '09:00', '13:00', AvailabilityLabel.PREFERRED),
        block(3, '10:00', '12:00', AvailabilityLabel.AVAILABLE),
        block(4, '09:00', '13:00', AvailabilityLabel.PREFERRED)
      ]
    }
  }
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

// Spring 2026 (active): Ana weekly 45min, Barbara bi-weekly 60min, Chris weekly 45min
export const MOCK_ENROLLMENTS_SPRING: StudentEnrollment[] = [
  {
    studentId: MOCK_STUDENT_IDS.ana,
    lessonDurationMinutes: 45,
    totalLessons: 20,
    lessonsPerPeriod: 1,
    period: 'week'
  },
  {
    studentId: MOCK_STUDENT_IDS.barbara,
    lessonDurationMinutes: 60,
    totalLessons: 10,
    lessonsPerPeriod: 1,
    period: 'biweek'
  },
  {
    studentId: MOCK_STUDENT_IDS.chris,
    lessonDurationMinutes: 45,
    totalLessons: 20,
    lessonsPerPeriod: 1,
    period: 'week'
  }
]

// Fall 2026 (scheduling): same students, same pattern
export const MOCK_ENROLLMENTS_FALL: StudentEnrollment[] = [
  {
    studentId: MOCK_STUDENT_IDS.ana,
    lessonDurationMinutes: 45,
    totalLessons: 15,
    lessonsPerPeriod: 1,
    period: 'week'
  },
  {
    studentId: MOCK_STUDENT_IDS.barbara,
    lessonDurationMinutes: 60,
    totalLessons: 8,
    lessonsPerPeriod: 1,
    period: 'biweek'
  },
  {
    studentId: MOCK_STUDENT_IDS.chris,
    lessonDurationMinutes: 45,
    totalLessons: 15,
    lessonsPerPeriod: 1,
    period: 'week'
  }
]

export const MOCK_ENROLLMENTS_SPRING2027: StudentEnrollment[] = MOCK_ENROLLMENTS_FALL

// ─── Scheduling round ─────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

// Like the lesson statuses, the open round's dates are relative to now. A fixed deadline
// goes stale: once it passes, the countdown reads as expired and the "close the round"
// button is permanently enabled, so neither state can be reviewed.
const NOW = Date.now()

export const MOCK_ROUNDS_SPRING: SchedulingRound[] = [
  {
    id: 'round-sp-1',
    roundNumber: 1,
    status: 'finalized',
    deadline: new Date('2026-01-16T23:59:00+02:00').getTime(),
    createdAt: new Date('2026-01-05T10:00:00+02:00').getTime()
  }
]

export const MOCK_ROUNDS_FALL: SchedulingRound[] = [
  // Round 1 produced the schedule the Calendar tab shows.
  {
    id: 'round-fa-1',
    roundNumber: 1,
    status: 'finalized',
    deadline: new Date('2026-08-20T23:59:00+03:00').getTime(),
    createdAt: new Date('2026-08-06T10:00:00+03:00').getTime()
  },
  // Round 2 closed and the suggestions are waiting for the teacher to pick one.
  {
    id: MOCK_ROUND_ID,
    roundNumber: 2,
    status: 'suggested',
    deadline: NOW - 1 * DAY_MS,
    createdAt: NOW - 8 * DAY_MS
  }
]

// Next term is still collecting, which is what keeps the collecting state reviewable now
// that Fall's round has moved on.
export const MOCK_ROUNDS_SPRING2027: SchedulingRound[] = [
  {
    id: 'round-sp27-1',
    roundNumber: 1,
    status: 'collecting',
    deadline: NOW + 5 * DAY_MS,
    createdAt: NOW - 2 * DAY_MS
  }
]

// ─── Student submissions ──────────────────────────────────────────────────────
//
// Keyed per round, like enrollments, lessons and rounds. Fall's round 2 has closed with
// everyone submitted; next term's round is still waiting on Chris, which is what keeps the
// "waiting on N students" state reviewable. One shared record could not represent both.

const ANA_PREFERENCES = [
  block(0, '09:00', '11:00', AvailabilityLabel.PREFERRED), // Mon preferred
  block(2, '09:00', '11:00', AvailabilityLabel.AVAILABLE), // Wed available
  block(4, '10:00', '12:00', AvailabilityLabel.LAST_RESORT) // Fri last resort
]

const BARBARA_PREFERENCES = [
  block(0, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Mon preferred
  block(1, '10:00', '12:00', AvailabilityLabel.AVAILABLE), // Tue available
  block(3, '10:00', '12:00', AvailabilityLabel.AVAILABLE) // Thu available
]

// Chris is the student whose wishes pull against the teacher's: he most wants Tuesday, which
// the teacher only rates "available", and merely tolerates the Monday the teacher prefers.
// That tension is what makes the three suggested schedules differ.
const CHRIS_PREFERENCES = [
  block(1, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Tue preferred
  block(2, '09:00', '11:00', AvailabilityLabel.AVAILABLE), // Wed available
  block(0, '11:00', '13:00', AvailabilityLabel.LAST_RESORT) // Mon last resort
]

export const MOCK_SUBMISSIONS_FALL_R2: Record<string, StudentSubmission> = {
  [MOCK_STUDENT_IDS.ana]: {
    studentId: MOCK_STUDENT_IDS.ana,
    status: 'submitted',
    submittedAt: NOW - 9 * DAY_MS,
    recurringPreferences: ANA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.barbara]: {
    studentId: MOCK_STUDENT_IDS.barbara,
    status: 'submitted',
    submittedAt: NOW - 8 * DAY_MS,
    recurringPreferences: BARBARA_PREFERENCES,
    // Away on a conference — fully unavailable
    weekOverrides: { '2026-11-09': { blocks: [] } }
  },
  [MOCK_STUDENT_IDS.chris]: {
    studentId: MOCK_STUDENT_IDS.chris,
    status: 'submitted',
    submittedAt: NOW - 7 * DAY_MS,
    recurringPreferences: CHRIS_PREFERENCES,
    weekOverrides: {}
  }
}

export const MOCK_SUBMISSIONS_SPRING2027_R1: Record<string, StudentSubmission> = {
  [MOCK_STUDENT_IDS.ana]: {
    studentId: MOCK_STUDENT_IDS.ana,
    status: 'submitted',
    submittedAt: NOW - 1.5 * DAY_MS,
    recurringPreferences: ANA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.barbara]: {
    studentId: MOCK_STUDENT_IDS.barbara,
    status: 'submitted',
    submittedAt: NOW - 0.5 * DAY_MS,
    recurringPreferences: BARBARA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.chris]: {
    studentId: MOCK_STUDENT_IDS.chris,
    status: 'pending',
    recurringPreferences: [],
    weekOverrides: {}
  }
}

// Submissions belong to a round, so consumers look them up by round id.
export const MOCK_SUBMISSIONS_BY_ROUND: Record<string, Record<string, StudentSubmission>> = {
  [MOCK_ROUND_ID]: MOCK_SUBMISSIONS_FALL_R2,
  'round-sp27-1': MOCK_SUBMISSIONS_SPRING2027_R1
}

// ─── Schedule suggestions ─────────────────────────────────────────────────────
//
// Round 2's three strategies, waiting for the teacher to pick one.
//
// Every score is LOOKED UP from the teacher's availability and the student's own submission
// rather than written by hand. Hand-written scores drifted away from the blocks they were
// supposed to come from: an earlier version scored Chris's Wednesday slots 6 for a teacher
// who marks Wednesday as preferred, and claimed Chris was unschedulable while two hours of
// the teacher's Monday block sat empty.
//
// The placements also respect the constraints the real algorithm will enforce:
// MIN_BREAK_MINUTES between lessons on a day, and each student's enrolled cadence —
// Barbara is bi-weekly, so she appears every other Monday, not every Monday.

const SUGGESTION_MONDAYS = ['2026-10-19', '2026-10-26', '2026-11-02']
const SUGGESTION_TUESDAYS = ['2026-10-20', '2026-10-27', '2026-11-03']
const SUGGESTION_WEDNESDAYS = ['2026-10-21', '2026-10-28', '2026-11-04']
const BARBARA_MONDAYS = ['2026-10-19', '2026-11-02'] // bi-weekly, per her enrollment

// The score a block list gives one specific date and time, or 0 when nothing covers it.
function scoreAt(blocks: AvailabilityBlock[], date: string, startTime: string): number {
  const dayOfWeek = toDayOfWeek(date)
  const minutes = parseMinutes(startTime)
  const covering = blocks.find(
    (b) =>
      b.dayOfWeek === dayOfWeek &&
      parseMinutes(b.startTime) <= minutes &&
      minutes < parseMinutes(b.endTime)
  )
  return covering?.score ?? 0
}

function suggest(
  studentId: string,
  dates: string[],
  startTime: string,
  endTime: string
): SuggestedSlot[] {
  const studentBlocks = MOCK_SUBMISSIONS_FALL_R2[studentId].recurringPreferences
  const teacherBlocks = MOCK_TEACHER_AVAILABILITY.weeklyTemplate.blocks
  return dates.map((date) => {
    const teacherScore = scoreAt(teacherBlocks, date, startTime)
    const studentScore = scoreAt(studentBlocks, date, startTime)
    return {
      studentId,
      date,
      startTime,
      endTime,
      teacherScore,
      studentScore,
      combinedScore: computeCombinedScore(teacherScore, studentScore)
    }
  })
}

const totalOf = (slots: SuggestedSlot[]): number =>
  Math.round(slots.reduce((sum, slot) => sum + slot.combinedScore, 0) * 10) / 10

// Ana and Barbara want exactly what the teacher wants, so every strategy places them the same
// way. Chris is where the strategies part company.
const ANA_SLOTS = suggest(MOCK_STUDENT_IDS.ana, SUGGESTION_MONDAYS, '09:00', '09:45')
const BARBARA_SLOTS = suggest(MOCK_STUDENT_IDS.barbara, BARBARA_MONDAYS, '10:00', '11:00')
const SETTLED_SLOTS = [...ANA_SLOTS, ...BARBARA_SLOTS]

// Teacher first: Monday is one of the teacher's preferred days, and 11:15 clears Barbara's
// 11:00 finish by more than MIN_BREAK_MINUTES. Chris only tolerates it.
const TEACHER_BEST_SLOTS = [
  ...SETTLED_SLOTS,
  ...suggest(MOCK_STUDENT_IDS.chris, SUGGESTION_MONDAYS, '11:15', '12:00')
]

// Students first: Chris gets the Tuesday he asked for, which costs the teacher a day they
// rate merely "available".
const STUDENT_BEST_SLOTS = [
  ...SETTLED_SLOTS,
  ...suggest(MOCK_STUDENT_IDS.chris, SUGGESTION_TUESDAYS, '10:00', '10:45')
]

// Balanced: Wednesday is preferred by the teacher *and* liked better by Chris than Monday, so
// it beats both of the above on the combined score.
const BALANCED_SLOTS = [
  ...SETTLED_SLOTS,
  ...suggest(MOCK_STUDENT_IDS.chris, SUGGESTION_WEDNESDAYS, '09:00', '09:45')
]

export const MOCK_SUGGESTIONS: Record<string, ScheduleSuggestion> = {
  teacher_best: {
    slots: TEACHER_BEST_SLOTS,
    unscheduledStudentIds: [],
    totalScore: totalOf(TEACHER_BEST_SLOTS)
  },
  student_best: {
    slots: STUDENT_BEST_SLOTS,
    unscheduledStudentIds: [],
    totalScore: totalOf(STUDENT_BEST_SLOTS)
  },
  balanced: {
    slots: BALANCED_SLOTS,
    unscheduledStudentIds: [],
    totalScore: totalOf(BALANCED_SLOTS)
  }
}

// ─── Lesson instances (Spring 2026 active semester) ───────────────────────────

// Mon 09:00–09:45 EET = Mon 07:00–07:45 UTC
function lessonTs(isoDate: string, startHour: number, durationMin: number): [number, number] {
  const start = new Date(`${isoDate}T${String(startHour).padStart(2, '0')}:00:00+02:00`).getTime()
  return [start, start + durationMin * 60 * 1000]
}

function lesson(
  id: string,
  studentId: string,
  isoDate: string,
  startHour: number,
  durationMin: number,
  status: LessonInstance['status'] = 'completed',
  locationId: string = MOCK_LOCATION_IDS.home
): LessonInstance {
  const [start, end] = lessonTs(isoDate, startHour, durationMin)
  return {
    id,
    studentId,
    locationId,
    scheduledStart: start,
    scheduledEnd: end,
    timezone: 'Europe/Bucharest',
    status,
    isAdHoc: false,
    isMakeup: false,
    calendarSequence: 0,
    createdAt: new Date('2026-01-15T00:00:00Z').getTime()
  }
}

// ─── Lesson instances ─────────────────────────────────────────────────────────
//
// In RTDB these live under lessonInstances/.../semesters/{semesterId}/lessons, so the
// semester is implied by the path and the record carries no semesterId. The mocks are
// split the same way, matching MOCK_ENROLLMENTS_SPRING / _FALL.

// Spring 2026 (2 Feb – 20 Jun) is over; these are history.
export const MOCK_LESSON_INSTANCES_SPRING: LessonInstance[] = [
  // Ana — weekly Mon 09:00 (45 min)
  lesson('li-sp-ana-1', MOCK_STUDENT_IDS.ana, '2026-02-02', 9, 45, 'completed'),
  lesson('li-sp-ana-2', MOCK_STUDENT_IDS.ana, '2026-02-09', 9, 45, 'completed'),
  lesson('li-sp-ana-3', MOCK_STUDENT_IDS.ana, '2026-02-16', 9, 45, 'completed'),
  lesson('li-sp-ana-4', MOCK_STUDENT_IDS.ana, '2026-02-23', 9, 45, 'canceled'),
  lesson('li-sp-ana-5', MOCK_STUDENT_IDS.ana, '2026-03-02', 9, 45, 'completed'),

  // Barbara — bi-weekly Mon 10:00 (60 min)
  lesson('li-sp-bar-1', MOCK_STUDENT_IDS.barbara, '2026-02-02', 10, 60, 'completed'),
  lesson('li-sp-bar-2', MOCK_STUDENT_IDS.barbara, '2026-02-16', 10, 60, 'completed'),
  lesson('li-sp-bar-3', MOCK_STUDENT_IDS.barbara, '2026-03-02', 10, 60, 'completed'),

  // Chris — weekly Mon 11:00 (45 min)
  lesson('li-sp-chr-1', MOCK_STUDENT_IDS.chris, '2026-02-02', 11, 45, 'completed'),
  lesson('li-sp-chr-2', MOCK_STUDENT_IDS.chris, '2026-02-09', 11, 45, 'completed'),
  lesson('li-sp-chr-3', MOCK_STUDENT_IDS.chris, '2026-02-16', 11, 45, 'completed')
]

// Mondays of the Fall 2026 semester (7 Sep – 19 Dec).
const FALL_MONDAYS = [
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
  '2026-11-02',
  '2026-11-09',
  '2026-11-16',
  '2026-11-23',
  '2026-11-30',
  '2026-12-07',
  '2026-12-14'
]

// Build a recurring Monday series. everyNthWeek = 2 gives a bi-weekly student.
//
// Status is derived from the clock — past dates read as completed, future ones as
// scheduled — so the Calendar tab always shows a realistic mix of both. Fixed statuses
// were what let the previous mocks drift into claiming lessons were "scheduled" for
// dates that had already passed.
function fallSeries(
  idPrefix: string,
  studentId: string,
  startHour: number,
  durationMin: number,
  everyNthWeek: number,
  statusOverrides: Record<string, LessonInstance['status']> = {}
): LessonInstance[] {
  const now = Date.now()
  const lessons: LessonInstance[] = []
  for (let i = 0; i < FALL_MONDAYS.length; i += everyNthWeek) {
    const date = FALL_MONDAYS[i]
    const [start] = lessonTs(date, startHour, durationMin)
    const status = statusOverrides[date] ?? (start < now ? 'completed' : 'scheduled')
    lessons.push(
      lesson(
        `${idPrefix}-${i + 1}`,
        studentId,
        date,
        startHour,
        durationMin,
        status,
        MOCK_LOCATION_IDS.school
      )
    )
  }
  return lessons
}

// Fall 2026 (7 Sep – 19 Dec) is the semester in progress.
export const MOCK_LESSON_INSTANCES_FALL: LessonInstance[] = [
  // Ana — weekly Mon 09:00 (45 min), one cancellation early in the term
  ...fallSeries('li-fa-ana', MOCK_STUDENT_IDS.ana, 9, 45, 1, { '2026-09-28': 'canceled' }),
  // Barbara — bi-weekly Mon 10:00 (60 min)
  ...fallSeries('li-fa-bar', MOCK_STUDENT_IDS.barbara, 10, 60, 2),
  // Chris — weekly Mon 11:00 (45 min)
  ...fallSeries('li-fa-chr', MOCK_STUDENT_IDS.chris, 11, 45, 1)
]
