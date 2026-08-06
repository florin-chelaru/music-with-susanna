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
import { alpha } from '@mui/material/styles'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
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
import React, { useContext, useMemo, useRef, useState } from 'react'
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
// Reads weekStart from context to optionally show the actual calendar date.

const WeekStartContext = React.createContext<string | undefined>(undefined)

function DayColumnHeader({ date }: { date: Date }) {
  const weekStart = useContext(WeekStartContext)
  const jsDay = date.getDay()
  const dayOffset = jsDay === 0 ? 6 : jsDay - 1
  const actualDate = weekStart ? dayjs(`${weekStart}T12:00:00`).add(dayOffset, 'day') : null

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

// Remove or clip any blocks on the same day that overlap with `incoming`.
// Blocks that are fully covered are dropped; partially-overlapping blocks are trimmed;
// a block that straddles both sides of `incoming` is split into two fragments.
function removeOverlaps(
  existing: AvailabilityBlock[],
  incoming: AvailabilityBlock
): AvailabilityBlock[] {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTime = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const ns = toMin(incoming.startTime)
  const ne = toMin(incoming.endTime)
  const result: AvailabilityBlock[] = []
  for (const b of existing) {
    if (b.dayOfWeek !== incoming.dayOfWeek) {
      result.push(b)
      continue
    }
    const bs = toMin(b.startTime)
    const be = toMin(b.endTime)
    if (be <= ns || bs >= ne) {
      result.push(b) // no overlap
    } else if (bs < ns && be > ne) {
      result.push({ ...b, endTime: toTime(ns) }) // incoming punches through middle — left fragment
      result.push({ ...b, startTime: toTime(ne) }) // right fragment
    } else if (bs < ns) {
      result.push({ ...b, endTime: toTime(ns) }) // overlap at right end of existing — trim right
    } else if (be > ne) {
      result.push({ ...b, startTime: toTime(ne) }) // overlap at left end of existing — trim left
    }
    // else: existing fully covered by incoming — drop it
  }
  return result
}

// ─── Mobile view ──────────────────────────────────────────────────────────────

const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_NAMES_RO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

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
  labelTitles: Record<AvailabilityLabel, string>
  isRo: boolean
  editable: boolean
  dayjsLocale: string
  weekStart?: string // YYYY-MM-DD; when set, shows calendar dates in the navigator
}

function MobileAvailabilityCalendar({
  blocks,
  onChange,
  overlayBlocks,
  labelTitles,
  isRo,
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

  const dayNames = isRo ? DAY_NAMES_RO : DAY_NAMES_EN
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
    { label: AvailabilityLabel.PREFERRED, text: labelTitles[AvailabilityLabel.PREFERRED] },
    { label: AvailabilityLabel.AVAILABLE, text: labelTitles[AvailabilityLabel.AVAILABLE] },
    { label: AvailabilityLabel.LAST_RESORT, text: labelTitles[AvailabilityLabel.LAST_RESORT] }
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
            {isRo ? 'Nicio disponibilitate' : 'No availability set'}
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
                {labelTitles[block.label]}
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
              borderLeft: `3px solid ${alpha(labelColors[block.label], 0.4)}`,
              backgroundColor: alpha(labelColors[block.label], 0.06),
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
                {labelTitles[block.label]}
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
          <DialogTitle>
            {dialog?.mode === 'add'
              ? isRo
                ? 'Adaugă disponibilitate'
                : 'Add availability'
              : isRo
              ? 'Editează intervalul'
              : 'Edit block'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Stack direction="row" spacing={1.5}>
                <TimePicker
                  label={isRo ? 'Început' : 'Start'}
                  value={dialog?.startTime ?? null}
                  onChange={(v) => {
                    if (v) setDialog((prev) => (prev ? { ...prev, startTime: v } : prev))
                  }}
                  minutesStep={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
                  ampm={!isRo}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <TimePicker
                  label={isRo ? 'Sfârșit' : 'End'}
                  value={dialog?.endTime ?? null}
                  onChange={(v) => {
                    if (v) setDialog((prev) => (prev ? { ...prev, endTime: v } : prev))
                  }}
                  minutesStep={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
                  ampm={!isRo}
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
            <Button onClick={() => setDialog(null)}>{isRo ? 'Anulează' : 'Cancel'}</Button>
            {dialog?.mode === 'edit' && (
              <Button color="error" onClick={handleDelete}>
                {isRo ? 'Șterge' : 'Delete'}
              </Button>
            )}
            <Button variant="contained" disabled={!canSave} onClick={handleSave}>
              {dialog?.mode === 'add' ? (isRo ? 'Adaugă' : 'Add') : isRo ? 'Salvează' : 'Save'}
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
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'
  const labelTitles = isRo ? LABEL_TITLE_RO : LABEL_TITLE_EN

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

  if (isMobile) {
    return (
      <MobileAvailabilityCalendar
        blocks={blocks}
        onChange={onChange}
        overlayBlocks={overlayBlocks}
        labelTitles={labelTitles}
        isRo={isRo}
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
    </WeekStartContext.Provider>
  )
}
