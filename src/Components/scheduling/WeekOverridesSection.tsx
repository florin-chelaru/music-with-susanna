import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import AvailabilityCalendar from './AvailabilityCalendar'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale, toDayjsLocale } from '../../util/SupportedLocale'
import { AvailabilityBlock } from '../../util/scheduling'
import { parseDate, weekStartDate, weekStartOf } from '../../util/schedulingDates'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface WeekOverridesSectionTexts {
  title: string
  add: string
  weekOf: string
  none: string
  remove: string
}

const EN_US: WeekOverridesSectionTexts = {
  title: 'Week Overrides',
  add: 'Add Override',
  weekOf: 'Week of',
  none: '—',
  remove: 'Remove override'
}

const RO_RO: WeekOverridesSectionTexts = {
  title: 'Excepții săptămânale',
  add: 'Adaugă excepție',
  weekOf: 'Săptămâna din',
  none: '—',
  remove: 'Șterge excepția'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WeekOverridesSectionProps {
  overrides: Record<string, { blocks: AvailabilityBlock[] }>
  semesterStart: string
  semesterEnd: string
  /**
   * Drawn behind the editable blocks — the teacher's availability, in the student's view.
   *
   * Asked per week rather than given once: what the teacher has left can differ week by week when
   * a round is fitting someone around lessons that already stand.
   */
  overlayBlocksFor?: (weekStart: string) => AvailabilityBlock[]
  /** The semester's teaching hours, so every week's grid draws the same window. */
  displayStartHour?: number
  displayEndHour?: number
  /**
   * Monday of a week to scroll to and flash — how a conflict elsewhere on the page points at
   * the week that would fix it. The caller clears it, so pointing at the same week twice works.
   */
  focusWeek?: string | null
  /** Receives the Monday of the chosen week; the caller decides what to seed it with. */
  onAdd: (weekStart: string) => void
  onChange: (weekStart: string, blocks: AvailabilityBlock[]) => void
  onRemove: (weekStart: string) => void
}

/**
 * The per-week exceptions to a weekly availability template.
 *
 * Both the teacher's availability tab and the student's submission page need this, and they
 * need it to behave identically — the two sides are negotiating against the same calendar.
 */
export default function WeekOverridesSection({
  overrides,
  semesterStart,
  semesterEnd,
  overlayBlocksFor,
  displayStartHour,
  displayEndHour,
  focusWeek,
  onAdd,
  onChange,
  onRemove
}: WeekOverridesSectionProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(WeekOverridesSection.name, TEXTS), [])
  const t = localeManager.componentStrings(WeekOverridesSection.name) as WeekOverridesSectionTexts
  const locale = localeManager.locale as SupportedLocale

  const [showPicker, setShowPicker] = useState(false)
  const [pickedDate, setPickedDate] = useState<Dayjs | null>(null)
  const weekRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // A week named from elsewhere on the page is scrolled to and flashed. The effect runs after
  // the week has been added, which is why it waits for the ref rather than scrolling inline.
  useEffect(() => {
    if (!focusWeek) return
    const element = weekRefs.current[focusWeek]
    if (!element) return
    element.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    })
  }, [focusWeek, overrides])

  // A week is offerable when it overlaps the semester and has not already gone by.
  function shouldDisableDate(date: Dayjs): boolean {
    const monday = weekStartOf(date)
    const sunday = monday.add(6, 'day')
    if (sunday.isBefore(dayjs(), 'day')) return true
    return (
      monday.isAfter(parseDate(semesterEnd), 'day') ||
      sunday.isBefore(parseDate(semesterStart), 'day')
    )
  }

  function formatWeekStart(weekStart: string): string {
    return new Intl.DateTimeFormat(locale === SupportedLocale.RO_RO ? 'ro-RO' : 'en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(parseDate(weekStart).toDate())
  }

  function handleAdd() {
    if (!pickedDate) return
    onAdd(weekStartDate(pickedDate))
    setPickedDate(null)
    setShowPicker(false)
  }

  const sorted = useMemo(
    () => Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)),
    [overrides]
  )

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 4, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {t.title}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setShowPicker((v) => !v)
          }}>
          {t.add}
        </Button>
      </Stack>

      {showPicker && (
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale={toDayjsLocale(localeManager.locale)}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <DatePicker
              label={t.weekOf}
              value={pickedDate}
              onChange={(v: Dayjs | null) => {
                setPickedDate(v)
              }}
              format="D MMM YYYY"
              shouldDisableDate={shouldDisableDate}
              minDate={parseDate(semesterStart)}
              maxDate={parseDate(semesterEnd)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button variant="contained" size="small" onClick={handleAdd}>
              {t.add}
            </Button>
          </Stack>
        </LocalizationProvider>
      )}

      {sorted.length === 0 && !showPicker && (
        <Typography variant="body2" color="text.secondary">
          {t.none}
        </Typography>
      )}

      {sorted.map(([weekStart, { blocks }]) => (
        <Box
          key={weekStart}
          ref={(element: HTMLDivElement | null) => {
            weekRefs.current[weekStart] = element
          }}
          sx={{
            mb: 3,
            borderRadius: 2,
            transition: 'background-color 600ms ease-out',
            backgroundColor:
              focusWeek === weekStart
                ? (theme) => alpha(theme.palette.primary.main, 0.08)
                : 'transparent'
          }}>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {t.weekOf} {formatWeekStart(weekStart)}
            </Typography>
            <IconButton
              size="small"
              aria-label={`${t.remove} ${formatWeekStart(weekStart)}`}
              onClick={() => {
                onRemove(weekStart)
              }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
          <AvailabilityCalendar
            blocks={blocks}
            weekStart={weekStart}
            overlayBlocks={overlayBlocksFor?.(weekStart)}
            displayStartHour={displayStartHour}
            displayEndHour={displayEndHour}
            onChange={(newBlocks) => {
              onChange(weekStart, newBlocks)
            }}
          />
        </Box>
      ))}
    </Box>
  )
}
