import {
  AvailabilityBlock,
  computeCombinedScore,
  findConflict,
  SCHEDULING_CONFIG,
  StudentEnrollment,
  StudentSubmission,
  SuggestedSlot,
  WeeklyAvailability,
  weeklyQuota
} from './scheduling'
import {
  eachDateInRange,
  eachWeekStartInRange,
  formatMinutes,
  parseDate,
  parseMinutes,
  snapUpMinutes,
  toDayOfWeek,
  weekStartDate
} from './schedulingDates'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchedulingInput {
  semesterStart: string // "YYYY-MM-DD"
  semesterEnd: string
  teacherAvailability: WeeklyAvailability
  enrollments: StudentEnrollment[]
  /** Keyed by studentId. A student with no submission simply has no candidates. */
  submissions: Record<string, StudentSubmission>
}

/**
 * One feasible (student, date, start time) triple.
 *
 * The two scores are kept apart rather than blended, because the suggestion engine runs the
 * same candidates at many different weights; the blend is applied when sorting, not here.
 */
export interface Candidate {
  studentId: string
  date: string
  startTime: string
  endTime: string
  teacherScore: number
  studentScore: number
}

export interface PlacedSlot extends SuggestedSlot {
  /** Lessons that recur together share one id, so the UI can move them as a unit. */
  seriesId: string
  /**
   * The solver could not fit this lesson cleanly and placed it anyway. Dropping a student is
   * worse than showing the teacher a problem they can fix, so conflicts are surfaced rather
   * than silently removed.
   */
  conflicted?: boolean
}

export interface SchedulingResult {
  slots: PlacedSlot[]
  /**
   * Lessons the solver could not place anywhere, counted per student.
   *
   * A week the student is away for costs them one lesson; it does not make them unschedulable.
   * A student who misses every lesson is the genuinely unschedulable case, and a caller tells
   * the two apart by whether that student has any slots.
   */
  missedLessonsByStudent: Record<string, number>
  /**
   * Raw sum of the placed lessons' scores, less the gap penalty.
   *
   * Only ever compared between runs at the same weight, to rank and deduplicate the sweep. Each
   * suggestion is optimised at its own weight, so one card's total says nothing against
   * another's and it is deliberately not shown — the per-side averages are.
   */
  totalScore: number
}

export interface WeightedSuggestion extends SchedulingResult {
  /** The teacher-weight range that produces this schedule, inclusive. */
  weightFrom: number
  weightTo: number
}

// ─── Availability queries ─────────────────────────────────────────────────────

/**
 * The availability blocks that actually apply on a given date.
 *
 * A week override replaces the weekly template entirely for that week, in both directions —
 * it can remove availability or add it. An empty block list means the whole week is off.
 *
 * The override key must come from `weekStartDate`, the same function the UI writes them with.
 * A one-day disagreement would silently disable every override rather than fail loudly.
 */
export function getEffectiveBlocksForDate(
  weeklyBlocks: AvailabilityBlock[],
  weekOverrides: Record<string, { blocks: AvailabilityBlock[] }> | undefined,
  date: string
): AvailabilityBlock[] {
  const dayOfWeek = toDayOfWeek(date)
  // Both arguments are defaulted because RTDB discards empty collections: a teacher with no
  // week overrides, or a student who marked none, reads back without the key entirely. Callers
  // normalise at the boundary, but this is pure and called from several places, and the failure
  // it prevents is a crash rather than a wrong answer.
  const override = weekOverrides?.[weekStartDate(date)]
  const source = override ? override.blocks : weeklyBlocks ?? []
  return source.filter((block) => block.dayOfWeek === dayOfWeek)
}

/**
 * The duration-weighted average score across a span, or 0 if any part of it is uncovered.
 *
 * A lesson is only as good as its worst minute: a slot half inside a preferred block and half
 * outside anyone's availability is not usable at all, hence the gap check rather than simply
 * averaging what overlaps.
 */
export function getScoreForSpan(
  blocks: AvailabilityBlock[],
  startTime: string,
  durationMinutes: number
): number {
  const start = parseMinutes(startTime)
  const end = start + durationMinutes

  const relevant = blocks
    .filter((b) => parseMinutes(b.startTime) < end && parseMinutes(b.endTime) > start)
    .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))

  let covered = start
  for (const block of relevant) {
    if (parseMinutes(block.startTime) > covered) return 0 // a hole in the middle
    covered = Math.max(covered, parseMinutes(block.endTime))
  }
  if (covered < end) return 0 // runs off the end

  let weighted = 0
  for (const block of relevant) {
    const overlap =
      Math.min(parseMinutes(block.endTime), end) - Math.max(parseMinutes(block.startTime), start)
    weighted += overlap * block.score
  }
  return weighted / durationMinutes
}

// ─── Candidate generation ─────────────────────────────────────────────────────

/**
 * Every (student, date, start time) triple where both parties are free for the whole lesson.
 *
 * Iterates the teacher's blocks rather than whole days: a lesson can only exist where the
 * teacher is available, so that is the tightest outer bound. If student-only windows ever
 * become meaningful this is the assumption that breaks.
 */
/** A start time both sides can do, with what it is worth to each. */
export interface TimeOption {
  startTime: string
  endTime: string
  teacherScore: number
  studentScore: number
}

/**
 * Every start time on one date that suits both sides, on the snap grid.
 *
 * Shared by the solver and by the pickers that show a teacher where a lesson could go, so the
 * times offered in the UI are by construction the same ones the solver would have considered —
 * a picker that disagreed with the solver about what is possible would be worse than no picker.
 *
 * Both block lists must already be narrowed to the date in question, which is what
 * `getEffectiveBlocksForDate` is for: nothing below re-checks `dayOfWeek`, so passing a whole
 * weekly template would score a Monday lesson against a Wednesday block.
 */
/** A TimeOption with the blend at the weight currently in play, for display. */
export interface ScoredTimeOption extends TimeOption {
  combinedScore: number
}

export function candidatesForDate(
  teacherBlocks: AvailabilityBlock[],
  studentBlocks: AvailabilityBlock[],
  durationMinutes: number
): TimeOption[] {
  const options: TimeOption[] = []
  if (teacherBlocks.length === 0 || studentBlocks.length === 0) return options

  for (const teacherBlock of teacherBlocks) {
    const blockEnd = parseMinutes(teacherBlock.endTime)
    let minute = snapUpMinutes(
      parseMinutes(teacherBlock.startTime),
      SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
    )

    while (minute + durationMinutes <= blockEnd) {
      const startTime = formatMinutes(minute)
      const studentScore = getScoreForSpan(studentBlocks, startTime, durationMinutes)
      const teacherScore = getScoreForSpan(teacherBlocks, startTime, durationMinutes)
      if (studentScore > 0 && teacherScore > 0) {
        options.push({
          startTime,
          endTime: formatMinutes(minute + durationMinutes),
          teacherScore,
          studentScore
        })
      }
      minute += SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
    }
  }
  return options
}

export function generateAllCandidates(input: SchedulingInput): Candidate[] {
  const candidates: Candidate[] = []
  const dates = eachDateInRange(input.semesterStart, input.semesterEnd)

  for (const date of dates) {
    const teacherBlocks = getEffectiveBlocksForDate(
      input.teacherAvailability.weeklyTemplate.blocks,
      input.teacherAvailability.weekOverrides,
      date
    )
    if (teacherBlocks.length === 0) continue

    for (const enrollment of input.enrollments) {
      const submission = input.submissions[enrollment.studentId]
      if (!submission) continue

      const studentBlocks = getEffectiveBlocksForDate(
        submission.recurringPreferences,
        submission.weekOverrides,
        date
      )
      if (studentBlocks.length === 0) continue

      for (const option of candidatesForDate(
        teacherBlocks,
        studentBlocks,
        enrollment.lessonDurationMinutes
      )) {
        candidates.push({ studentId: enrollment.studentId, date, ...option })
      }
    }
  }

  return candidates
}

// ─── Per-week placement ───────────────────────────────────────────────────────

const score = (candidate: Candidate, teacherWeight: number): number =>
  computeCombinedScore(candidate.teacherScore, candidate.studentScore, teacherWeight)

interface WeekPlacement {
  placed: Candidate[]
  score: number
}

/**
 * Place one week's lessons by backtracking, rather than greedily taking each student's best
 * free slot in turn.
 *
 * The greedy pass it replaces could leave a student unplaced because an earlier, less
 * constrained student had already taken the only slot they could use — so "unplaced" did not
 * reliably mean "unplaceable". Here, exhausting the search without a full placement does mean
 * no full placement exists.
 *
 * Placing everybody outranks scoring well: a schedule that seats all five students beats one
 * that seats four of them perfectly.
 *
 * `budget` caps the search so a pathologically tight week cannot hang the browser. When it runs
 * out the best placement found so far is kept, which is never worse than the greedy answer
 * because the greedy answer is the first branch explored.
 */
function solveWeek(
  demands: string[], // one entry per lesson needed, by studentId
  candidatesByStudent: Map<string, Candidate[]>,
  teacherWeight: number,
  budget: { nodes: number }
): WeekPlacement {
  // Most constrained first: fewest options means fewest chances to recover later.
  const ordered = [...demands].sort(
    (a, b) => (candidatesByStudent.get(a)?.length ?? 0) - (candidatesByStudent.get(b)?.length ?? 0)
  )

  // Best candidate still available to each remaining demand, for the optimistic bound.
  const bestPossible = ordered.map((studentId) =>
    (candidatesByStudent.get(studentId) ?? []).reduce(
      (max, candidate) => Math.max(max, score(candidate, teacherWeight)),
      0
    )
  )
  const suffixBound: number[] = new Array(ordered.length + 1).fill(0)
  for (let i = ordered.length - 1; i >= 0; i--) {
    suffixBound[i] = suffixBound[i + 1] + bestPossible[i]
  }

  let best: WeekPlacement = { placed: [], score: 0 }
  const current: Candidate[] = []

  function recurse(index: number, runningScore: number) {
    if (budget.nodes <= 0) return
    budget.nodes--

    if (index === ordered.length) {
      if (
        current.length > best.placed.length ||
        (current.length === best.placed.length && runningScore > best.score)
      ) {
        best = { placed: [...current], score: runningScore }
      }
      return
    }

    // Can this branch still beat the best complete answer? The gap penalty only subtracts, so
    // ignoring it keeps the bound valid, merely looser.
    const optimisticCount = current.length + (ordered.length - index)
    if (optimisticCount < best.placed.length) return
    if (optimisticCount === best.placed.length && runningScore + suffixBound[index] <= best.score) {
      return
    }

    const options = (candidatesByStudent.get(ordered[index]) ?? [])
      .filter((candidate) => findConflict(candidate, current) === null)
      .sort((a, b) => score(b, teacherWeight) - score(a, teacherWeight))

    for (const candidate of options) {
      current.push(candidate)
      recurse(index + 1, runningScore + score(candidate, teacherWeight))
      current.pop()
      if (budget.nodes <= 0) return
    }

    // Leaving this demand unplaced is a legitimate branch: the week may genuinely not fit.
    recurse(index + 1, runningScore)
  }

  recurse(0, 0)
  return best
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Sum of the placed lessons' scores, less a penalty for idle gaps within a day.
 *
 * Without it the solver is indifferent between a compact morning and the same lessons
 * scattered across six hours, which is not how a teacher experiences them.
 */
export function computeTotalScore(slots: PlacedSlot[]): number {
  const base = slots.reduce((sum, slot) => sum + slot.combinedScore, 0)

  const byDate: Record<string, PlacedSlot[]> = {}
  for (const slot of slots) {
    if (!byDate[slot.date]) byDate[slot.date] = []
    byDate[slot.date].push(slot)
  }

  let penalty = 0
  for (const daySlots of Object.values(byDate)) {
    const sorted = [...daySlots].sort(
      (a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime)
    )
    for (let i = 1; i < sorted.length; i++) {
      const gap = parseMinutes(sorted[i].startTime) - parseMinutes(sorted[i - 1].endTime)
      if (gap > SCHEDULING_CONFIG.GAP_PENALTY_THRESHOLD_MINUTES) {
        penalty +=
          (gap - SCHEDULING_CONFIG.GAP_PENALTY_THRESHOLD_MINUTES) *
          SCHEDULING_CONFIG.GAP_PENALTY_PER_MINUTE
      }
    }
  }

  return Math.round((base - penalty) * 10) / 10
}

// ─── Whole-semester schedule ──────────────────────────────────────────────────

/**
 * Lessons that recur together get one id, so dragging one in the editor moves the series.
 *
 * Grouping is by student, weekday and start time. Inferring it later would not work: a student
 * with two lessons a week has two series whose grouping key changes the moment one is dragged.
 * Stamping it here, where the solver knows what it placed, is the only stable point.
 */
function assignSeriesIds(slots: Array<Omit<PlacedSlot, 'seriesId'>>): PlacedSlot[] {
  const ids = new Map<string, string>()
  return slots.map((slot) => {
    const key = `${slot.studentId}|${toDayOfWeek(slot.date)}|${slot.startTime}`
    if (!ids.has(key)) ids.set(key, `series-${ids.size + 1}`)
    return { ...slot, seriesId: ids.get(key) as string }
  })
}

/** Build one schedule at one teacher weight. */
export function computeSchedule(
  input: SchedulingInput,
  candidates: Candidate[],
  teacherWeight: number
): SchedulingResult {
  const weeks = eachWeekStartInRange(input.semesterStart, input.semesterEnd)
  const semesterEnd = parseDate(input.semesterEnd)
  const semesterStart = parseDate(input.semesterStart)

  const quotas = new Map<string, number[]>(
    input.enrollments.map((enrollment) => [
      enrollment.studentId,
      weeklyQuota(enrollment.totalLessons, weeks.length, enrollment.distribution)
    ])
  )

  const placed: Array<Omit<PlacedSlot, 'seriesId'>> = []
  const missedLessonsByStudent: Record<string, number> = {}

  weeks.forEach((weekStart, weekIndex) => {
    // The first and last weeks of a semester are usually partial.
    const weekEnd = parseDate(weekStart).add(6, 'day')
    const from = parseDate(weekStart).isBefore(semesterStart, 'day')
      ? input.semesterStart
      : weekStart
    const to = weekEnd.isAfter(semesterEnd, 'day')
      ? input.semesterEnd
      : weekEnd.format('YYYY-MM-DD')
    const datesThisWeek = new Set(eachDateInRange(from, to))

    const demands: string[] = []
    const candidatesByStudent = new Map<string, Candidate[]>()
    for (const enrollment of input.enrollments) {
      const needed = quotas.get(enrollment.studentId)?.[weekIndex] ?? 0
      if (needed <= 0) continue
      for (let i = 0; i < needed; i++) demands.push(enrollment.studentId)
      candidatesByStudent.set(
        enrollment.studentId,
        candidates.filter((c) => c.studentId === enrollment.studentId && datesThisWeek.has(c.date))
      )
    }
    if (demands.length === 0) return

    const budget = { nodes: SCHEDULING_CONFIG.MAX_SEARCH_NODES_PER_WEEK }
    const placement = solveWeek(demands, candidatesByStudent, teacherWeight, budget)

    placement.placed.forEach((candidate) => {
      placed.push({
        ...candidate,
        combinedScore: score(candidate, teacherWeight)
      })
    })

    // Whatever the search could not fit is shown as a conflicted lesson rather than dropped —
    // a problem the teacher can see and move is more useful than a student who vanished. A week
    // offering the student no candidate at all costs them that one lesson, counted below.
    const shortfall = new Map<string, number>()
    demands.forEach((studentId) => shortfall.set(studentId, (shortfall.get(studentId) ?? 0) + 1))
    placement.placed.forEach((candidate) =>
      shortfall.set(candidate.studentId, (shortfall.get(candidate.studentId) ?? 0) - 1)
    )

    shortfall.forEach((missing, studentId) => {
      for (let i = 0; i < missing; i++) {
        const fallback = (candidatesByStudent.get(studentId) ?? [])
          .slice()
          .sort((a, b) => score(b, teacherWeight) - score(a, teacherWeight))[0]
        if (!fallback) {
          missedLessonsByStudent[studentId] = (missedLessonsByStudent[studentId] ?? 0) + 1
          continue
        }
        placed.push({
          ...fallback,
          combinedScore: score(fallback, teacherWeight),
          conflicted: true
        })
      }
    })
  })

  const slots = assignSeriesIds(placed)
  return { slots, missedLessonsByStudent, totalScore: computeTotalScore(slots) }
}

/**
 * Every distinct schedule the teacher-weight sweep can reach.
 *
 * The outcome is piecewise-constant in the weight — there are finitely many candidate
 * assignments — so a slider would sit motionless through wide stretches and three fixed
 * strategies would be arbitrary samples. Sweeping and deduplicating returns the schedules that
 * genuinely exist, each tagged with the weight range that produces it.
 */
export function generateAllSuggestions(input: SchedulingInput): WeightedSuggestion[] {
  const candidates = generateAllCandidates(input)
  const step = SCHEDULING_CONFIG.WEIGHT_SWEEP_STEP

  const suggestions: WeightedSuggestion[] = []
  let previousSignature: string | null = null

  for (
    let weight = SCHEDULING_CONFIG.WEIGHT_SWEEP_MIN;
    weight <= SCHEDULING_CONFIG.WEIGHT_SWEEP_MAX + 1e-9;
    weight += step
  ) {
    const rounded = Math.round(weight * 100) / 100
    const result = computeSchedule(input, candidates, rounded)
    const signature = result.slots
      .map((slot) => `${slot.studentId}@${slot.date}T${slot.startTime}`)
      .sort()
      .join('|')

    if (signature === previousSignature) {
      suggestions[suggestions.length - 1].weightTo = rounded
      continue
    }
    previousSignature = signature
    suggestions.push({ ...result, weightFrom: rounded, weightTo: rounded })
  }

  // Most teacher-favouring first, so the row of cards reads as a spectrum.
  return suggestions.reverse()
}

/**
 * At most `max` suggestions, always including the two extremes and an even spread between.
 *
 * Showing every distinct schedule would not fit on screen, and dropping the tail would hide
 * the most student-favouring option, which is half the point of offering a choice.
 */
export function pickSpread<T>(suggestions: T[], max: number = 10): T[] {
  if (suggestions.length <= max) return suggestions
  const picked: T[] = []
  for (let i = 0; i < max; i++) {
    picked.push(suggestions[Math.round((i * (suggestions.length - 1)) / (max - 1))])
  }
  return picked
}
