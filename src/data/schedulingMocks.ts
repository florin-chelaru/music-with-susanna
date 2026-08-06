import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  LessonInstance,
  Location,
  SchedulingRound,
  ScheduleSuggestion,
  Semester,
  StudentEnrollment,
  StudentSubmission,
  WeeklyAvailability
} from '../util/scheduling'

// ─── IDs ─────────────────────────────────────────────────────────────────────

export const MOCK_TEACHER_ID = 'mock-teacher-001'

export const MOCK_LOCATION_IDS = {
  home: 'loc-home',
  school: 'loc-school'
} as const

export const MOCK_SEMESTER_IDS = {
  spring2026: 'sem-spring2026', // status: active (has lesson instances in progress)
  fall2026: 'sem-fall2026' // status: scheduling (round collecting submissions)
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
    status: 'active',
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
  { studentId: MOCK_STUDENT_IDS.ana, lessonDurationMinutes: 45, totalLessons: 20 },
  { studentId: MOCK_STUDENT_IDS.barbara, lessonDurationMinutes: 60, totalLessons: 10 },
  { studentId: MOCK_STUDENT_IDS.chris, lessonDurationMinutes: 45, totalLessons: 20 }
]

// Fall 2026 (scheduling): same students, same pattern
export const MOCK_ENROLLMENTS_FALL: StudentEnrollment[] = [
  { studentId: MOCK_STUDENT_IDS.ana, lessonDurationMinutes: 45, totalLessons: 15 },
  { studentId: MOCK_STUDENT_IDS.barbara, lessonDurationMinutes: 60, totalLessons: 8 },
  { studentId: MOCK_STUDENT_IDS.chris, lessonDurationMinutes: 45, totalLessons: 15 }
]

// ─── Scheduling round ─────────────────────────────────────────────────────────

export const MOCK_ROUND: SchedulingRound = {
  id: MOCK_ROUND_ID,
  roundNumber: 1,
  status: 'collecting',
  deadline: new Date('2026-08-20T23:59:00+03:00').getTime(),
  createdAt: new Date('2026-08-06T10:00:00+03:00').getTime()
}

// ─── Student submissions ──────────────────────────────────────────────────────

export const MOCK_SUBMISSIONS: Record<string, StudentSubmission> = {
  [MOCK_STUDENT_IDS.ana]: {
    studentId: MOCK_STUDENT_IDS.ana,
    status: 'submitted',
    submittedAt: new Date('2026-08-07T14:30:00+03:00').getTime(),
    recurringPreferences: [
      block(0, '09:00', '11:00', AvailabilityLabel.PREFERRED), // Mon preferred
      block(2, '09:00', '11:00', AvailabilityLabel.AVAILABLE), // Wed available
      block(4, '10:00', '12:00', AvailabilityLabel.LAST_RESORT) // Fri last resort
    ],
    weekOverrides: {}
  },
  [MOCK_STUDENT_IDS.barbara]: {
    studentId: MOCK_STUDENT_IDS.barbara,
    status: 'submitted',
    submittedAt: new Date('2026-08-08T09:15:00+03:00').getTime(),
    recurringPreferences: [
      block(0, '10:00', '12:00', AvailabilityLabel.PREFERRED), // Mon preferred
      block(1, '10:00', '12:00', AvailabilityLabel.AVAILABLE), // Tue available
      block(3, '10:00', '12:00', AvailabilityLabel.AVAILABLE) // Thu available
    ],
    weekOverrides: {
      // Away on a conference — fully unavailable
      '2026-10-05': { blocks: [] }
    }
  },
  [MOCK_STUDENT_IDS.chris]: {
    studentId: MOCK_STUDENT_IDS.chris,
    status: 'pending',
    recurringPreferences: [],
    weekOverrides: {}
  }
}

// ─── Schedule suggestions ─────────────────────────────────────────────────────

// Mon 09:00 for Ana, Mon 10:00 for Barbara (one lesson per week shown for brevity)
const SUGGESTION_SLOTS_TEACHER_BEST = [
  {
    studentId: MOCK_STUDENT_IDS.ana,
    date: '2026-09-07',
    startTime: '09:00',
    endTime: '09:45',
    teacherScore: 10,
    studentScore: 10,
    combinedScore: 10
  },
  {
    studentId: MOCK_STUDENT_IDS.barbara,
    date: '2026-09-07',
    startTime: '10:00',
    endTime: '11:00',
    teacherScore: 10,
    studentScore: 10,
    combinedScore: 10
  },
  {
    studentId: MOCK_STUDENT_IDS.chris,
    date: '2026-09-07',
    startTime: '11:15',
    endTime: '12:00',
    teacherScore: 10,
    studentScore: 6,
    combinedScore: 8.8
  }
]

export const MOCK_SUGGESTIONS: Record<string, ScheduleSuggestion> = {
  teacher_best: {
    slots: SUGGESTION_SLOTS_TEACHER_BEST,
    unscheduledStudentIds: [],
    totalScore: SUGGESTION_SLOTS_TEACHER_BEST.reduce((s, sl) => s + sl.combinedScore, 0)
  },
  student_best: {
    slots: [
      {
        studentId: MOCK_STUDENT_IDS.ana,
        date: '2026-09-07',
        startTime: '09:00',
        endTime: '09:45',
        teacherScore: 10,
        studentScore: 10,
        combinedScore: 10
      },
      {
        studentId: MOCK_STUDENT_IDS.barbara,
        date: '2026-09-07',
        startTime: '10:00',
        endTime: '11:00',
        teacherScore: 10,
        studentScore: 10,
        combinedScore: 10
      },
      {
        studentId: MOCK_STUDENT_IDS.chris,
        date: '2026-09-09',
        startTime: '09:00',
        endTime: '09:45',
        teacherScore: 10,
        studentScore: 10,
        combinedScore: 10
      }
    ],
    unscheduledStudentIds: [],
    totalScore: 30
  },
  balanced: {
    slots: SUGGESTION_SLOTS_TEACHER_BEST,
    unscheduledStudentIds: [],
    totalScore: SUGGESTION_SLOTS_TEACHER_BEST.reduce((s, sl) => s + sl.combinedScore, 0)
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
  status: LessonInstance['status'] = 'completed'
): LessonInstance {
  const [start, end] = lessonTs(isoDate, startHour, durationMin)
  return {
    id,
    studentId,
    locationId: MOCK_LOCATION_IDS.home,
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

export const MOCK_LESSON_INSTANCES: LessonInstance[] = [
  // Ana — weekly Mon 09:00 (45 min)
  lesson('li-ana-1', MOCK_STUDENT_IDS.ana, '2026-02-02', 9, 45, 'completed'),
  lesson('li-ana-2', MOCK_STUDENT_IDS.ana, '2026-02-09', 9, 45, 'completed'),
  lesson('li-ana-3', MOCK_STUDENT_IDS.ana, '2026-02-16', 9, 45, 'completed'),
  lesson('li-ana-4', MOCK_STUDENT_IDS.ana, '2026-02-23', 9, 45, 'canceled'),
  lesson('li-ana-5', MOCK_STUDENT_IDS.ana, '2026-03-02', 9, 45, 'completed'),
  lesson('li-ana-6', MOCK_STUDENT_IDS.ana, '2026-08-10', 9, 45, 'scheduled'),
  lesson('li-ana-7', MOCK_STUDENT_IDS.ana, '2026-08-17', 9, 45, 'scheduled'),

  // Barbara — bi-weekly Mon 10:00 (60 min)
  lesson('li-bar-1', MOCK_STUDENT_IDS.barbara, '2026-02-02', 10, 60, 'completed'),
  lesson('li-bar-2', MOCK_STUDENT_IDS.barbara, '2026-02-16', 10, 60, 'completed'),
  lesson('li-bar-3', MOCK_STUDENT_IDS.barbara, '2026-03-02', 10, 60, 'completed'),
  lesson('li-bar-4', MOCK_STUDENT_IDS.barbara, '2026-08-10', 10, 60, 'scheduled'),

  // Chris — weekly Mon 11:15 (45 min)
  lesson('li-chr-1', MOCK_STUDENT_IDS.chris, '2026-02-02', 11, 45, 'completed'),
  lesson('li-chr-2', MOCK_STUDENT_IDS.chris, '2026-02-09', 11, 45, 'completed'),
  lesson('li-chr-3', MOCK_STUDENT_IDS.chris, '2026-02-16', 11, 45, 'completed'),
  lesson('li-chr-4', MOCK_STUDENT_IDS.chris, '2026-08-10', 11, 45, 'scheduled'),
  lesson('li-chr-5', MOCK_STUDENT_IDS.chris, '2026-08-17', 11, 45, 'scheduled')
]
