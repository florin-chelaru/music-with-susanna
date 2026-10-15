import {
  Alert,
  Box,
  DialogContent,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  useTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { Dayjs } from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  SCHEDULING_CONFIG,
  SlotScores,
  SlotTime
} from '../../util/scheduling'
import { ScoredTimeOption } from '../../util/schedulingAlgorithm'
import { formatDate, formatMinutes, parseDate, parseMinutes } from '../../util/schedulingDates'
import { ScoreChip, scoreColor } from './scoreDisplay'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface MoveLessonDialogTexts {
  title: string
  scheduleTitle: string
  keepsLength: (minutes: number) => string
  cancel: string
  save: string
  schedule: string
  timesOn: (date: string) => string
  noTimes: string
  anyTime: string
  scoreYou: string
  scoreStudent: string
  outsideYours: string
  outsideTheirs: string
}

const EN_US: MoveLessonDialogTexts = {
  title: 'Move lesson',
  scheduleTitle: 'Schedule lesson',
  keepsLength: (minutes) =>
    `The lesson keeps its ${minutes}-minute length. Dots mark days you both have free.`,
  cancel: 'Cancel',
  save: 'Move',
  schedule: 'Schedule',
  timesOn: (date) => `Times on ${date}`,
  noTimes: 'No time this day suits you both. Pick another day, or switch on any time below.',
  anyTime: 'Any time',
  scoreYou: 'you',
  scoreStudent: 'student',
  outsideYours: 'Outside the hours you said you were available.',
  outsideTheirs: 'Outside the hours the student said they were available.'
}

const RO_RO: MoveLessonDialogTexts = {
  title: 'Mută lecția',
  scheduleTitle: 'Programează lecția',
  keepsLength: (minutes) =>
    `Lecția își păstrează durata de ${minutes} minute. Punctele arată zilele comune libere.`,
  cancel: 'Renunță',
  save: 'Mută',
  schedule: 'Programează',
  timesOn: (date) => `Ore în ${date}`,
  noTimes: 'Nicio oră din această zi nu vă convine amândurora. Alege altă zi sau orice oră.',
  anyTime: 'Orice oră',
  scoreYou: 'tu',
  scoreStudent: 'elev',
  outsideYours: 'În afara intervalelor în care ai spus că ești disponibilă.',
  outsideTheirs: 'În afara intervalelor în care elevul a spus că este disponibil.'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// How far beyond the semester's teaching hours the "any time" list reaches. The point of that
// switch is to place a lesson somewhere nobody said they were free, so bounding it by the same
// window the grid draws would defeat it — but the small hours are still not worth listing.
const ANY_TIME_MARGIN_HOURS = 1

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface AvailabilityDayProps extends PickersDayProps<Dayjs> {
  /** Best combined score available that day, 0 when the two sides share nothing. */
  dayScore?: (day: Dayjs) => number
}

/**
 * A day cell with one dot underneath, coloured by the best time available that day.
 *
 * One dot rather than one per party on purpose. What the teacher needs to know is whether the
 * two of them can meet, and separate markers would put a bright "I am free" on a day the student
 * cannot do at all — the worst day on the grid, wearing the best colour.
 */
function AvailabilityDay({ dayScore, ...props }: AvailabilityDayProps) {
  const theme = useTheme()
  const score = props.outsideCurrentMonth ? 0 : dayScore?.(props.day) ?? 0

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <PickersDay {...props} />
      {score > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: scoreColor(theme, score),
            pointerEvents: 'none'
          }}
        />
      )}
    </Box>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MoveLessonDialogProps {
  open: boolean
  studentName: string
  /**
   * Where the lesson sits now, or where to start for one that has no time yet. Its length is
   * carried over either way.
   */
  slot: SlotTime | null
  /** 'schedule' is a lesson the solver could not place; 'move' is one that already has a time. */
  mode?: 'move' | 'schedule'
  /** Free, scored start times on a date — both the day dots and the time list come from this. */
  availableTimes?: (date: string) => ScoredTimeOption[]
  /** Rates any time at all, for the unrestricted list and the warnings under it. */
  scoreAt?: (time: SlotTime) => SlotScores | undefined
  /** The semester's teaching hours; the unrestricted list reaches an hour either side. */
  dayStartHour?: number
  dayEndHour?: number
  /** Set by the caller when the chosen time clashes, so the dialog can stay open. */
  error?: string | null
  onClose: () => void
  onConfirm: (time: SlotTime) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MoveLessonDialog({
  open,
  studentName,
  slot,
  mode = 'move',
  availableTimes,
  scoreAt,
  dayStartHour = DEFAULT_DAY_START_HOUR,
  dayEndHour = DEFAULT_DAY_END_HOUR,
  error,
  onClose,
  onConfirm
}: MoveLessonDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(MoveLessonDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(MoveLessonDialog.name) as MoveLessonDialogTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  const [date, setDate] = useState<Dayjs | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [month, setMonth] = useState<Dayjs | null>(null)
  const [anyTime, setAnyTime] = useState(false)

  // Reopening on a different lesson has to reseed everything — the dialog stays mounted between
  // lessons, so without this it would still be showing the previous one's day and time.
  useEffect(() => {
    if (!slot) return
    const day = parseDate(slot.date)
    setDate(day)
    setMonth(day)
    setStartTime(slot.startTime)
    setAnyTime(false)
  }, [slot])

  const durationMinutes = slot ? parseMinutes(slot.endTime) - parseMinutes(slot.startTime) : 0

  // Best score per day of the visible month, for the dots. Keyed on the month so paging through
  // a term does not rescore days nobody is looking at.
  const dayScores = useMemo(() => {
    const scores = new Map<string, number>()
    if (!availableTimes || !month) return scores
    const first = month.startOf('month')
    for (let i = 0; i < month.daysInMonth(); i++) {
      const key = formatDate(first.add(i, 'day'))
      const best = availableTimes(key).reduce((max, o) => Math.max(max, o.combinedScore), 0)
      if (best > 0) scores.set(key, best)
    }
    return scores
  }, [availableTimes, month])

  // The times offered for the selected day: those that suit both sides, or — when the teacher
  // asks for any time — the whole grid, so an ad-hoc lesson outside anyone's stated hours stays
  // reachable rather than quietly forbidden.
  const times: ScoredTimeOption[] = useMemo(() => {
    if (!date || durationMinutes === 0) return []
    const key = formatDate(date)
    if (!anyTime) return availableTimes?.(key) ?? []

    const options: ScoredTimeOption[] = []
    const from = Math.max(0, dayStartHour - ANY_TIME_MARGIN_HOURS) * 60
    const to = Math.min(24, dayEndHour + ANY_TIME_MARGIN_HOURS) * 60
    for (
      let minute = from;
      minute + durationMinutes <= to;
      minute += SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
    ) {
      const start = formatMinutes(minute)
      const end = formatMinutes(minute + durationMinutes)
      const scores = scoreAt?.({ date: key, startTime: start, endTime: end })
      options.push({
        startTime: start,
        endTime: end,
        teacherScore: scores?.teacherScore ?? 0,
        studentScore: scores?.studentScore ?? 0,
        combinedScore: scores?.combinedScore ?? 0
      })
    }
    return options
  }, [date, anyTime, availableTimes, scoreAt, durationMinutes])

  if (!slot) return null

  const chosen = times.find((option) => option.startTime === startTime)

  function handleSave() {
    if (!date || !startTime) return
    onConfirm({
      date: formatDate(date),
      startTime,
      endTime: formatMinutes(parseMinutes(startTime) + durationMinutes)
    })
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={mode === 'schedule' ? t.scheduleTitle : t.title}
      fullWidth
      maxWidth="sm"
      actions={[
        { label: t.cancel, onClick: onClose },
        {
          label: mode === 'schedule' ? t.schedule : t.save,
          autoFocus: true,
          disabled: !date || !startTime,
          onClick: handleSave
        }
      ]}>
      <DialogContent>
        <Typography variant="subtitle2" fontWeight={600}>
          {studentName}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {t.keepsLength(durationMinutes)}
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} divider={<Divider flexItem />}>
            <DateCalendar
              value={date}
              onChange={(picked: Dayjs | null) => {
                setDate(picked)
                setStartTime(null)
              }}
              onMonthChange={(visible: Dayjs) => {
                setMonth(visible)
              }}
              slots={{ day: AvailabilityDay }}
              slotProps={{
                // The day cell takes one extra prop, which MUI's slot typing has no room for.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                day: { dayScore: (day: Dayjs) => dayScores.get(formatDate(day)) ?? 0 } as any
              }}
              sx={{ m: 0 }}
            />

            <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {t.timesOn(date ? date.locale(dayjsLocale).format('ddd, D MMM') : '')}
              </Typography>

              <Box sx={{ maxHeight: 250, overflowY: 'auto', mt: 0.5, pr: 0.5 }}>
                {times.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    {t.noTimes}
                  </Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {times.map((option) => (
                      <Stack
                        key={option.startTime}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        onClick={() => {
                          setStartTime(option.startTime)
                        }}
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: 1,
                          borderColor:
                            option.startTime === startTime ? 'primary.main' : 'transparent',
                          backgroundColor:
                            option.startTime === startTime
                              ? (theme) => alpha(theme.palette.primary.main, 0.08)
                              : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}>
                        <Typography variant="body2">
                          {option.startTime}–{option.endTime}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <ScoreChip label={t.scoreYou} value={option.teacherScore} />
                          <ScoreChip label={t.scoreStudent} value={option.studentScore} />
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Switch
                    size="small"
                    checked={anyTime}
                    onChange={(event) => {
                      setAnyTime(event.target.checked)
                      setStartTime(null)
                    }}
                  />
                }
                label={<Typography variant="caption">{t.anyTime}</Typography>}
              />

              {chosen && chosen.teacherScore === 0 && (
                <Typography variant="caption" color="warning.main" display="block">
                  {t.outsideYours}
                </Typography>
              )}
              {chosen && chosen.studentScore === 0 && (
                <Typography variant="caption" color="warning.main" display="block">
                  {t.outsideTheirs}
                </Typography>
              )}
            </Box>
          </Stack>
        </LocalizationProvider>

        {error && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
    </MultiActionDialog>
  )
}
