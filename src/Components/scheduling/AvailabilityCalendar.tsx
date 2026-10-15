import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ScheduleIcon from '@mui/icons-material/Schedule'
import BlockTimesDialog from './BlockTimesDialog'
import { alpha } from '@mui/material/styles'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
import React, { useContext, useMemo, useRef, useState } from 'react'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale, toDayjsLocale } from '../../util/SupportedLocale'
import {
  AvailabilityBlock,
  AvailabilityLabel,
  LABEL_SCORES,
  SCHEDULING_CONFIG,
  removeOverlaps
} from '../../util/scheduling'
import { localizer } from '../../util/calendarLocalizer'
import { calendarShellSx, timeGridSx } from './calendarStyles'
import { parseDate, toDayOfWeek } from '../../util/schedulingDates'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar as any)

// The calendar is locked to this reference week so it always shows a weekly template.
// 2024-01-01 is a Monday, making dayOfWeek 0→Mon, 1→Tue, …, 6→Sun align naturally.
const REFERENCE_DATE = new Date(2024, 0, 1)

// ─── Custom day-column header ─────────────────────────────────────────────────
// Defined outside the component so react-big-calendar never remounts the Calendar.
// Reads weekStart from context to optionally show the actual calendar date.

const WeekStartContext = React.createContext<string | undefined>(undefined)

function DayColumnHeader({ date }: { date: Date }) {
  const weekStart = useContext(WeekStartContext)
  const dayOffset = toDayOfWeek(date)
  const actualDate = weekStart ? parseDate(weekStart).add(dayOffset, 'day') : null

  return (
    <Box sx={{ textAlign: 'center', py: weekStart ? 0.75 : 1.25 }}>
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
      {actualDate && (
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1.3 }}>
          {actualDate.format('D MMM')}
        </Typography>
      )}
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

// ─── Texts ────────────────────────────────────────────────────────────────────

interface AvailabilityCalendarTexts {
  labelTitles: Record<AvailabilityLabel, string>
  /**
   * The overlay layer is always the other party's availability — the teacher's, shown behind a
   * student's own. Fading alone was not enough to say so: students read the faded blocks as
   * their own, pre-filled. The label has to name whose they are.
   */
  overlayOwner: string
  dayNames: string[]
  addTitle: string
  editTitle: string
  noAvailability: string
  start: string
  end: string
  cancel: string
  remove: string
  add: string
  save: string
  setTimes: string
  /** Not a string, but it varies with the language all the same: Romanian reads a 24-hour clock. */
  ampm: boolean
}

const EN_US: AvailabilityCalendarTexts = {
  labelTitles: {
    [AvailabilityLabel.PREFERRED]: 'Preferred',
    [AvailabilityLabel.AVAILABLE]: 'Available',
    [AvailabilityLabel.LAST_RESORT]: 'Last Resort',
    [AvailabilityLabel.UNAVAILABLE]: 'Unavailable'
  },
  overlayOwner: 'Teacher',
  dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  addTitle: 'Add availability',
  editTitle: 'Edit block',
  noAvailability: 'No availability set',
  start: 'Start',
  end: 'End',
  cancel: 'Cancel',
  remove: 'Delete',
  add: 'Add',
  save: 'Save',
  setTimes: 'Set times',
  ampm: true
}

const RO_RO: AvailabilityCalendarTexts = {
  labelTitles: {
    [AvailabilityLabel.PREFERRED]: 'Preferat',
    [AvailabilityLabel.AVAILABLE]: 'Disponibil',
    [AvailabilityLabel.LAST_RESORT]: 'Doar la nevoie',
    [AvailabilityLabel.UNAVAILABLE]: 'Indisponibil'
  },
  overlayOwner: 'Profesor',
  dayNames: ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'],
  addTitle: 'Adaugă disponibilitate',
  editTitle: 'Editează intervalul',
  noAvailability: 'Nicio disponibilitate',
  start: 'Început',
  end: 'Sfârșit',
  cancel: 'Anulează',
  remove: 'Șterge',
  add: 'Adaugă',
  save: 'Salvează',
  setTimes: 'Setează orele',
  ampm: false
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

function overlayTitle(labelTitle: string, owner: string): string {
  return `${labelTitle} (${owner})`
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function blockToEvent(
  block: AvailabilityBlock,
  id: string,
  labelTitles: Record<AvailabilityLabel, string>,
  isOverlay = false,
  overlayOwner = EN_US.overlayOwner
): CalEvent {
  const day = new Date(REFERENCE_DATE)
  day.setDate(day.getDate() + block.dayOfWeek)
  const [sh, sm] = block.startTime.split(':').map(Number)
  const [eh, em] = block.endTime.split(':').map(Number)
  const start = new Date(day)
  start.setHours(sh, sm, 0, 0)
  const end = new Date(day)
  end.setHours(eh, em, 0, 0)
  const labelTitle = labelTitles[block.label]
  return {
    id,
    title: isOverlay ? overlayTitle(labelTitle, overlayOwner) : labelTitle,
    start,
    end,
    block,
    isOverlay
  }
}

// Convert a calendar Date back to AvailabilityBlock fields.
function dateToBlockFields(
  start: Date,
  end: Date
): Pick<AvailabilityBlock, 'dayOfWeek' | 'startTime' | 'endTime'> {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    dayOfWeek: toDayOfWeek(start),
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`
  }
}

// ─── Mobile view ──────────────────────────────────────────────────────────────

interface MobileDialogState {
  mode: 'add' | 'edit'
  startTime: Dayjs
  endTime: Dayjs
  label: AvailabilityLabel
  blockIdx?: number
}

interface MobileCalendarProps {
  blocks: AvailabilityBlock[]
  onChange?: (blocks: AvailabilityBlock[]) => void
  overlayBlocks: AvailabilityBlock[]
  t: AvailabilityCalendarTexts
  editable: boolean
  dayjsLocale: string
  weekStart?: string // YYYY-MM-DD; when set, shows calendar dates in the navigator
}

function MobileAvailabilityCalendar({
  blocks,
  onChange,
  overlayBlocks,
  t,
  editable,
  dayjsLocale,
  weekStart
}: MobileCalendarProps) {
  const theme = useTheme()
  const labelColors: Record<AvailabilityLabel, string> = {
    [AvailabilityLabel.PREFERRED]: theme.palette.success.main,
    [AvailabilityLabel.AVAILABLE]: theme.palette.primary.main,
    [AvailabilityLabel.LAST_RESORT]: theme.palette.warning.main,
    [AvailabilityLabel.UNAVAILABLE]: theme.palette.error.main
  }

  const [dayIndex, setDayIndex] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [dialog, setDialog] = useState<MobileDialogState | null>(null)

  const dayNames = t.dayNames
  const dayDate = weekStart
    ? dayjs(`${weekStart}T12:00:00`).add(dayIndex, 'day').locale(dayjsLocale)
    : null

  const dayBlocks = blocks
    .map((block, idx) => ({ block, idx }))
    .filter(({ block }) => block.dayOfWeek === dayIndex)
    .sort((a, b) => a.block.startTime.localeCompare(b.block.startTime))

  const dayOverlayBlocks = overlayBlocks
    .filter((b) => b.dayOfWeek === dayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  function openAdd() {
    setDialog({
      mode: 'add',
      startTime: dayjs().hour(9).minute(0).second(0).millisecond(0),
      endTime: dayjs().hour(10).minute(0).second(0).millisecond(0),
      label: AvailabilityLabel.AVAILABLE
    })
  }

  function openEdit(blockIdx: number) {
    const b = blocks[blockIdx]
    const [sh, sm] = b.startTime.split(':').map(Number)
    const [eh, em] = b.endTime.split(':').map(Number)
    setDialog({
      mode: 'edit',
      startTime: dayjs().hour(sh).minute(sm).second(0).millisecond(0),
      endTime: dayjs().hour(eh).minute(em).second(0).millisecond(0),
      label: b.label,
      blockIdx
    })
  }

  function handleSave() {
    if (!onChange || !dialog) return
    const newBlock: AvailabilityBlock = {
      dayOfWeek: dayIndex,
      startTime: dialog.startTime.format('HH:mm'),
      endTime: dialog.endTime.format('HH:mm'),
      label: dialog.label,
      score: LABEL_SCORES[dialog.label]
    }
    const rest =
      dialog.blockIdx !== undefined ? blocks.filter((_, i) => i !== dialog.blockIdx) : blocks
    onChange([...removeOverlaps(rest, newBlock), newBlock])
    setDialog(null)
  }

  function handleDelete() {
    if (!onChange || dialog?.blockIdx === undefined) return
    onChange(blocks.filter((_, i) => i !== dialog.blockIdx))
    setDialog(null)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    setDayIndex((i) => (dx < 0 ? Math.min(i + 1, 6) : Math.max(i - 1, 0)))
  }

  const labelOptions = [
    { label: AvailabilityLabel.PREFERRED, text: t.labelTitles[AvailabilityLabel.PREFERRED] },
    { label: AvailabilityLabel.AVAILABLE, text: t.labelTitles[AvailabilityLabel.AVAILABLE] },
    { label: AvailabilityLabel.LAST_RESORT, text: t.labelTitles[AvailabilityLabel.LAST_RESORT] }
  ]

  const d = theme.palette.divider
  const paper = theme.palette.background.paper
  const canSave = dialog?.endTime.isAfter(dialog.startTime) ?? false

  return (
    <Box
      sx={{ border: `1px solid ${d}`, borderRadius: 2, overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {/* Day navigator */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 0.5, py: 0.75, borderBottom: `1px solid ${d}`, backgroundColor: paper }}>
        <IconButton
          size="small"
          onClick={() => setDayIndex((i) => Math.max(i - 1, 0))}
          disabled={dayIndex === 0}>
          <ChevronLeftIcon />
        </IconButton>
        <Stack alignItems="center" spacing={0}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
            {dayNames[dayIndex]}
          </Typography>
          {dayDate && (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {dayDate.format('D MMMM')}
            </Typography>
          )}
        </Stack>
        <IconButton
          size="small"
          onClick={() => setDayIndex((i) => Math.min(i + 1, 6))}
          disabled={dayIndex === 6}>
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {/* Block list */}
      <Box sx={{ p: 1.5, backgroundColor: paper }}>
        {dayBlocks.length === 0 && dayOverlayBlocks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1.5 }}>
            {t.noAvailability}
          </Typography>
        )}
        {dayBlocks.map(({ block, idx }) => (
          <Box
            key={idx}
            onClick={() => {
              if (editable) openEdit(idx)
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderLeft: `3px solid ${labelColors[block.label]}`,
              backgroundColor: alpha(labelColors[block.label], 0.12),
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 1,
              cursor: editable ? 'pointer' : 'default',
              userSelect: 'none'
            }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {block.startTime} – {block.endTime}
              </Typography>
              <Typography variant="caption" sx={{ color: labelColors[block.label] }}>
                {t.labelTitles[block.label]}
              </Typography>
            </Box>
            {editable && <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: '1.125rem' }} />}
          </Box>
        ))}
        {dayOverlayBlocks.map((block, i) => (
          <Box
            key={`ov-${i}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${alpha(labelColors[block.label], 0.4)}`,
              borderLeft: `3px solid ${alpha(labelColors[block.label], 0.4)}`,
              backgroundColor: 'transparent',
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 1
            }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.55 }}>
                {block.startTime} – {block.endTime}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha(labelColors[block.label], 0.55) }}>
                {overlayTitle(t.labelTitles[block.label], t.overlayOwner)}
              </Typography>
            </Box>
          </Box>
        ))}
        {editable && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Fab size="small" color="primary" onClick={openAdd}>
              <AddIcon />
            </Fab>
          </Box>
        )}
      </Box>

      {/* Add / Edit dialog */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
        <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
          <DialogTitle>{dialog?.mode === 'add' ? t.addTitle : t.editTitle}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Stack direction="row" spacing={1.5}>
                <TimePicker
                  label={t.start}
                  value={dialog?.startTime ?? null}
                  onChange={(v) => {
                    if (v) setDialog((prev) => (prev ? { ...prev, startTime: v } : prev))
                  }}
                  minutesStep={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
                  ampm={t.ampm}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <TimePicker
                  label={t.end}
                  value={dialog?.endTime ?? null}
                  onChange={(v) => {
                    if (v) setDialog((prev) => (prev ? { ...prev, endTime: v } : prev))
                  }}
                  minutesStep={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
                  ampm={t.ampm}
                  minTime={
                    dialog?.startTime?.add(SCHEDULING_CONFIG.SLOT_SNAP_MINUTES, 'minute') ??
                    undefined
                  }
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
              <Box>
                {labelOptions.map(({ label, text }) => (
                  <MenuItem
                    key={label}
                    dense
                    onClick={() => setDialog((prev) => (prev ? { ...prev, label } : prev))}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: labelColors[label],
                        flexShrink: 0,
                        mr: 1.5
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {text}
                    </Typography>
                    {dialog?.label === label && (
                      <CheckIcon sx={{ color: labelColors[label], ml: 1, fontSize: '1rem' }} />
                    )}
                  </MenuItem>
                ))}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>{t.cancel}</Button>
            {dialog?.mode === 'edit' && (
              <Button color="error" onClick={handleDelete}>
                {t.remove}
              </Button>
            )}
            <Button variant="contained" disabled={!canSave} onClick={handleSave}>
              {dialog?.mode === 'add' ? t.add : t.save}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
    </Box>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvailabilityCalendarProps {
  blocks: AvailabilityBlock[]
  onChange?: (blocks: AvailabilityBlock[]) => void // undefined → read-only
  overlayBlocks?: AvailabilityBlock[] // teacher's blocks shown in student view
  displayStartHour?: number // default 8
  displayEndHour?: number // default 20
  weekStart?: string // YYYY-MM-DD; passed to mobile view to show calendar dates
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvailabilityCalendar({
  blocks,
  onChange,
  overlayBlocks = [],
  displayStartHour = 8,
  displayEndHour = 20,
  weekStart
}: AvailabilityCalendarProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(AvailabilityCalendar.name, TEXTS), [])
  const t = localeManager.componentStrings(AvailabilityCalendar.name) as AvailabilityCalendarTexts
  const dayjsLocale = toDayjsLocale(localeManager.locale)

  // Keep dayjs global locale in sync so DayColumnHeader renders in the right language
  dayjs.locale(dayjsLocale)

  const theme = useTheme()
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobile = isTouch || isSmallScreen
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
      ...blocks.map((b, i) => blockToEvent(b, `main-${i}`, t.labelTitles)),
      ...overlayBlocks.map((b, i) =>
        blockToEvent(b, `overlay-${i}`, t.labelTitles, true, t.overlayOwner)
      )
    ],
    [blocks, overlayBlocks, dayjsLocale, t]
  )

  // ── Popover state ────────────────────────────────────────────────────────────

  interface PopoverState {
    anchorEl?: Element
    anchorPosition?: { top: number; left: number }
    pendingSlot?: { start: Date; end: Date }
    selectedId?: string
  }

  const [popover, setPopover] = useState<PopoverState | null>(null)
  // The block whose times are being typed rather than dragged. Holds its index so the edit can
  // be applied on save, and its current times so the dialog opens on them.
  const [timesTarget, setTimesTarget] = useState<{
    blockIdx: number
    startTime: string
    endTime: string
  } | null>(null)

  function openTimesDialog() {
    if (!popover?.selectedId) return
    const blockIdx = parseInt(popover.selectedId.replace('main-', ''), 10)
    const block = blocks[blockIdx]
    if (!block) return
    setPopover(null)
    setTimesTarget({ blockIdx, startTime: block.startTime, endTime: block.endTime })
  }

  function handleTimesSave(startTime: string, endTime: string) {
    const target = timesTarget
    setTimesTarget(null)
    if (!onChange || !target) return
    const edited = { ...blocks[target.blockIdx], startTime, endTime }
    const rest = blocks.filter((_, i) => i !== target.blockIdx)
    // Same overlap handling as a drag: a block stretched over its neighbour absorbs it rather
    // than leaving two claims on the same minutes.
    onChange([...removeOverlaps(rest, edited), edited])
  }

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
      const newBlock: AvailabilityBlock = {
        ...dateToBlockFields(start, end),
        label,
        score: LABEL_SCORES[label]
      }
      onChange([...removeOverlaps(blocks, newBlock), newBlock])
    } else if (popover.selectedId) {
      const idx = parseInt(popover.selectedId.replace('main-', ''), 10)
      const newBlock: AvailabilityBlock = { ...blocks[idx], label, score: LABEL_SCORES[label] }
      const rest = blocks.filter((_, i) => i !== idx)
      onChange([...removeOverlaps(rest, newBlock), newBlock])
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
    const newBlock: AvailabilityBlock = {
      ...blocks[idx],
      ...dateToBlockFields(start as Date, end as Date)
    }
    const rest = blocks.filter((_, i) => i !== idx)
    onChange([...removeOverlaps(rest, newBlock), newBlock])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEventResize({ event, start, end }: any) {
    if (!onChange || (event as CalEvent).isOverlay) return
    const idx = parseInt((event as CalEvent).id.replace('main-', ''), 10)
    const newBlock: AvailabilityBlock = {
      ...blocks[idx],
      ...dateToBlockFields(start as Date, end as Date)
    }
    const rest = blocks.filter((_, i) => i !== idx)
    onChange([...removeOverlaps(rest, newBlock), newBlock])
  }

  // ── Event styling (MUI X Scheduler–inspired) ──────────────────────────────────
  // Light tinted background + 3 px left accent bar, no box-shadow.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function eventPropGetter(event: any, _start: Date, _end: Date, isSelected: boolean) {
    const ev = event as CalEvent
    const color = LABEL_COLORS[ev.block.label]
    return {
      className: ev.isOverlay ? 'rbc-event--overlay' : 'rbc-event--own',
      style: {
        // The other party's availability is an outline, the student's own is filled. Same
        // colours either way, so which times the teacher prefers is still readable.
        //
        // The fill has to be genuinely opaque, not a tint: the two layers are stacked, so a
        // translucent block lets the overlay's label show through and both become unreadable.
        // A solid paper background carries the tint as a flat gradient on top of it, which
        // looks identical to alpha() but actually hides what is behind.
        backgroundColor: ev.isOverlay ? 'transparent' : theme.palette.background.paper,
        backgroundImage: ev.isOverlay
          ? 'none'
          : `linear-gradient(${alpha(color, isSelected ? 0.28 : 0.15)}, ${alpha(
              color,
              isSelected ? 0.28 : 0.15
            )})`,
        border: ev.isOverlay ? `1px solid ${alpha(color, 0.5)}` : 'none',
        borderLeft: ev.isOverlay ? `3px solid ${alpha(color, 0.5)}` : `3px solid ${color}`,
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

  const calendarSx = useMemo(
    () => ({
      ...calendarShellSx(theme),
      ...timeGridSx(theme),
      // With an overlay present, react-big-calendar treats the two layers as colliding events
      // and splits the column between them, truncating both labels. Both layers instead span
      // the full width, stacked: the teacher's outline behind, the student's filled blocks on
      // top at 95%, leaving the outline's right edge visible. The student's fill is opaque, so
      // where the two coincide only one label is readable rather than two overlapping.
      //
      // Safe to pin the widths because a student's own blocks never overlap each other —
      // removeOverlaps clips them on the way in.
      ...(overlayBlocks.length > 0
        ? {
            '& .rbc-event--overlay': {
              left: '0 !important',
              width: '100% !important',
              zIndex: 0
            },
            '& .rbc-event--own': {
              left: '0 !important',
              width: '95% !important',
              zIndex: 1
            }
          }
        : {})
    }),
    [theme, overlayBlocks.length]
  )

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
    { label: AvailabilityLabel.PREFERRED, text: t.labelTitles[AvailabilityLabel.PREFERRED] },
    { label: AvailabilityLabel.AVAILABLE, text: t.labelTitles[AvailabilityLabel.AVAILABLE] },
    { label: AvailabilityLabel.LAST_RESORT, text: t.labelTitles[AvailabilityLabel.LAST_RESORT] }
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <MobileAvailabilityCalendar
        blocks={blocks}
        onChange={onChange}
        overlayBlocks={overlayBlocks}
        t={t}
        editable={editable}
        dayjsLocale={dayjsLocale}
        weekStart={weekStart}
      />
    )
  }

  return (
    <WeekStartContext.Provider value={weekStart}>
      <Box ref={containerRef} sx={calendarSx}>
        <Box sx={{ height: 580 }}>
          <DnDCalendar
            localizer={localizer}
            culture={dayjsLocale}
            events={events}
            key={dayjsLocale}
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

        <BlockTimesDialog
          open={timesTarget !== null}
          startTime={timesTarget?.startTime ?? '09:00'}
          endTime={timesTarget?.endTime ?? '10:00'}
          dayStartHour={displayStartHour}
          dayEndHour={displayEndHour}
          onClose={() => {
            setTimesTarget(null)
          }}
          onSave={handleTimesSave}
        />

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
                    <MenuItem dense onClick={openTimesDialog}>
                      <ScheduleIcon sx={{ mr: 1.5, fontSize: '1.125rem' }} />
                      <Typography variant="body2">{t.setTimes}</Typography>
                    </MenuItem>
                    <MenuItem dense onClick={handleDelete} sx={{ color: 'error.main' }}>
                      <DeleteOutlineIcon sx={{ mr: 1.5, fontSize: '1.125rem' }} />
                      <Typography variant="body2">{t.remove}</Typography>
                    </MenuItem>
                  </>
                )}
              </>
            )
          })()}
        </Popover>
      </Box>
    </WeekStartContext.Provider>
  )
}
