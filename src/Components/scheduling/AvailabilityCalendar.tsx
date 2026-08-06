import { Box, Divider, MenuItem, Popover, Typography, useTheme } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import minMax from 'dayjs/plugin/minMax'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/ro'
import { useContext, useMemo, useRef, useState } from 'react'
import { Calendar, dayjsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { LocaleContext, LocaleHandler } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  SCHEDULING_CONFIG
} from '../../util/scheduling'

// ─── Dayjs setup (module-level, runs once) ────────────────────────────────────

dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(localeData)
dayjs.extend(localizedFormat)
dayjs.extend(minMax)
dayjs.extend(utc)
dayjs.extend(isLeapYear)
dayjs.extend(updateLocale)
// Force Monday week start for both locales
dayjs.updateLocale('en', { weekStart: 1 })

const localizer = dayjsLocalizer(dayjs)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar as any)

// The calendar is locked to this reference week so it always shows a weekly template.
// 2024-01-01 is a Monday, making dayOfWeek 0→Mon, 1→Tue, …, 6→Sun align naturally.
const REFERENCE_DATE = new Date(2024, 0, 1)

// ─── Custom day-column header ─────────────────────────────────────────────────
// Defined outside the component so react-big-calendar never remounts the Calendar.

function DayColumnHeader({ date }: { date: Date }) {
  return (
    <Box sx={{ textAlign: 'center', py: 1.25 }}>
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'text.secondary'
        }}>
        {dayjs(date).format('ddd')}
      </Typography>
    </Box>
  )
}

// Stable reference so react-big-calendar never remounts when AvailabilityCalendar re-renders
const CALENDAR_COMPONENTS = { header: DayColumnHeader }

// ─── Internal event type ──────────────────────────────────────────────────────

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  block: AvailabilityBlock
  isOverlay: boolean
}

// ─── Locale-aware label titles ────────────────────────────────────────────────

const LABEL_TITLE_EN: Record<AvailabilityLabel, string> = {
  [AvailabilityLabel.PREFERRED]: 'Preferred',
  [AvailabilityLabel.AVAILABLE]: 'Available',
  [AvailabilityLabel.LAST_RESORT]: 'Last Resort',
  [AvailabilityLabel.UNAVAILABLE]: 'Unavailable'
}

const LABEL_TITLE_RO: Record<AvailabilityLabel, string> = {
  [AvailabilityLabel.PREFERRED]: 'Preferat',
  [AvailabilityLabel.AVAILABLE]: 'Disponibil',
  [AvailabilityLabel.LAST_RESORT]: 'Doar la nevoie',
  [AvailabilityLabel.UNAVAILABLE]: 'Indisponibil'
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function blockToEvent(
  block: AvailabilityBlock,
  id: string,
  labelTitles: Record<AvailabilityLabel, string>,
  isOverlay = false
): CalEvent {
  const day = new Date(REFERENCE_DATE)
  day.setDate(day.getDate() + block.dayOfWeek)
  const [sh, sm] = block.startTime.split(':').map(Number)
  const [eh, em] = block.endTime.split(':').map(Number)
  const start = new Date(day)
  start.setHours(sh, sm, 0, 0)
  const end = new Date(day)
  end.setHours(eh, em, 0, 0)
  return { id, title: labelTitles[block.label], start, end, block, isOverlay }
}

// Convert a calendar Date back to AvailabilityBlock fields.
// getDay(): 0=Sun,1=Mon,…,6=Sat → our convention: 0=Mon…6=Sun
function dateToBlockFields(
  start: Date,
  end: Date
): Pick<AvailabilityBlock, 'dayOfWeek' | 'startTime' | 'endTime'> {
  const jsDay = start.getDay()
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    dayOfWeek,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvailabilityCalendarProps {
  blocks: AvailabilityBlock[]
  onChange?: (blocks: AvailabilityBlock[]) => void // undefined → read-only
  overlayBlocks?: AvailabilityBlock[] // teacher's blocks shown in student view
  displayStartHour?: number // default 8
  displayEndHour?: number // default 20
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvailabilityCalendar({
  blocks,
  onChange,
  overlayBlocks = [],
  displayStartHour = 8,
  displayEndHour = 20
}: AvailabilityCalendarProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'
  const labelTitles = isRo ? LABEL_TITLE_RO : LABEL_TITLE_EN

  // Keep dayjs global locale in sync so DayColumnHeader renders in the right language
  dayjs.locale(dayjsLocale)

  const theme = useTheme()
  const editable = Boolean(onChange)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Label colours ────────────────────────────────────────────────────────────

  const LABEL_COLORS: Record<AvailabilityLabel, string> = useMemo(
    () => ({
      [AvailabilityLabel.PREFERRED]: theme.palette.success.main,
      [AvailabilityLabel.AVAILABLE]: theme.palette.primary.main,
      [AvailabilityLabel.LAST_RESORT]: theme.palette.warning.main,
      [AvailabilityLabel.UNAVAILABLE]: theme.palette.error.main
    }),
    [theme]
  )

  // ── Events ──────────────────────────────────────────────────────────────────

  const events = useMemo(
    () => [
      ...blocks.map((b, i) => blockToEvent(b, `main-${i}`, labelTitles)),
      ...overlayBlocks.map((b, i) => blockToEvent(b, `overlay-${i}`, labelTitles, true))
    ],
    [blocks, overlayBlocks, dayjsLocale, labelTitles]
  )

  // ── Popover state ────────────────────────────────────────────────────────────

  interface PopoverState {
    anchorEl?: Element
    anchorPosition?: { top: number; left: number }
    pendingSlot?: { start: Date; end: Date }
    selectedId?: string
  }

  const [popover, setPopover] = useState<PopoverState | null>(null)

  function closePopover() {
    setPopover(null)
  }

  // ── Interaction callbacks ─────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSelectSlot({ start, end, action, bounds, box }: any) {
    if (!editable) return
    // Ensure minimum 1-step duration when user just clicks (start === end)
    const step = SCHEDULING_CONFIG.SLOT_SNAP_MINUTES * 60 * 1000
    const actualEnd =
      (start as Date).getTime() === (end as Date).getTime()
        ? new Date((start as Date).getTime() + step)
        : (end as Date)
    const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0
    let top: number
    let left: number
    if (action === 'select' && bounds) {
      // RBC builds bounds as getBoundingClientRect() + window.pageYOffset, so bounds.top
      // is in page coordinates. MUI Popover anchorPosition expects viewport coordinates
      // (it renders inside a position:fixed overlay). Subtract scroll to convert.
      top = Math.max((bounds.top as number) - window.scrollY, containerTop + 8)
      left = (bounds.left as number) - window.scrollX
    } else if (box) {
      // Click: follow the cursor (bounds.left for a click is the whole-column left edge)
      top = Math.max(box.clientY as number, containerTop + 8)
      left = box.clientX as number
    } else {
      top = containerTop + 8
      left = 200
    }
    setPopover({
      anchorPosition: { top, left },
      pendingSlot: { start: start as Date, end: actualEnd }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSelectEvent(event: any, nativeEvent: any) {
    if (!editable || (event as CalEvent).isOverlay) return
    setPopover({
      anchorEl: nativeEvent.currentTarget as Element,
      selectedId: (event as CalEvent).id
    })
  }

  function handleLabelPick(label: AvailabilityLabel) {
    if (!onChange || !popover) return
    if (popover.pendingSlot) {
      const { start, end } = popover.pendingSlot
      onChange([...blocks, { ...dateToBlockFields(start, end), label, score: LABEL_SCORES[label] }])
    } else if (popover.selectedId) {
      const idx = parseInt(popover.selectedId.replace('main-', ''), 10)
      onChange(blocks.map((b, i) => (i === idx ? { ...b, label, score: LABEL_SCORES[label] } : b)))
    }
    closePopover()
  }

  function handleDelete() {
    if (!onChange || !popover?.selectedId) return
    const idx = parseInt(popover.selectedId.replace('main-', ''), 10)
    onChange(blocks.filter((_, i) => i !== idx))
    closePopover()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEventDrop({ event, start, end }: any) {
    if (!onChange || (event as CalEvent).isOverlay) return
    const idx = parseInt((event as CalEvent).id.replace('main-', ''), 10)
    onChange(
      blocks.map((b, i) =>
        i === idx ? { ...b, ...dateToBlockFields(start as Date, end as Date) } : b
      )
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEventResize({ event, start, end }: any) {
    if (!onChange || (event as CalEvent).isOverlay) return
    const idx = parseInt((event as CalEvent).id.replace('main-', ''), 10)
    onChange(
      blocks.map((b, i) =>
        i === idx ? { ...b, ...dateToBlockFields(start as Date, end as Date) } : b
      )
    )
  }

  // ── Event styling (MUI X Scheduler–inspired) ──────────────────────────────────
  // Light tinted background + 3 px left accent bar, no box-shadow.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function eventPropGetter(event: any, _start: Date, _end: Date, isSelected: boolean) {
    const ev = event as CalEvent
    const color = LABEL_COLORS[ev.block.label]
    return {
      style: {
        backgroundColor: alpha(color, ev.isOverlay ? 0.07 : isSelected ? 0.28 : 0.15),
        border: 'none',
        borderLeft: `3px solid ${ev.isOverlay ? alpha(color, 0.35) : color}`,
        borderRadius: '4px',
        color,
        cursor: ev.isOverlay || !editable ? 'default' : 'pointer',
        pointerEvents: ev.isOverlay ? ('none' as const) : ('auto' as const)
      }
    }
  }

  // ── Theme-aware CSS overrides for react-big-calendar ──────────────────────────
  // Built once per theme change so dark/light mode colours are correct without
  // hardcoding any hex values.

  const calendarSx = useMemo(() => {
    const d = theme.palette.divider
    const paper = theme.palette.background.paper
    const textSec = theme.palette.text.secondary
    const primary = theme.palette.primary.main
    const hover = theme.palette.action.hover
    const selected = theme.palette.action.selected

    return {
      // Outer shell: rounded corners + theme border
      border: `1px solid ${d}`,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: paper,

      '& .rbc-calendar': {
        backgroundColor: paper,
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
        fontSize: '0.8125rem'
      },

      '& .rbc-time-view': { border: 'none' },

      // Header row
      '& .rbc-time-header': { borderBottom: `1px solid ${d}` },
      // No borderRight on the gutter — it has an inline width set by the library, and a
      // border would make it 1 px narrower than the time-gutter below, misaligning columns.
      '& .rbc-time-header-gutter': { backgroundColor: paper },
      // The separator between gutter and day headers comes from the content side instead.
      '& .rbc-time-header-content': { borderLeft: 'none' },
      '& .rbc-header': { border: 'none', backgroundColor: paper },

      // Hide the empty all-day row (only timed blocks are used)
      '& .rbc-allday-cell': { display: 'none' },

      // Time content area
      '& .rbc-time-content': {
        borderTop: `1px solid ${d}`,
        backgroundColor: paper
      },

      // Time gutter (left column with hour labels)
      '& .rbc-time-gutter': { backgroundColor: paper },
      '& .rbc-label': {
        fontSize: '0.6875rem',
        color: textSec,
        paddingRight: '8px',
        lineHeight: 1
      },

      // Slot groups and day columns
      '& .rbc-timeslot-group': {
        border: 'none',
        minHeight: '36px'
      },
      // All day columns carry borderLeft — the first one provides the gutter separator,
      // which aligns with rbc-time-header-content's borderLeft above.
      '& .rbc-day-slot': { borderLeft: `1px solid ${d}` },
      // Remove finer slot borders within each group (keep only hour boundaries)
      '& .rbc-day-slot .rbc-time-slot': { border: 'none' },

      // Today column tint
      '& .rbc-today': { backgroundColor: hover },

      // Events: reset library defaults; actual colours come from eventPropGetter
      '& .rbc-event': {
        border: 'none !important',
        borderRadius: '4px !important',
        // Extra left padding so text sits clear of the 3 px accent bar
        padding: '1px 6px 1px 8px !important',
        fontSize: '0.75rem',
        fontWeight: 500,
        boxShadow: 'none !important',
        '&:focus': { outline: 'none' }
      },
      '& .rbc-event.rbc-selected': { boxShadow: 'none !important' },
      '& .rbc-event-label': { fontSize: '0.625rem', opacity: 0.85 },
      '& .rbc-event-content': { fontSize: '0.75rem' },

      // Drag-to-create selection box
      '& .rbc-slot-selection': {
        backgroundColor: selected,
        border: `2px solid ${primary}`,
        borderRadius: '4px'
      },

      // Current-time indicator with leading dot
      '& .rbc-current-time-indicator': {
        height: '2px',
        backgroundColor: primary,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '-4px',
          top: '-3px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: primary
        }
      },

      // DnD drag ghost
      '& .rbc-addons-dnd-drag-preview': {
        opacity: 0.75,
        borderRadius: '4px'
      }
    }
  }, [theme])

  // ── Time bounds ──────────────────────────────────────────────────────────────

  const minTime = useMemo(() => {
    const d = new Date(REFERENCE_DATE)
    d.setHours(displayStartHour, 0, 0, 0)
    return d
  }, [displayStartHour])

  const maxTime = useMemo(() => {
    const d = new Date(REFERENCE_DATE)
    d.setHours(displayEndHour, 0, 0, 0)
    return d
  }, [displayEndHour])

  // ── Label picker options ─────────────────────────────────────────────────────

  const labelOptions: Array<{ label: AvailabilityLabel; text: string }> = [
    { label: AvailabilityLabel.PREFERRED, text: labelTitles[AvailabilityLabel.PREFERRED] },
    { label: AvailabilityLabel.AVAILABLE, text: labelTitles[AvailabilityLabel.AVAILABLE] },
    { label: AvailabilityLabel.LAST_RESORT, text: labelTitles[AvailabilityLabel.LAST_RESORT] }
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box ref={containerRef} sx={calendarSx}>
      <Box sx={{ height: 580 }}>
        <DnDCalendar
          localizer={localizer}
          culture={dayjsLocale}
          events={events}
          components={CALENDAR_COMPONENTS}
          defaultView="week"
          views={['week']}
          toolbar={false}
          date={REFERENCE_DATE}
          onNavigate={() => {
            /* locked to reference week */
          }}
          selectable={editable}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable={editable}
          step={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
          timeslots={1}
          min={minTime}
          max={maxTime}
          eventPropGetter={eventPropGetter}
        />
      </Box>

      <Popover
        open={Boolean(popover)}
        anchorEl={popover?.anchorEl ?? null}
        anchorReference={popover?.anchorPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={popover?.anchorPosition}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 176, py: 0.5 } }}>
        {(() => {
          const currentLabel = popover?.selectedId
            ? blocks[parseInt(popover.selectedId.replace('main-', ''), 10)]?.label
            : null
          return (
            <>
              {labelOptions.map(({ label, text }) => (
                <MenuItem
                  key={label}
                  dense
                  onClick={() => {
                    handleLabelPick(label)
                  }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: LABEL_COLORS[label],
                      flexShrink: 0,
                      mr: 1.5
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {text}
                  </Typography>
                  {label === currentLabel && (
                    <CheckIcon sx={{ color: LABEL_COLORS[label], ml: 1, fontSize: '1rem' }} />
                  )}
                </MenuItem>
              ))}
              {popover?.selectedId && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem dense onClick={handleDelete} sx={{ color: 'error.main' }}>
                    <DeleteOutlineIcon sx={{ mr: 1.5, fontSize: '1.125rem' }} />
                    <Typography variant="body2">{isRo ? 'Șterge' : 'Delete'}</Typography>
                  </MenuItem>
                </>
              )}
            </>
          )
        })()}
      </Popover>
    </Box>
  )
}
