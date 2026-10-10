import { Alert, Box, Collapse, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import { Calendar, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { localizer } from '../../util/calendarLocalizer'
import { calendarShellSx, timeGridSx, toolbarSx } from './calendarStyles'
import {
  AvailabilityLabel,
  LABEL_SCORES,
  SCHEDULING_CONFIG,
  SuggestedSlot,
  findConflict
} from '../../util/scheduling'
import { formatDate, parseDate } from '../../util/schedulingDates'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface EditableScheduleCalendarTexts {
  conflictWith: string
  week: string
  today: string
  back: string
  next: string
}

const EN_US: EditableScheduleCalendarTexts = {
  conflictWith: 'That time overlaps {name}.',
  week: 'Week',
  today: 'Today',
  back: 'Back',
  next: 'Next'
}

const RO_RO: EditableScheduleCalendarTexts = {
  conflictWith: 'Ora se suprapune cu {name}.',
  week: 'Săptămână',
  today: 'Astăzi',
  back: 'Înapoi',
  next: 'Înainte'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A suggestion slot, possibly moved by the teacher.
 *
 * `moved` records the override so Step O can tell a hand-placed lesson from a generated one.
 * The score still describes the slot's ORIGINAL time — moving a lesson does not currently
 * recompute it against the teacher's and student's availability at the new time.
 */
export interface EditableSlot extends SuggestedSlot {
  moved?: boolean
}

interface SlotEvent {
  index: number
  title: string
  start: Date
  end: Date
  slot: EditableSlot
}

export interface EditableScheduleCalendarProps {
  slots: EditableSlot[]
  students: Record<string, { name: string }>
  onChange: (slots: EditableSlot[]) => void
  defaultDate?: Date
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar as any)

const pad = (n: number): string => String(n).padStart(2, '0')
const timeOf = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditableScheduleCalendar({
  slots,
  students,
  onChange,
  defaultDate
}: EditableScheduleCalendarProps) {
  const theme = useTheme()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(EditableScheduleCalendar.name, TEXTS), [])
  const t = localeManager.componentStrings(
    EditableScheduleCalendar.name
  ) as EditableScheduleCalendarTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'
  dayjs.locale(dayjsLocale)

  const [date, setDate] = useState<Date>(defaultDate ?? new Date())
  const [error, setError] = useState<string | null>(null)

  const events: SlotEvent[] = useMemo(
    () =>
      slots.map((slot, index) => {
        const [sh, sm] = slot.startTime.split(':').map(Number)
        const [eh, em] = slot.endTime.split(':').map(Number)
        const day = parseDate(slot.date)
        return {
          index,
          title: students[slot.studentId]?.name ?? slot.studentId,
          start: day.hour(sh).minute(sm).second(0).millisecond(0).toDate(),
          end: day.hour(eh).minute(em).second(0).millisecond(0).toDate(),
          slot
        }
      }),
    [slots, students]
  )

  // Score colours match the availability labels, so a number reads the same way everywhere.
  function scoreColor(score: number): string {
    if (score >= LABEL_SCORES[AvailabilityLabel.PREFERRED] - 1) return theme.palette.success.main
    if (score >= LABEL_SCORES[AvailabilityLabel.AVAILABLE]) return theme.palette.primary.main
    return theme.palette.warning.main
  }

  // A moved lesson keeps its original score, which no longer describes where it now sits, so
  // it is drawn outlined and neutral rather than wearing a colour it has not earned.
  // react-big-calendar types this callback against its own Event, so the concrete event type
  // is recovered by a cast — the same approach AvailabilityCalendar uses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventPropGetter = (raw: any) => {
    const event = raw as SlotEvent
    const color = scoreColor(event.slot.combinedScore)
    // A moved lesson keeps its colour but fades: its score describes where it used to sit,
    // so the colour is still indicative rather than exact. Fading says "you changed this"
    // without dropping the colour that makes the grid readable at a glance.
    const moved = event.slot.moved === true
    return {
      style: {
        backgroundColor: alpha(color, moved ? 0.1 : 0.18),
        borderLeft: `3px solid ${moved ? alpha(color, 0.5) : color}`,
        color: theme.palette.text.primary,
        opacity: moved ? 0.65 : 1
      }
    }
  }

  // Applies a move or resize, or refuses it and says what it hit.
  //
  // Only a genuine overlap is refused — two lessons at once is impossible, not a preference.
  // MIN_BREAK_MINUTES is passed as 0 on purpose: the break is a constraint for the algorithm
  // to respect when it generates a schedule, not a rule to impose on the teacher. Dropping
  // one lesson immediately after another is a legitimate thing to want.
  function applyMove(index: number, start: Date, end: Date) {
    const candidate = {
      date: formatDate(start),
      startTime: timeOf(start),
      endTime: timeOf(end)
    }
    const others = slots.filter((_, i) => i !== index)
    const clash = findConflict(candidate, others, 0)
    if (clash) {
      const name = students[clash.studentId]?.name ?? clash.studentId
      setError(t.conflictWith.replace('{name}', name))
      return
    }
    setError(null)
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...candidate, moved: true } : slot)))
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
    applyMove(event.index, new Date(start), new Date(end))
  }

  const calendarSx = useMemo(
    () => ({ ...calendarShellSx(theme), ...timeGridSx(theme), ...toolbarSx(theme) }),
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

      <Box sx={calendarSx}>
        <DnDCalendar
          localizer={localizer}
          culture={dayjsLocale}
          key={dayjsLocale}
          events={events}
          defaultView={Views.WEEK}
          views={[Views.WEEK]}
          date={date}
          onNavigate={(d: Date) => {
            setDate(d)
          }}
          messages={{ week: t.week, today: t.today, previous: t.back, next: t.next }}
          step={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
          timeslots={1}
          min={dayjs(date).hour(8).minute(0).second(0).toDate()}
          max={dayjs(date).hour(20).minute(0).second(0).toDate()}
          selectable={false}
          resizable
          onEventDrop={handleInteraction}
          onEventResize={handleInteraction}
          eventPropGetter={eventPropGetter}
        />
      </Box>
    </Box>
  )
}
