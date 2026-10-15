import { AvailabilityLabel, LABEL_SCORES, LessonInstance, WeeklyAvailability } from './scheduling'
import { busyByDate, remainingAvailability } from './schedulingCapacity'
import { freeBlocksForDate } from './schedulingAlgorithm'

// A partial round places one student around everyone else. What this has to get right is which
// lessons count as in the way — and the answer is the whole mechanism for moving someone: a
// lesson blocks when its student is not in the round.

const MONDAY = '2026-10-19'
const NEXT_MONDAY = '2026-10-26'

function block(dayOfWeek: number, startTime: string, endTime: string) {
  return {
    dayOfWeek,
    startTime,
    endTime,
    label: AvailabilityLabel.AVAILABLE,
    score: LABEL_SCORES[AvailabilityLabel.AVAILABLE]
  }
}

function lesson(
  id: string,
  studentId: string,
  date: string,
  start: string,
  end: string
): LessonInstance {
  return {
    id,
    studentId,
    locationId: 'loc',
    scheduledStart: new Date(`${date}T${start}:00`).getTime(),
    scheduledEnd: new Date(`${date}T${end}:00`).getTime(),
    timezone: 'Europe/Bucharest',
    status: 'scheduled',
    isAdHoc: false,
    isMakeup: false,
    calendarSequence: 0,
    createdAt: 0
  }
}

const AVAILABILITY: WeeklyAvailability = {
  weeklyTemplate: { blocks: [block(0, '15:00', '20:00')] },
  weekOverrides: {}
}

describe('busyByDate', () => {
  // The round's membership is the only control over what may move.
  test('a lesson blocks when its student is not in the round', () => {
    const lessons = [lesson('l1', 'barbara', MONDAY, '17:00', '17:45')]
    expect(busyByDate(lessons, ['diana'], { from: MONDAY, breakMinutes: 0 })).toEqual({
      [MONDAY]: [{ startTime: '17:00', endTime: '17:45' }]
    })
  })

  test('and does not when the round asks that student too', () => {
    const lessons = [lesson('l1', 'barbara', MONDAY, '17:00', '17:45')]
    expect(busyByDate(lessons, ['diana', 'barbara'], { from: MONDAY })).toEqual({})
  })

  test('a round that asks everyone has nothing fixed to work around', () => {
    const lessons = [lesson('l1', 'barbara', MONDAY, '17:00', '17:45')]
    expect(busyByDate(lessons, null, { from: MONDAY })).toEqual({})
  })

  test('cancelled lessons and lessons before the start do not block', () => {
    const lessons = [
      { ...lesson('l1', 'barbara', MONDAY, '17:00', '17:45'), status: 'canceled' as const },
      lesson('l2', 'barbara', '2026-10-12', '17:00', '17:45')
    ]
    expect(busyByDate(lessons, ['diana'], { from: MONDAY })).toEqual({})
  })

  // Without the break the solver proposes a lesson starting the second another ends, which the
  // conflicts panel would then flag — suggesting exactly what the app warns about.
  test('busy time is widened by the minimum break at each end', () => {
    const lessons = [lesson('l1', 'barbara', MONDAY, '17:00', '17:45')]
    expect(busyByDate(lessons, ['diana'], { from: MONDAY, breakMinutes: 10 })).toEqual({
      [MONDAY]: [{ startTime: '16:50', endTime: '17:55' }]
    })
  })
})

describe('freeBlocksForDate', () => {
  test('punches the busy span out of the teacher’s day', () => {
    const busy = busyByDate([lesson('l1', 'barbara', MONDAY, '17:00', '17:45')], ['diana'], {
      from: MONDAY,
      breakMinutes: 0
    })
    expect(freeBlocksForDate(AVAILABILITY, busy, MONDAY)).toEqual([
      expect.objectContaining({ startTime: '15:00', endTime: '17:00' }),
      expect.objectContaining({ startTime: '17:45', endTime: '20:00' })
    ])
  })

  test('leaves a day with no commitments alone', () => {
    expect(freeBlocksForDate(AVAILABILITY, {}, MONDAY)).toEqual([
      expect.objectContaining({ startTime: '15:00', endTime: '20:00' })
    ])
  })
})

describe('remainingAvailability', () => {
  const range = { from: MONDAY, to: '2026-11-01' } // two Mondays: the 19th and the 26th

  // The recurring picker should not offer a time that is taken every single week.
  test('drops a slot taken in every week from the recurring template', () => {
    const lessons = [
      lesson('l1', 'barbara', MONDAY, '17:00', '17:45'),
      lesson('l2', 'barbara', NEXT_MONDAY, '17:00', '17:45')
    ]
    const busy = busyByDate(lessons, ['diana'], { from: MONDAY, breakMinutes: 0 })
    const remaining = remainingAvailability(AVAILABILITY, busy, range)
    expect(remaining.weeklyTemplate.blocks).toEqual([
      expect.objectContaining({ startTime: '15:00', endTime: '17:00' }),
      expect.objectContaining({ startTime: '17:45', endTime: '20:00' })
    ])
  })

  // But a slot taken on one Monday out of two is genuinely free on the other, and the week that
  // has it should say so rather than inherit a template that has given it away.
  test('keeps a slot taken in only some weeks, and frees it in the weeks it is not', () => {
    const lessons = [lesson('l1', 'barbara', MONDAY, '17:00', '17:45')]
    const busy = busyByDate(lessons, ['diana'], { from: MONDAY, breakMinutes: 0 })
    const remaining = remainingAvailability(AVAILABILITY, busy, range)

    expect(remaining.weeklyTemplate.blocks).toEqual([
      expect.objectContaining({ startTime: '15:00', endTime: '20:00' })
    ])
    expect(remaining.weekOverrides[MONDAY].blocks).toEqual([
      expect.objectContaining({ startTime: '15:00', endTime: '17:00' }),
      expect.objectContaining({ startTime: '17:45', endTime: '20:00' })
    ])
    // And the untouched week carries no override at all — it is the template, and saying so
    // fifteen times over would be a term's worth of "same as usual" in the snapshot.
    expect(remaining.weekOverrides[NEXT_MONDAY]).toBeUndefined()
  })
})
