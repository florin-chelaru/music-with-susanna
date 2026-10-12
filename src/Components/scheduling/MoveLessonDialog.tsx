import { Alert, Box, DialogContent, Stack, Typography } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { Dayjs } from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { SCHEDULING_CONFIG, SlotScores, SlotTime } from '../../util/scheduling'
import { formatDate, formatMinutes, parseDate, parseMinutes } from '../../util/schedulingDates'
import { ScoreChip } from './scoreDisplay'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface MoveLessonDialogTexts {
  title: string
  scheduleTitle: string
  newTime: string
  keepsLength: string
  cancel: string
  save: string
  schedule: string
  scoreCaption: string
  scoreYou: string
  scoreStudent: string
  outsideYours: string
  outsideTheirs: string
}

const EN_US: MoveLessonDialogTexts = {
  title: 'Move lesson',
  scheduleTitle: 'Schedule lesson',
  newTime: 'New date and time',
  keepsLength: 'The lesson keeps its {n}-minute length.',
  cancel: 'Cancel',
  save: 'Move',
  schedule: 'Schedule',
  scoreCaption: 'How well this time suits',
  scoreYou: 'you',
  scoreStudent: 'student',
  outsideYours: 'This is outside the hours you said you were available.',
  outsideTheirs: 'This is outside the hours the student said they were available.'
}

const RO_RO: MoveLessonDialogTexts = {
  title: 'Mută lecția',
  scheduleTitle: 'Programează lecția',
  newTime: 'Data și ora noi',
  keepsLength: 'Lecția își păstrează durata de {n} minute.',
  cancel: 'Renunță',
  save: 'Mută',
  schedule: 'Programează',
  scoreCaption: 'Cât de bine se potrivește ora',
  scoreYou: 'tu',
  scoreStudent: 'elev',
  outsideYours: 'Ora este în afara intervalelor în care ai spus că ești disponibilă.',
  outsideTheirs: 'Ora este în afara intervalelor în care elevul a spus că este disponibil.'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MoveLessonDialogProps {
  open: boolean
  studentName: string
  /**
   * Where the lesson sits now, or where the picker should start for one that has no time yet.
   * Its length is carried over either way.
   */
  slot: SlotTime | null
  /** 'schedule' is a lesson the solver could not place; 'move' is one that already has a time. */
  mode?: 'move' | 'schedule'
  /** Rates the time currently in the picker, so the choice is made with its cost visible. */
  scoreAt?: (time: SlotTime) => SlotScores | undefined
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
  scoreAt,
  error,
  onClose,
  onConfirm
}: MoveLessonDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(MoveLessonDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(MoveLessonDialog.name) as MoveLessonDialogTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  const [value, setValue] = useState<Dayjs | null>(null)

  // Reopening on a different lesson has to reseed the picker — the dialog stays mounted between
  // lessons, so without this it would still be showing the previous one's time.
  useEffect(() => {
    if (!slot) return
    const [hour, minute] = slot.startTime.split(':').map(Number)
    setValue(parseDate(slot.date).hour(hour).minute(minute).second(0).millisecond(0))
  }, [slot])

  if (!slot) return null

  const durationMinutes = parseMinutes(slot.endTime) - parseMinutes(slot.startTime)

  // The time currently in the picker, in the shape the rest of the scheduling code speaks.
  function timeFrom(picked: Dayjs): SlotTime {
    const startTime = picked.format('HH:mm')
    return {
      date: formatDate(picked),
      startTime,
      endTime: formatMinutes(parseMinutes(startTime) + durationMinutes)
    }
  }

  const preview = value ? scoreAt?.(timeFrom(value)) : undefined

  function handleSave() {
    if (!value) return
    onConfirm(timeFrom(value))
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={mode === 'schedule' ? t.scheduleTitle : t.title}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: t.cancel, onClick: onClose },
        {
          label: mode === 'schedule' ? t.schedule : t.save,
          autoFocus: true,
          disabled: !value,
          onClick: handleSave
        }
      ]}>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {studentName}
            </Typography>
            <Box>
              <DateTimePicker
                label={t.newTime}
                value={value}
                onChange={(v: Dayjs | null) => {
                  setValue(v)
                }}
                format="D MMM YYYY, HH:mm"
                ampm={false}
                minutesStep={SCHEDULING_CONFIG.SLOT_SNAP_MINUTES}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t.keepsLength.replace('{n}', String(durationMinutes))}
              </Typography>
            </Box>

            {/* A zero means the time falls outside what that side marked as available, which is
                worth saying in words — "0" alone does not explain itself. */}
            {preview && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t.scoreCaption}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  <ScoreChip label={t.scoreYou} value={preview.teacherScore} />
                  <ScoreChip label={t.scoreStudent} value={preview.studentScore} />
                </Stack>
                {preview.teacherScore === 0 && (
                  <Typography
                    variant="caption"
                    color="warning.main"
                    display="block"
                    sx={{ mt: 0.5 }}>
                    {t.outsideYours}
                  </Typography>
                )}
                {preview.studentScore === 0 && (
                  <Typography
                    variant="caption"
                    color="warning.main"
                    display="block"
                    sx={{ mt: 0.5 }}>
                    {t.outsideTheirs}
                  </Typography>
                )}
              </Box>
            )}

            {error && <Alert severity="warning">{error}</Alert>}
          </Stack>
        </LocalizationProvider>
      </DialogContent>
    </MultiActionDialog>
  )
}
