import {
  AvailabilityBlock,
  findConflict,
  SCHEDULING_CONFIG,
  StudentSubmission,
  SuggestedSlot,
  WeeklyAvailability
} from './scheduling'
import { getEffectiveBlocksForDate, getScoreForSpan } from './schedulingAlgorithm'
import { parseMinutes, toDayOfWeek, weekStartDate } from './schedulingDates'

/**
 * Everything wrong with a schedule, recomputed from the schedule itself.
 *
 * Deliberately not a field on the solver's output. The teacher drags lessons around after the
 * solver has finished, so anything carried forward from it describes a schedule that no longer
 * exists. Recomputing keeps the solver pure and the panel honest after any edit.
 *
 * The teacher is never blocked by this — the minimum break and the availability are constraints
 * for the *algorithm*, and a teacher moving a lesson may have a reason the model knows nothing
 * about. Only a true overlap is impossible; the rest is reported.
 */

export type ConflictKind =
  | 'overlap'
  | 'short_break'
  | 'teacher_week'
  | 'teacher_template'
  | 'student_week'
  | 'student_template'

export interface ScheduleConflict {
  kind: ConflictKind
  studentId: string
  date: string
  startTime: string
  endTime: string
  /** Monday of the week this falls in — the key a week override would be written under. */
  weekStart: string
  /** The lesson on the other side of a collision or a missing break. */
  otherStudentId?: string
}

/** Overlaps are impossible, a missing break is merely tiring, availability is a judgement call. */
const SEVERITY: Record<ConflictKind, number> = {
  overlap: 0,
  teacher_template: 1,
  student_template: 1,
  teacher_week: 2,
  student_week: 2,
  short_break: 3
}

type SlotLike = Pick<SuggestedSlot, 'studentId' | 'date' | 'startTime' | 'endTime'>

/**
 * Whether one side's availability rules a lesson out, and whether it does so in this week only.
 *
 * The distinction decides where the teacher is sent to fix it: a week that disagrees is mended
 * with a week override, while a weekly template that disagrees affects every lesson in the
 * series and has to be mended at the template.
 */
function availabilityVerdict(
  effective: AvailabilityBlock[],
  template: AvailabilityBlock[],
  slot: SlotLike
): 'week' | 'template' | null {
  const minutes = parseMinutes(slot.endTime) - parseMinutes(slot.startTime)
  if (getScoreForSpan(effective, slot.startTime, minutes) > 0) return null
  // The template alone would have allowed it, so this week's override is what rules it out.
  return getScoreForSpan(template, slot.startTime, minutes) > 0 ? 'week' : 'template'
}

export function findScheduleConflicts(
  slots: SlotLike[],
  teacherAvailability: WeeklyAvailability,
  submissions: Record<string, StudentSubmission>
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const describe = (slot: SlotLike) => ({
    studentId: slot.studentId,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    weekStart: weekStartDate(slot.date)
  })

  // ── Lessons against each other ──────────────────────────────────────────────
  // Walked as pairs rather than per lesson, so a collision is one row rather than two saying
  // the same thing from each side.
  const byDate = new Map<string, SlotLike[]>()
  slots.forEach((slot) => {
    const sameDay = byDate.get(slot.date) ?? []
    sameDay.push(slot)
    byDate.set(slot.date, sameDay)
  })

  byDate.forEach((sameDay) => {
    for (let i = 0; i < sameDay.length; i++) {
      for (let j = i + 1; j < sameDay.length; j++) {
        const [first, second] = [sameDay[i], sameDay[j]]
        const overlaps = findConflict(first, [second], 0) !== null
        const crowded = findConflict(first, [second], SCHEDULING_CONFIG.MIN_BREAK_MINUTES) !== null
        if (!overlaps && !crowded) continue
        conflicts.push({
          ...describe(first),
          kind: overlaps ? 'overlap' : 'short_break',
          otherStudentId: second.studentId
        })
      }
    }
  })

  // ── Lessons against what each side said they could do ───────────────────────
  slots.forEach((slot) => {
    const dayOfWeek = toDayOfWeek(slot.date)

    const teacherVerdict = availabilityVerdict(
      getEffectiveBlocksForDate(
        teacherAvailability.weeklyTemplate.blocks,
        teacherAvailability.weekOverrides,
        slot.date
      ),
      teacherAvailability.weeklyTemplate.blocks.filter((b) => b.dayOfWeek === dayOfWeek),
      slot
    )
    if (teacherVerdict) {
      conflicts.push({
        ...describe(slot),
        kind: teacherVerdict === 'week' ? 'teacher_week' : 'teacher_template'
      })
    }

    // A student who has not submitted has said nothing, and silence cannot be contradicted.
    // Flagging their every lesson would bury the conflicts that are real.
    const submission = submissions[slot.studentId]
    if (!submission || submission.status !== 'submitted') return

    const studentVerdict = availabilityVerdict(
      getEffectiveBlocksForDate(
        submission.recurringPreferences,
        submission.weekOverrides,
        slot.date
      ),
      submission.recurringPreferences.filter((b) => b.dayOfWeek === dayOfWeek),
      slot
    )
    if (studentVerdict) {
      conflicts.push({
        ...describe(slot),
        kind: studentVerdict === 'week' ? 'student_week' : 'student_template'
      })
    }
  })

  return conflicts.sort(
    (a, b) =>
      SEVERITY[a.kind] - SEVERITY[b.kind] ||
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime)
  )
}
