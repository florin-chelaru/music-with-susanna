import dayjs from 'dayjs'
import {
  AvailabilityBlock,
  AvailabilityLabel,
  BusyByDate,
  BusyInterval,
  LessonInstance,
  removeOverlaps,
  SCHEDULING_CONFIG,
  WeeklyAvailability
} from './scheduling'
import { freeBlocksForDate } from './schedulingAlgorithm'
import {
  eachDateInRange,
  formatDate,
  weekStartOf,
  formatMinutes,
  parseMinutes,
  toDayOfWeek,
  weekStartDate
} from './schedulingDates'

// What is left of a teacher's week once the lessons already standing are taken out.
//
// A round that only asks some of the studio has to place them around everyone else. The same
// question — what capacity is left? — is asked twice: by the picker the student fills in, and by
// the solve that places them. Both come from here, so they cannot disagree about what is free.
//
// A lesson blocks the round when its student is *not* in it. That is the whole mechanism for
// moving someone: put them in the round and their time stops being fixed, leave them out and it
// does not move.

export interface BusyOptions {
  /** Nothing before this date blocks: a round never places into weeks that have already run. */
  from: string
  /**
   * Widened by the minimum break at each end.
   *
   * Without it the solver proposes a lesson starting the moment another ends, which
   * `ConflictsPanel` then flags — suggesting what the app immediately warns about. The teacher can
   * still place one by hand and be warned; the solver should not offer it.
   */
  breakMinutes?: number
}

/** Clamped, because a lesson at 08:00 widened by ten minutes must not wrap to the previous day. */
function shift(time: string, minutes: number): string {
  return formatMinutes(Math.min(24 * 60 - 1, Math.max(0, parseMinutes(time) + minutes)))
}

/**
 * The Monday a partial round schedules from.
 *
 * Nobody is placed into the week they were asked in. Defined once because three things have to
 * agree on it — the lesson count a late joiner is enrolled with, the capacity they are shown, and
 * the dates the solver may use. Two of those disagreeing is a student promised a number of
 * lessons the timetable cannot give them.
 */
export function partialRoundStart(now: number = Date.now()): string {
  return formatDate(weekStartOf(dayjs(now).add(7, 'day')))
}

/**
 * The lessons that stand in a round's way.
 *
 * `roundStudentIds` is the round's membership: `null` means the round asks everyone, so nothing is
 * fixed and nothing blocks.
 */
export function busyByDate(
  lessons: LessonInstance[],
  roundStudentIds: string[] | null,
  options: BusyOptions
): BusyByDate {
  if (roundStudentIds === null) return {}
  const inRound = new Set(roundStudentIds)
  const breakMinutes = options.breakMinutes ?? SCHEDULING_CONFIG.MIN_BREAK_MINUTES
  const busy: BusyByDate = {}

  lessons.forEach((lesson) => {
    if (lesson.status === 'canceled') return
    if (inRound.has(lesson.studentId)) return
    const date = formatDate(dayjs(lesson.scheduledStart))
    if (date < options.from) return
    const start = dayjs(lesson.scheduledStart).format('HH:mm')
    const end = dayjs(lesson.scheduledEnd).format('HH:mm')
    busy[date] = [
      ...(busy[date] ?? []),
      { startTime: shift(start, -breakMinutes), endTime: shift(end, breakMinutes) }
    ]
  })

  return busy
}
/**
 * The teacher's availability as a student in this round should see it.
 *
 * Shaped as a `WeeklyAvailability` because that is what the pickers draw: a recurring template
 * with per-week exceptions.
 *
 * The template gives up only what is taken in *every* week — a slot gone on all ten Tuesdays is
 * not a recurring choice to offer. One taken on three of them stays: the solver places lessons on
 * dates, so it simply uses the other seven, and hiding the whole weekday would cost the student
 * six good Tuesdays to avoid three bad ones. The weeks that differ carry an override, for anyone
 * who wants to see exactly which.
 */
export function remainingAvailability(
  availability: WeeklyAvailability,
  busy: BusyByDate,
  range: { from: string; to: string }
): WeeklyAvailability {
  const dates = eachDateInRange(range.from, range.to)

  // Resolved once per date; everything below is a different view of the same answer.
  const freeByDate = new Map(
    dates.map((date) => [date, freeBlocksForDate(availability, busy, date)])
  )
  const shapeOf = (blocks: AvailabilityBlock[]): string =>
    blocks
      .map((block) => `${block.dayOfWeek}|${block.startTime}|${block.endTime}`)
      .sort()
      .join(',')

  // Dates grouped by weekday, because "busy every week" is a question about one weekday's
  // occurrences — and a term ending mid-week has fewer Fridays than Mondays.
  const datesByWeekday = new Map<number, string[]>()
  dates.forEach((date) => {
    const weekday = toDayOfWeek(date)
    datesByWeekday.set(weekday, [...(datesByWeekday.get(weekday) ?? []), date])
  })

  let template = availability.weeklyTemplate.blocks
  datesByWeekday.forEach((weekdayDates, weekday) => {
    // The running intersection of each date's busy time: what is left at the end is the time
    // taken on every one of them, and only that is dropped from the recurring view.
    let alwaysBusy: AvailabilityBlock[] | null = null
    weekdayDates.forEach((date) => {
      const today = (busy[date] ?? []).map((interval) => asBlock(weekday, interval))
      alwaysBusy =
        alwaysBusy === null ? today : alwaysBusy.flatMap((block) => intersect(block, today))
    })
    ;(alwaysBusy ?? []).forEach((interval) => {
      template = removeOverlaps(template, interval)
    })
  })

  // A week only needs an override where it differs from that template.
  const weekOverrides: Record<string, { blocks: AvailabilityBlock[] }> = {}
  dates.forEach((date) => {
    const week = weekStartDate(date)
    weekOverrides[week] = {
      blocks: [...(weekOverrides[week]?.blocks ?? []), ...(freeByDate.get(date) ?? [])]
    }
  })
  Object.keys(weekOverrides).forEach((week) => {
    const weekdays = new Set(
      dates.filter((date) => weekStartDate(date) === week).map((date) => toDayOfWeek(date))
    )
    const fromTemplate = template.filter((block) => weekdays.has(block.dayOfWeek))
    if (shapeOf(weekOverrides[week].blocks) === shapeOf(fromTemplate)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete weekOverrides[week]
    }
  })

  return { weeklyTemplate: { blocks: template }, weekOverrides }
}

/** A busy interval as a block, which is the shape both `intersect` and `removeOverlaps` take. */
function asBlock(dayOfWeek: number, interval: BusyInterval): AvailabilityBlock {
  return {
    dayOfWeek,
    startTime: interval.startTime,
    endTime: interval.endTime,
    // Only the span is ever read off these.
    label: AvailabilityLabel.UNAVAILABLE,
    score: 0
  }
}

/** The parts of `block` that `other` still covers. */
function intersect(block: AvailabilityBlock, free: AvailabilityBlock[]): AvailabilityBlock[] {
  const start = parseMinutes(block.startTime)
  const end = parseMinutes(block.endTime)
  return free
    .filter((other) => other.dayOfWeek === block.dayOfWeek)
    .map((other) => ({
      ...block,
      startTime: formatMinutes(Math.max(start, parseMinutes(other.startTime))),
      endTime: formatMinutes(Math.min(end, parseMinutes(other.endTime)))
    }))
    .filter((part) => parseMinutes(part.startTime) < parseMinutes(part.endTime))
}
