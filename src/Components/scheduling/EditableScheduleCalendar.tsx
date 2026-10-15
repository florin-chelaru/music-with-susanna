import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ScheduleIcon from '@mui/icons-material/Schedule'
import UndoIcon from '@mui/icons-material/Undo'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import { SyntheticEvent, useContext, useMemo, useRef, useState } from 'react'
import { Calendar, View, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale, toDayjsLocale } from '../../util/SupportedLocale'
import { localizer } from '../../util/calendarLocalizer'
import { calendarShellSx, monthAgendaSx, timeGridSx } from './calendarStyles'
import {
  AvailabilityLabel,
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  EditableSlot,
  LessonInstance,
  LABEL_SCORES,
  OriginalPlacement,
  reverted,
  sameTime,
  SCHEDULING_CONFIG,
  SlotScores,
  SlotTime,
  findConflict,
  studentName
} from '../../util/scheduling'
import {
  daysBetween,
  formatDate,
  parseDate,
  parseMinutes,
  slotDateTime
} from '../../util/schedulingDates'
import CalendarToolbar from './CalendarToolbar'
import ConflictsPanel from './ConflictsPanel'
import MoveLessonDialog from './MoveLessonDialog'
import { ScoredTimeOption } from '../../util/schedulingAlgorithm'
import { ScheduleConflict } from '../../util/schedulingConflicts'
import { SatisfactionSummary, scoreColor, ScoreLegend } from './scoreDisplay'

// Re-exported so the pages that render this calendar keep importing the slot shape from the
// component they hand it to, rather than reaching past it into the domain module.
export type { EditableSlot } from '../../util/scheduling'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface EditableScheduleCalendarTexts {
  conflictWith: (name: string) => string
  month: string
  week: string
  agenda: string
  today: string
  back: string
  next: string
  date: string
  time: string
  lesson: string
  noLessons: string
  changedOne: string
  changedMany: (count: number) => string
  resetAll: string
  moveTo: string
  revertToSuggestion: string
  removeLesson: string
  needTimeOne: string
  needTimeMany: (count: number) => string
  scheduleIt: string
  averages: string
  satisfactionYou: string
  satisfactionStudents: string
  legend: string
  legendChannels: string
  legendOthers: string
  legendPreferred: string
  legendAvailable: string
  legendLastResort: string
}

const EN_US: EditableScheduleCalendarTexts = {
  conflictWith: (name) => `That time overlaps ${name}.`,
  month: 'Month',
  week: 'Week',
  agenda: 'Agenda',
  today: 'Today',
  back: 'Back',
  next: 'Next',
  date: 'Date',
  time: 'Time',
  lesson: 'Lesson',
  noLessons: 'No lessons in this range.',
  changedOne: '1 lesson moved',
  changedMany: (count) => `${count} lessons moved`,
  resetAll: 'Undo all',
  moveTo: 'Move to…',
  revertToSuggestion: 'Revert to suggestion',
  removeLesson: 'Remove this lesson',
  needTimeOne: 'One lesson still needs a time',
  needTimeMany: (count) => `${count} lessons still need a time`,
  scheduleIt: 'Schedule',
  averages: 'Average satisfaction, as edited',
  satisfactionYou: 'You',
  satisfactionStudents: 'Your students',
  legend: 'Colour scale:',
  legendChannels:
    "A lesson is filled with the student's rating. Its left edge, and the shading behind the week, are yours.",
  legendOthers:
    'Greyed lessons belong to students this round did not ask. They stay where they are.',
  legendPreferred: 'Preferred',
  legendAvailable: 'Available',
  legendLastResort: 'Last Resort'
}

const RO_RO: EditableScheduleCalendarTexts = {
  conflictWith: (name) => `Ora se suprapune cu ${name}.`,
  month: 'Lună',
  week: 'Săptămână',
  agenda: 'Agendă',
  today: 'Astăzi',
  back: 'Înapoi',
  next: 'Înainte',
  date: 'Data',
  time: 'Ora',
  lesson: 'Lecție',
  noLessons: 'Nicio lecție în acest interval.',
  changedOne: 'O lecție mutată',
  changedMany: (count) => `${count} lecții mutate`,
  resetAll: 'Anulează tot',
  moveTo: 'Mută la…',
  revertToSuggestion: 'Revino la propunere',
  removeLesson: 'Șterge lecția',
  needTimeOne: 'O lecție așteaptă o oră',
  needTimeMany: (count) => `${count} lecții așteaptă o oră`,
  scheduleIt: 'Programează',
  averages: 'Satisfacție medie, după modificări',
  satisfactionYou: 'Tu',
  satisfactionStudents: 'Elevii tăi',
  legend: 'Scara de culori:',
  legendChannels:
    'Lecția este colorată după preferința elevului. Marginea din stânga și fundalul săptămânii arată preferința ta.',
  legendOthers:
    'Lecțiile estompate sunt ale elevilor pe care runda nu i-a întrebat. Ele rămân pe loc.',
  legendPreferred: 'Preferat',
  legendAvailable: 'Disponibil',
  legendLastResort: 'Doar la nevoie'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Types ────────────────────────────────────────────────────────────────────

/** One lesson as react-big-calendar sees it, with the slot it came from carried along. */
interface SlotEvent {
  /** -1 for a context lesson, which belongs to no editable slot. */
  index: number
  title: string
  start: Date
  end: Date
  slot: EditableSlot
  /**
   * A lesson this round does not own: someone the teacher did not ask, shown so a partial round
   * is adjusted against a week that looks like the week, rather than one empty but for the
   * student being placed. Never draggable, never selectable.
   */
  context?: boolean
}

/**
 * A standing lesson in the shape of an editable slot, so one renderer draws both.
 *
 * The scores are zero rather than computed: this round never asked anyone about this time, and a
 * score would claim a judgement nobody made. Nothing reads them — `eventPropGetter` returns early
 * for a context event.
 */
function contextSlot(lesson: LessonInstance): EditableSlot {
  return {
    studentId: lesson.studentId,
    date: formatDate(dayjs(lesson.scheduledStart)),
    startTime: dayjs(lesson.scheduledStart).format('HH:mm'),
    endTime: dayjs(lesson.scheduledEnd).format('HH:mm'),
    teacherScore: 0,
    studentScore: 0,
    combinedScore: 0
  }
}

/** A lesson the student is owed that has no time yet. */
export interface UnscheduledLesson {
  studentId: string
  /** Where the picker opens, and the length the lesson will have. */
  seed: SlotTime
}

export interface EditableScheduleCalendarProps {
  slots: EditableSlot[]
  students: Record<string, { name: string }>
  onChange: (slots: EditableSlot[]) => void
  defaultDate?: Date
  /** Lessons the solver could not place and the teacher has not placed yet. */
  unscheduled?: UnscheduledLesson[]
  /**
   * Lessons belonging to students this round did not ask, drawn faded and untouchable.
   *
   * A partial round places one person around everyone else, and the times it must avoid are
   * invisible without this — the teacher would be moving a lesson around a week that looks free
   * and is not.
   */
  contextLessons?: LessonInstance[]
  /**
   * Rates a time for a student. The calendar holds no availability of its own, so placing or
   * moving a lesson asks the caller what the new time is worth — without this a hand-placed
   * lesson would wear a score nobody computed.
   */
  scoreAt?: (studentId: string, time: SlotTime) => SlotScores
  /**
   * Every start time on a date where this student and the teacher overlap, before accounting
   * for lessons already placed — this component owns those and filters them out itself.
   */
  overlappingTimes?: (
    studentId: string,
    date: string,
    durationMinutes: number
  ) => ScoredTimeOption[]
  /**
   * The teacher's own rating of a point in the grid, for the shading behind the week view.
   * Without it the week view simply has no wash; the lessons still carry both scores.
   */
  teacherScoreAt?: (date: string, startTime: string) => number
  /**
   * Everything wrong with `slots` as they stand, recomputed by the caller after every edit.
   * Reported, never enforced — only a true overlap is refused, and that happens on the drag.
   */
  conflicts?: ScheduleConflict[]
  /** The semester's teaching hours. Defaults exist so a caller without a semester still renders. */
  dayStartHour?: number
  dayEndHour?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar as any)

const pad = (n: number): string => String(n).padStart(2, '0')
const timeOf = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/**
 * One lesson, as two lines: who it is with, then when.
 *
 * The library stacks the time above the title in a week column and omits it from the month view
 * entirely. A week column is also too narrow to hold a time range beside a name, so the interval
 * ends up clipped mid-digit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SlotEventBlock({ event, title }: { event: any; title: string }) {
  // Typed against react-big-calendar's own Event, so the concrete type is recovered by a cast —
  // the same approach the drag and selection handlers use.
  const slot = (event as SlotEvent).slot
  return (
    <Box sx={{ lineHeight: 1.25, overflow: 'hidden' }}>
      <Box sx={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</Box>
      <Box sx={{ fontSize: '0.6875rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
        {slot.startTime}–{slot.endTime}
      </Box>
    </Box>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditableScheduleCalendar({
  slots,
  students,
  contextLessons,
  onChange,
  defaultDate,
  unscheduled = [],
  scoreAt,
  overlappingTimes,
  teacherScoreAt,
  conflicts = [],
  dayStartHour = DEFAULT_DAY_START_HOUR,
  dayEndHour = DEFAULT_DAY_END_HOUR
}: EditableScheduleCalendarProps) {
  const theme = useTheme()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(EditableScheduleCalendar.name, TEXTS), [])
  const t = localeManager.componentStrings(
    EditableScheduleCalendar.name
  ) as EditableScheduleCalendarTexts
  dayjs.locale(toDayjsLocale(localeManager.locale))

  // Month first, matching the lesson calendar. A term is three or four months long, and
  // stepping through it a week at a time was the only way to see what the solver produced.
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState<Date>(defaultDate ?? new Date())

  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ index: number; anchor: HTMLElement } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  // The lesson the Move dialog is editing, kept apart from `selected` so closing the menu does
  // not close the dialog it opened.
  const [moving, setMoving] = useState<number | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  // The outstanding lesson being given a time, as an index into `unscheduled`.
  const [scheduling, setScheduling] = useState<number | null>(null)

  const messages = useMemo(
    () => ({
      month: t.month,
      week: t.week,
      day: t.lesson,
      agenda: t.agenda,
      today: t.today,
      previous: t.back,
      next: t.next,
      date: t.date,
      time: t.time,
      event: t.lesson,
      noEventsInRange: t.noLessons
    }),
    [t]
  )

  const events: SlotEvent[] = useMemo(() => {
    const own = slots.map((slot, index) => ({
      index,
      title: studentName(students, slot.studentId),
      start: slotDateTime(slot.date, slot.startTime).toDate(),
      end: slotDateTime(slot.date, slot.endTime).toDate(),
      slot
    }))
    // Given the same shape as an editable slot so one renderer serves both; `index: -1` and the
    // `context` flag are what keep them out of every handler.
    const others = (contextLessons ?? []).map((lesson) => ({
      index: -1,
      title: studentName(students, lesson.studentId),
      start: new Date(lesson.scheduledStart),
      end: new Date(lesson.scheduledEnd),
      context: true,
      slot: contextSlot(lesson)
    }))
    return [...own, ...others]
  }, [slots, students, contextLessons])

  // The agenda has no navigation, so it has to cover every lesson or the rest would be
  // unreachable from it.
  const agenda = useMemo(() => {
    if (events.length === 0) return { date, length: 30 }
    const starts = events.map((event) => event.start.getTime())
    const first = new Date(Math.min(...starts))
    const last = new Date(Math.max(...starts))
    return { date: first, length: Math.max(1, daysBetween(first, last) + 1) }
  }, [events, date])

  // react-big-calendar types this callback against its own Event, so the concrete event type
  // is recovered by a cast — the same approach AvailabilityCalendar uses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventPropGetter = (raw: any) => {
    const event = raw as SlotEvent
    // Two preferences, two channels. A single blended colour could not tell "the student is
    // delighted and I am not" from "I am delighted and the student is not" — both average out
    // to the same middling colour, and that difference is the whole point of the schedule.
    // A context lesson wears no score: it is not this round's to judge, and colouring it would
    // claim the teacher had rated a time they were never asked about.
    if (event.context === true) {
      return {
        style: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(${alpha(theme.palette.text.disabled, 0.12)}, ${alpha(
            theme.palette.text.disabled,
            0.12
          )})`,
          borderLeft: `3px solid ${theme.palette.divider}`,
          color: theme.palette.text.secondary,
          opacity: 0.55,
          cursor: 'default'
        }
      }
    }
    const fill = scoreColor(theme, event.slot.studentScore)
    const accent = scoreColor(theme, event.slot.teacherScore)
    // The colours are accurate — a move rescores the lesson against its new time. The fade is
    // purely "you changed this", so the teacher can pick their own edits out of the grid.
    const moved = event.slot.moved === true
    return {
      style: {
        // Opaque, with the tint laid on as a flat gradient. A translucent fill would let the
        // availability wash behind the grid show through and shift the lesson's own colour —
        // the same trap the availability calendar's two stacked layers fell into.
        backgroundColor: theme.palette.background.paper,
        backgroundImage: `linear-gradient(${alpha(fill, moved ? 0.1 : 0.2)}, ${alpha(
          fill,
          moved ? 0.1 : 0.2
        )})`,
        borderLeft: `3px solid ${moved ? alpha(accent, 0.5) : accent}`,
        color: theme.palette.text.primary,
        opacity: moved ? 0.65 : 1
      }
    }
  }

  // The teacher's own availability, washed faintly behind the time grid. It shows whose
  // preference a lesson is sitting on, and — just as useful — which free hours are worth
  // dragging something into.
  //
  // react-big-calendar calls this per slot of the time grid; month and agenda have no time
  // axis and never reach it, which is why the lessons carry the teacher's score as well.
  const slotPropGetter = (slotDate: Date) => {
    const score = teacherScoreAt?.(formatDate(slotDate), timeOf(slotDate)) ?? 0
    if (score <= 0) return {}
    return { style: { backgroundColor: alpha(scoreColor(theme, score), 0.1) } }
  }

  // Applies a move or resize, or refuses it and says what it hit.
  //
  // Only a genuine overlap is refused — two lessons at once is impossible, not a preference.
  // MIN_BREAK_MINUTES is passed as 0 on purpose: the break is a constraint for the algorithm
  // to respect when it generates a schedule, not a rule to impose on the teacher. Dropping
  // one lesson immediately after another is a legitimate thing to want.
  const nameOf = (studentId: string): string => studentName(students, studentId)

  function conflictMessage(index: number, candidate: SlotTime): string | null {
    const others = slots.filter((_, i) => i !== index)
    const clash = findConflict(candidate, others, 0)
    return clash ? t.conflictWith(nameOf(clash.studentId)) : null
  }

  function applyMove(index: number, candidate: SlotTime) {
    const clash = conflictMessage(index, candidate)
    if (clash) {
      setError(clash)
      return
    }
    setError(null)

    const slot = slots[index]
    const original: OriginalPlacement = slot.original ?? {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      teacherScore: slot.teacherScore,
      studentScore: slot.studentScore,
      combinedScore: slot.combinedScore
    }
    // A moved lesson is worth what its NEW time is worth. Carrying the old score over meant the
    // colour described where the lesson used to be, which is why moved lessons were faded out
    // rather than recoloured.
    const scores = scoreAt?.(slot.studentId, candidate)
    onChange(
      slots.map((current, i) => {
        if (i !== index) return current
        // Dragging a lesson back onto its suggested time is an undo, not a third edit, so it
        // clears the marker rather than recording a move to where it already belonged.
        if (sameTime(original, candidate)) return reverted({ ...current, original })
        return { ...current, ...candidate, ...scores, moved: true, original }
      })
    )
  }

  // Gives an outstanding lesson a time, appending it as a new slot the solver never proposed.
  function scheduleUnplaced(entry: UnscheduledLesson, candidate: SlotTime) {
    const clash = findConflict(candidate, slots, 0)
    if (clash) {
      setMoveError(t.conflictWith(nameOf(clash.studentId)))
      return
    }
    setMoveError(null)
    setScheduling(null)
    const scores = scoreAt?.(entry.studentId, candidate) ?? {
      teacherScore: 0,
      studentScore: 0,
      combinedScore: 0
    }
    onChange([...slots, { studentId: entry.studentId, ...candidate, ...scores, added: true }])
  }

  function removeSlot(index: number) {
    setSelected(null)
    onChange(slots.filter((_, i) => i !== index))
  }

  function revertOne(index: number) {
    setError(null)
    setSelected(null)
    onChange(slots.map((slot, i) => (i === index ? reverted(slot) : slot)))
  }

  function revertAll() {
    setError(null)
    setSelected(null)
    onChange(slots.map(reverted))
  }

  // "Mon, 12 Oct, 10:00–10:45". Short enough to sit on one line next to a label.
  function formatSlotTime(time: SlotTime): string {
    const day = parseDate(time.date)
      .locale(toDayjsLocale(localeManager.locale))
      .format('ddd, D MMM')
    return `${day}, ${time.startTime}–${time.endTime}`
  }

  // Picking a time by hand reports a clash inside the dialog rather than behind it, so the
  // teacher can try another time without reopening anything.
  function handleMoveConfirm(candidate: SlotTime) {
    if (moving === null) return
    const clash = conflictMessage(moving, candidate)
    if (clash) {
      setMoveError(clash)
      return
    }
    applyMove(moving, candidate)
    setMoving(null)
    setMoveError(null)
  }

  const movedCount = slots.filter((slot) => slot.moved === true).length
  const selectedEvent = selected ? events[selected.index] : null
  const selectedOriginal = selectedEvent?.slot.original
  const movingEvent = moving !== null ? events[moving] : null
  const schedulingEntry = scheduling !== null ? unscheduled[scheduling] : null

  /**
   * The overlap for one lesson, less the times another lesson already occupies.
   *
   * `exceptIndex` is the lesson being moved: a lesson must not be treated as blocking its own
   * move, or the time it currently sits at would be missing from the list of times it can take.
   */
  function freeTimesFor(studentId: string, seed: SlotTime, exceptIndex: number | null) {
    const durationMinutes = parseMinutes(seed.endTime) - parseMinutes(seed.startTime)
    const others = slots.filter((_, i) => i !== exceptIndex)
    return (date: string): ScoredTimeOption[] =>
      (overlappingTimes?.(studentId, date, durationMinutes) ?? []).filter(
        (option) => !findConflict({ date, ...option }, others, 0)
      )
  }

  // Drag and resize deliver the same shape. react-big-calendar types the argument against its
  // own Event, so the concrete type is recovered by a cast, and start/end are normalised since
  // the drag-and-drop addon can hand back either Dates or date strings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInteraction = (args: any) => {
    const { event, start, end } = args as {
      event: SlotEvent
      start: Date | string
      end: Date | string
    }
    // Belt and braces: `draggableAccessor` already refuses these, but a context lesson reaching
    // `applyMove` would move whatever slot happens to sit at index -1.
    if (event.context === true) return
    // A month cell has no time axis, so a drop there means "this day", nothing about the hour.
    // Taking the dropped Date's time would move the lesson to wherever the cell happens to map
    // to; keeping the slot's own times moves the day and leaves the hour alone.
    if (view === Views.MONTH) {
      applyMove(event.index, {
        date: formatDate(new Date(start)),
        startTime: event.slot.startTime,
        endTime: event.slot.endTime
      })
      return
    }
    applyMove(event.index, {
      date: formatDate(new Date(start)),
      startTime: timeOf(new Date(start)),
      endTime: timeOf(new Date(end))
    })
  }

  const calendarSx = useMemo(
    () => ({
      ...calendarShellSx(theme, { minHeight: 520 }),
      ...timeGridSx(theme),
      ...monthAgendaSx(theme),
      // This calendar prints the interval inside its own event block, so the library's label
      // would render the time a second time, above the title.
      '& .rbc-event-label': { display: 'none' }
    }),
    [theme]
  )

  return (
    <Box>
      <Collapse in={Boolean(error)}>
        <Alert
          severity="warning"
          sx={{ mb: 1.5 }}
          onClose={() => {
            setError(null)
          }}>
          {error}
        </Alert>
      </Collapse>

      {/* Clicking a row takes the grid to that lesson, which is most of the value: the
          conflict is usually in a week the teacher is not currently looking at. Changing the
          date alone is not enough — with a long list of conflicts the grid can be well below
          the fold, so the week silently changes somewhere the teacher cannot see. */}
      <ConflictsPanel
        conflicts={conflicts}
        students={students}
        onSelect={(conflict) => {
          setDate(parseDate(conflict.date).toDate())
          setSelected(null)
          gridRef.current?.scrollIntoView({
            // Someone who has asked for less motion gets the jump without the journey.
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
            block: 'start'
          })
        }}
      />

      {unscheduled.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {unscheduled.length === 1 ? t.needTimeOne : t.needTimeMany(unscheduled.length)}
          </Typography>
          <Stack spacing={0.5}>
            {unscheduled.map((entry, index) => (
              <Stack
                key={`${entry.studentId}-${index}`}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}>
                <Typography variant="body2">{nameOf(entry.studentId)}</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setScheduling(index)
                    setMoveError(null)
                  }}>
                  {t.scheduleIt}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Recomputed from the slots as they stand, so the figures answer "is my version better
          or worse than what was suggested?" while the teacher is still editing. */}
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 1.5 }}>
        <SatisfactionSummary
          slots={slots}
          caption={t.averages}
          teacherLabel={t.satisfactionYou}
          studentLabel={t.satisfactionStudents}
        />
        <Collapse in={movedCount > 0}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {movedCount === 1 ? t.changedOne : t.changedMany(movedCount)}
            </Typography>
            <Button size="small" startIcon={<UndoIcon />} onClick={revertAll}>
              {t.resetAll}
            </Button>
          </Stack>
        </Collapse>
      </Stack>

      {/* Right above the grid it explains. The scores are the label scores themselves, so a
          swatch is literally the colour a lesson at that score would wear. One scale serves both
          channels — the two sides are rated on the same words, so a second set of swatches would
          only invite the reader to look for a difference that is not there. */}
      <ScoreLegend
        caption={t.legend}
        items={[
          { score: LABEL_SCORES[AvailabilityLabel.PREFERRED], label: t.legendPreferred },
          { score: LABEL_SCORES[AvailabilityLabel.AVAILABLE], label: t.legendAvailable },
          { score: LABEL_SCORES[AvailabilityLabel.LAST_RESORT], label: t.legendLastResort }
        ]}
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {t.legendChannels}
      </Typography>
      {/* Only where there is something greyed to explain. */}
      {(contextLessons?.length ?? 0) > 0 && (
        <Typography variant="caption" color="text.secondary" display="block">
          {t.legendOthers}
        </Typography>
      )}

      <Box ref={gridRef} sx={{ ...calendarSx, mt: 1, scrollMarginTop: 16 }}>
        <DnDCalendar
          localizer={localizer}
          culture={toDayjsLocale(localeManager.locale)}
          key={toDayjsLocale(localeManager.locale)}
          events={events}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          view={view}
          onView={(v: View) => {
            setView(v)
          }}
          date={view === Views.AGENDA ? agenda.date : date}
          length={agenda.length}
          onNavigate={(d: Date) => {
            setDate(d)
          }}
          messages={messages}
          components={{
            toolbar: CalendarToolbar,
            // Per view: the agenda has its own Time column and would print the interval twice.
            month: { event: SlotEventBlock },
            week: { event: SlotEventBlock },
            day: { event: SlotEventBlock }
          }}
          popup
          step={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
          timeslots={1}
          min={dayjs(date).hour(dayStartHour).minute(0).second(0).toDate()}
          max={dayjs(date).hour(dayEndHour).minute(0).second(0).toDate()}
          selectable={false}
          resizable
          slotPropGetter={slotPropGetter}
          onEventDrop={handleInteraction}
          onEventResize={handleInteraction}
          // Typed against react-big-calendar's own Event, so the concrete type is recovered by
          // a cast — the same approach the drag handlers above use.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSelectEvent={(raw: any, e: SyntheticEvent<HTMLElement>) => {
            const event = raw as SlotEvent
            if (event.context === true) return
            setSelected({ index: event.index, anchor: e.currentTarget })
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          draggableAccessor={(raw: any) => (raw as SlotEvent).context !== true}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resizableAccessor={(raw: any) => (raw as SlotEvent).context !== true}
          eventPropGetter={eventPropGetter}
        />
      </Box>

      {/* Every view reaches this menu, which is the only way to move a lesson from the agenda
          — there is nothing to drag in a list. */}
      <Menu
        open={Boolean(selectedEvent)}
        anchorEl={selected?.anchor ?? null}
        onClose={() => {
          setSelected(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {selectedEvent?.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedEvent && formatSlotTime(selectedEvent.slot)}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setMoving(selected?.index ?? null)
            setMoveError(null)
            setSelected(null)
          }}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t.moveTo}</ListItemText>
        </MenuItem>
        {selectedOriginal && selectedEvent && (
          <MenuItem
            onClick={() => {
              revertOne(selectedEvent.index)
            }}>
            <ListItemIcon>
              <UndoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t.revertToSuggestion}
              secondary={formatSlotTime(selectedOriginal)}
            />
          </MenuItem>
        )}
        {/* A hand-placed lesson has no suggestion behind it, so removing is the only way back. */}
        {selectedEvent?.slot.added === true && (
          <MenuItem
            onClick={() => {
              removeSlot(selectedEvent.index)
            }}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t.removeLesson}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <MoveLessonDialog
        open={moving !== null}
        studentName={movingEvent?.title ?? ''}
        slot={movingEvent?.slot ?? null}
        dayStartHour={dayStartHour}
        dayEndHour={dayEndHour}
        scoreAt={movingEvent ? (time) => scoreAt?.(movingEvent.slot.studentId, time) : undefined}
        availableTimes={
          movingEvent
            ? freeTimesFor(movingEvent.slot.studentId, movingEvent.slot, moving)
            : undefined
        }
        error={moveError}
        onClose={() => {
          setMoving(null)
          setMoveError(null)
        }}
        onConfirm={handleMoveConfirm}
      />

      <MoveLessonDialog
        open={scheduling !== null}
        mode="schedule"
        studentName={schedulingEntry ? nameOf(schedulingEntry.studentId) : ''}
        slot={schedulingEntry?.seed ?? null}
        dayStartHour={dayStartHour}
        dayEndHour={dayEndHour}
        scoreAt={schedulingEntry ? (time) => scoreAt?.(schedulingEntry.studentId, time) : undefined}
        availableTimes={
          schedulingEntry
            ? freeTimesFor(schedulingEntry.studentId, schedulingEntry.seed, null)
            : undefined
        }
        error={moveError}
        onClose={() => {
          setScheduling(null)
          setMoveError(null)
        }}
        onConfirm={(time) => {
          if (schedulingEntry) scheduleUnplaced(schedulingEntry, time)
        }}
      />
    </Box>
  )
}
