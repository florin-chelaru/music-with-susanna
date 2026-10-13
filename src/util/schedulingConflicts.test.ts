import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  StudentSubmission,
  WeeklyAvailability
} from './scheduling'
import { findScheduleConflicts } from './schedulingConflicts'

const MON = 0

function block(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  label: AvailabilityLabel = AvailabilityLabel.PREFERRED
): AvailabilityBlock {
  return { dayOfWeek, startTime, endTime, label, score: LABEL_SCORES[label] }
}

function slot(studentId: string, startTime: string, endTime: string, date = '2026-01-05') {
  return { studentId, date, startTime, endTime }
}

// Monday 5 January 2026. The teacher works Monday mornings; Ana can do the same window.
const teacher: WeeklyAvailability = {
  weeklyTemplate: { blocks: [block(MON, '09:00', '12:00')] },
  weekOverrides: {}
}

const submissions: Record<string, StudentSubmission> = {
  ana: {
    studentId: 'ana',
    status: 'submitted',
    recurringPreferences: [block(MON, '09:00', '12:00')],
    weekOverrides: {}
  }
}

describe('findScheduleConflicts', () => {
  test('says nothing about a schedule that fits', () => {
    const conflicts = findScheduleConflicts([slot('ana', '09:00', '09:45')], teacher, submissions)
    expect(conflicts).toEqual([])
  })

  // Two lessons at once is the one thing the editor refuses outright, so it has to be told
  // apart from merely tight scheduling.
  test('tells a collision apart from a missing break, and reports each pair once', () => {
    const collide = findScheduleConflicts(
      [slot('ana', '09:00', '09:45'), slot('bob', '09:30', '10:15')],
      teacher,
      submissions
    )
    expect(collide.filter((c) => c.kind === 'overlap')).toHaveLength(1)

    // 5 minutes between lessons, under MIN_BREAK_MINUTES of 10.
    const crowded = findScheduleConflicts(
      [slot('ana', '09:00', '09:45'), slot('bob', '09:50', '10:35')],
      teacher,
      submissions
    )
    expect(crowded.filter((c) => c.kind === 'short_break')).toHaveLength(1)
    expect(crowded.filter((c) => c.kind === 'overlap')).toEqual([])
  })

  // The distinction decides where the teacher is sent: a week override is mended in that week,
  // a weekly template affects every lesson in the series.
  test('separates a week that disagrees from a template that does', () => {
    const awayThatWeek: WeeklyAvailability = {
      weeklyTemplate: { blocks: [block(MON, '09:00', '12:00')] },
      weekOverrides: { '2026-01-05': { blocks: [] } }
    }
    const week = findScheduleConflicts([slot('ana', '09:00', '09:45')], awayThatWeek, submissions)
    expect(week.map((c) => c.kind)).toEqual(['teacher_week'])
    expect(week[0].weekStart).toBe('2026-01-05')

    // 14:00 is outside the template entirely, so every Monday would be wrong.
    const template = findScheduleConflicts([slot('ana', '14:00', '14:45')], teacher, submissions)
    expect(template.map((c) => c.kind)).toContain('teacher_template')
  })

  test('reports the student side as well as the teacher side', () => {
    const awayStudent: Record<string, StudentSubmission> = {
      ana: { ...submissions.ana, weekOverrides: { '2026-01-05': { blocks: [] } } }
    }
    const conflicts = findScheduleConflicts([slot('ana', '09:00', '09:45')], teacher, awayStudent)
    expect(conflicts.map((c) => c.kind)).toEqual(['student_week'])
  })

  // A student who never submitted has said nothing, and flagging their every lesson would bury
  // the conflicts that are real.
  test('stays quiet about a student who has not submitted', () => {
    const pending: Record<string, StudentSubmission> = {
      ana: { studentId: 'ana', status: 'pending', recurringPreferences: [], weekOverrides: {} }
    }
    expect(findScheduleConflicts([slot('ana', '09:00', '09:45')], teacher, pending)).toEqual([])
  })

  test('puts the impossible before the merely awkward', () => {
    const conflicts = findScheduleConflicts(
      [slot('ana', '14:00', '14:45'), slot('bob', '09:00', '09:45'), slot('cid', '09:30', '10:15')],
      teacher,
      submissions
    )
    expect(conflicts[0].kind).toBe('overlap')
  })
})
