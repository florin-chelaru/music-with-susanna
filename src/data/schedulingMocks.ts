import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  LessonInstance,
  Location,
  SchedulingRound,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  WeeklyAvailability
} from '../util/scheduling'

// ─── IDs ─────────────────────────────────────────────────────────────────────

export const MOCK_TEACHER_ID = 'mock-teacher-001'
export const MOCK_TEACHER_NAME = 'Susanna Johnson-Chelaru'
// Teachers carry a free-text `subject` on their user record (users/{uid}/subject).
export const MOCK_TEACHER_SUBJECT = 'violin'

// Until the student pages are wired to RTDB (Step P) there is no logged-in student to read,
// so the student views render this mock student's data. Chris has a pending submission in the
// open round and lessons in the active semester, which exercises both sections of the page.
export const MOCK_VIEWING_STUDENT_ID = 'student-chris'

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
  chris: 'student-chris',
  diana: 'student-diana',
  elena: 'student-elena',
  flavia: 'student-flavia',
  george: 'student-george'
} as const

export const MOCK_ROUND_ID = 'round-001'

// Display names and emails used by teacher views
export const MOCK_STUDENTS: Record<string, { name: string; email: string }> = {
  [MOCK_STUDENT_IDS.ana]: { name: 'Ana Ionescu', email: 'ana@example.com' },
  [MOCK_STUDENT_IDS.barbara]: { name: 'Barbara Pop', email: 'barbara@example.com' },
  [MOCK_STUDENT_IDS.chris]: { name: 'Chris Munteanu', email: 'chris@example.com' },
  [MOCK_STUDENT_IDS.diana]: { name: 'Diana Radu', email: 'diana@example.com' },
  [MOCK_STUDENT_IDS.elena]: { name: 'Elena Marin', email: 'elena@example.com' },
  [MOCK_STUDENT_IDS.flavia]: { name: 'Flavia Dumitru', email: 'flavia@example.com' },
  [MOCK_STUDENT_IDS.george]: { name: 'George Stan', email: 'george@example.com' }
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
    totalLessons: 20
  },
  {
    studentId: MOCK_STUDENT_IDS.barbara,
    lessonDurationMinutes: 60,
    totalLessons: 10
  },
  {
    studentId: MOCK_STUDENT_IDS.chris,
    lessonDurationMinutes: 45,
    totalLessons: 20
  }
]

// Fall 2026. Diana and Elena joined after round 1 was finalized, which is why the Calendar tab
// has no lessons for them: their first lessons come out of round 2, the round whose suggestions
// are waiting. Five students is also what makes the weight sweep interesting — three were never
// enough to contest the teacher's narrow Tue/Thu windows.
export const MOCK_ENROLLMENTS_FALL: StudentEnrollment[] = [
  {
    studentId: MOCK_STUDENT_IDS.ana,
    lessonDurationMinutes: 45,
    totalLessons: 15
  },
  {
    studentId: MOCK_STUDENT_IDS.barbara,
    lessonDurationMinutes: 60,
    totalLessons: 8
  },
  {
    studentId: MOCK_STUDENT_IDS.chris,
    lessonDurationMinutes: 45,
    totalLessons: 15
  },
  {
    studentId: MOCK_STUDENT_IDS.diana,
    lessonDurationMinutes: 60,
    totalLessons: 12
  },
  {
    studentId: MOCK_STUDENT_IDS.elena,
    lessonDurationMinutes: 45,
    totalLessons: 10
  },
  {
    studentId: MOCK_STUDENT_IDS.flavia,
    lessonDurationMinutes: 45,
    totalLessons: 12
  },
  {
    studentId: MOCK_STUDENT_IDS.george,
    lessonDurationMinutes: 45,
    totalLessons: 15
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

// Diana pulls hardest against the teacher. She can only come on the two days the teacher merely
// tolerates, and her fallback is the Saturday the teacher rates last resort — so there is no
// cheap way to move her, and whoever else wants Tue or Thu has to give way instead.
const DIANA_PREFERENCES = [
  block(1, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Tue preferred
  block(3, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Thu preferred
  block(5, '10:00', '12:00', AvailabilityLabel.AVAILABLE) // Sat available
]

// Elena wants the same Tuesday as Chris and Diana, but unlike Diana she has a Wednesday the
// teacher loves. She is the one the solver moves first as the weight swings towards the teacher,
// which is what makes the middle of the sweep produce schedules rather than one flat answer.
const ELENA_PREFERENCES = [
  block(1, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Tue preferred
  block(2, '11:00', '13:00', AvailabilityLabel.AVAILABLE), // Wed available
  block(4, '09:00', '11:00', AvailabilityLabel.LAST_RESORT) // Fri last resort
]

// The weight only changes the answer where it changes the ranking, and a student's crossover is
// fixed by which labels the two sides put on their options. Chris, Diana and Elena all trade a
// 10-for-the-student/6-for-the-teacher slot against a 6/10 one, and 10 − 4w = 6 + 4w crosses at
// 0.5 — so they all flip at once and the sweep collapses to one hinge however many students
// compete. These two are shaped to cross elsewhere, which is what gives the sweep more bands.

// Saturday mornings are all Flavia can really do, and Saturday is the teacher's last resort:
// 10 − 8w against the 6 + 4w of a weekday she merely tolerates. Crosses at 1/3.
const FLAVIA_PREFERENCES = [
  block(5, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Sat preferred
  block(0, '09:00', '11:00', AvailabilityLabel.AVAILABLE), // Mon available
  block(2, '11:00', '13:00', AvailabilityLabel.AVAILABLE) // Wed available
]

// George wants Thursday, and everything else is a real imposition on him rather than a mild one:
// 10 − 4w against 2 + 8w. Crosses at 2/3, so he gives up Thursday only once the teacher's own
// preference dominates.
const GEORGE_PREFERENCES = [
  block(3, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Thu preferred
  block(4, '09:00', '11:00', AvailabilityLabel.LAST_RESORT), // Fri last resort
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
  },
  [MOCK_STUDENT_IDS.diana]: {
    studentId: MOCK_STUDENT_IDS.diana,
    status: 'submitted',
    submittedAt: NOW - 7 * DAY_MS,
    recurringPreferences: DIANA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.elena]: {
    studentId: MOCK_STUDENT_IDS.elena,
    status: 'submitted',
    submittedAt: NOW - 6 * DAY_MS,
    recurringPreferences: ELENA_PREFERENCES,
    // School trip — one week out, so her term is one lesson short however it is scheduled.
    weekOverrides: { '2026-10-19': { blocks: [] } }
  },
  [MOCK_STUDENT_IDS.flavia]: {
    studentId: MOCK_STUDENT_IDS.flavia,
    status: 'submitted',
    submittedAt: NOW - 6 * DAY_MS,
    recurringPreferences: FLAVIA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.george]: {
    studentId: MOCK_STUDENT_IDS.george,
    status: 'submitted',
    submittedAt: NOW - 5 * DAY_MS,
    recurringPreferences: GEORGE_PREFERENCES,
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
  },
  [MOCK_STUDENT_IDS.diana]: {
    studentId: MOCK_STUDENT_IDS.diana,
    status: 'submitted',
    submittedAt: NOW - 0.2 * DAY_MS,
    recurringPreferences: DIANA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.elena]: {
    studentId: MOCK_STUDENT_IDS.elena,
    status: 'pending',
    recurringPreferences: [],
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.flavia]: {
    studentId: MOCK_STUDENT_IDS.flavia,
    status: 'submitted',
    submittedAt: NOW - 0.1 * DAY_MS,
    recurringPreferences: FLAVIA_PREFERENCES,
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.george]: {
    studentId: MOCK_STUDENT_IDS.george,
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
// There is no suggestion fixture any more. The round page runs the real solver over the
// teacher's availability and the round's submissions, so what the cards show is what the
// algorithm produces. The hand-written fixture that used to live here kept drifting out of
// agreement with the data it was supposed to be derived from.

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

// ─── Lookups ──────────────────────────────────────────────────────────────────
//
// Every page that renders a semester needs the same three lookups, and each had grown its own
// copy of the switch. They live here so adding a semester means touching one file.

export function enrollmentsForSemester(semesterId: string | undefined): StudentEnrollment[] {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_ENROLLMENTS_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_ENROLLMENTS_FALL
  if (semesterId === MOCK_SEMESTER_IDS.spring2027) return MOCK_ENROLLMENTS_SPRING2027
  return []
}

export function roundsForSemester(semesterId: string | undefined): SchedulingRound[] {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_ROUNDS_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_ROUNDS_FALL
  if (semesterId === MOCK_SEMESTER_IDS.spring2027) return MOCK_ROUNDS_SPRING2027
  return []
}

export function lessonsForSemester(semesterId: string | undefined): LessonInstance[] {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_LESSON_INSTANCES_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_LESSON_INSTANCES_FALL
  return []
}
