import {
  Box,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ro'
import { useContext, useMemo, useRef, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR, Semester } from '../../util/scheduling'

interface SemesterDialogTexts {
  title: string
  editTitle: string
  name: string
  startDate: string
  endDate: string
  cancellationWindow: string
  dayWindow: string
  dayStart: string
  dayEnd: string
  dayWindowHelper: string
  dayRangeError: string
  cancel: string
  save: string
  dateRangeError: string
}

const EN_US: SemesterDialogTexts = {
  title: 'Add Semester',
  editTitle: 'Edit Semester',
  dayWindow: 'Teaching hours',
  dayStart: 'From',
  dayEnd: 'To',
  dayWindowHelper: 'The hours the calendars show for this semester. Only affects what you see.',
  dayRangeError: 'The day has to end after it starts.',
  name: 'Name',
  startDate: 'Start Date',
  endDate: 'End Date',
  cancellationWindow: 'Cancellation Window (hours)',
  cancel: 'Cancel',
  save: 'Save',
  dateRangeError: 'End date must be after start date'
}

const RO_RO: SemesterDialogTexts = {
  title: 'Adaugă semestru',
  editTitle: 'Editează semestru',
  dayWindow: 'Orele de predare',
  dayStart: 'De la',
  dayEnd: 'Până la',
  dayWindowHelper: 'Orele afișate în calendarele acestui semestru. Afectează doar ce vezi.',
  dayRangeError: 'Ziua trebuie să se termine după ce începe.',
  name: 'Nume',
  startDate: 'Data de început',
  endDate: 'Data de sfârșit',
  cancellationWindow: 'Fereastră anulare (ore)',
  cancel: 'Anulează',
  save: 'Salvează',
  dateRangeError: 'Data de sfârșit trebuie să fie după data de început'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const DATE_FORMAT = 'D MMM YYYY'

function toDayjs(isoDate: string | undefined): Dayjs | null {
  return isoDate ? dayjs(isoDate) : null
}

type SemesterFormData = Pick<
  Semester,
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'defaultCancellationWindowHours'
  | 'dayStartHour'
  | 'dayEndHour'
>

/** Whole hours only: this bounds what the grid draws, and lessons inside it still snap to 15. */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour)

const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`

export interface SemesterDialogProps {
  open: boolean
  locationId: string
  initial?: SemesterFormData
  onClose: () => void
  onSave: (data: SemesterFormData) => void
}

export default function SemesterDialog({ open, initial, onClose, onSave }: SemesterDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(SemesterDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(SemesterDialog.name) as SemesterDialogTexts

  const dayjsLocale = localeManager.locale === SupportedLocale.RO_RO ? 'ro' : 'en'

  const formRef = useRef<HTMLFormElement>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(toDayjs(initial?.startDate))
  const [endDate, setEndDate] = useState<Dayjs | null>(toDayjs(initial?.endDate))
  const [dateError, setDateError] = useState(false)
  const [dayStartHour, setDayStartHour] = useState(initial?.dayStartHour ?? DEFAULT_DAY_START_HOUR)
  const [dayEndHour, setDayEndHour] = useState(initial?.dayEndHour ?? DEFAULT_DAY_END_HOUR)
  const dayRangeError = dayEndHour <= dayStartHour

  function handleSave() {
    formRef.current?.requestSubmit()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = (data.get('name') as string).trim()
    const hours = parseInt(data.get('cancellationWindow') as string, 10)

    const start = startDate?.format('YYYY-MM-DD') ?? ''
    const end = endDate?.format('YYYY-MM-DD') ?? ''

    if (!start || !end || end <= start) {
      setDateError(true)
      return
    }
    setDateError(false)
    if (dayRangeError) return
    onSave({
      name,
      startDate: start,
      endDate: end,
      defaultCancellationWindowHours: isNaN(hours) ? 24 : hours,
      dayStartHour,
      dayEndHour
    })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
      <MultiActionDialog
        open={open}
        onClose={onClose}
        title={initial ? t.editTitle : t.title}
        actions={[
          { label: t.cancel, onClick: onClose },
          { label: t.save, onClick: handleSave }
        ]}>
        <DialogContent>
          <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <TextField
              name="name"
              label={t.name}
              defaultValue={initial?.name ?? ''}
              required
              fullWidth
              margin="normal"
              autoFocus
            />
            <DatePicker
              label={t.startDate}
              value={startDate}
              onChange={(v) => {
                setStartDate(v)
                setDateError(false)
              }}
              format={DATE_FORMAT}
              slotProps={{
                textField: { fullWidth: true, margin: 'normal', required: true }
              }}
            />
            <DatePicker
              label={t.endDate}
              value={endDate}
              onChange={(v) => {
                setEndDate(v)
                setDateError(false)
              }}
              format={DATE_FORMAT}
              minDate={!initial ? dayjs() : undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true,
                  error: dateError,
                  helperText: dateError ? t.dateRangeError : undefined
                }
              }}
            />
            <TextField
              name="cancellationWindow"
              label={t.cancellationWindow}
              type="number"
              defaultValue={initial?.defaultCancellationWindowHours ?? 24}
              required
              fullWidth
              margin="normal"
              inputProps={{ min: 0 }}
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              {t.dayWindow}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t.dayStart}</InputLabel>
                <Select
                  label={t.dayStart}
                  value={String(dayStartHour)}
                  onChange={(e: SelectChangeEvent) => {
                    setDayStartHour(Number(e.target.value))
                  }}>
                  {HOUR_OPTIONS.map((hour) => (
                    <MenuItem key={hour} value={hour}>
                      {formatHour(hour)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" error={dayRangeError}>
                <InputLabel>{t.dayEnd}</InputLabel>
                <Select
                  label={t.dayEnd}
                  value={String(dayEndHour)}
                  onChange={(e: SelectChangeEvent) => {
                    setDayEndHour(Number(e.target.value))
                  }}>
                  {HOUR_OPTIONS.map((hour) => (
                    <MenuItem key={hour} value={hour}>
                      {formatHour(hour)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Typography
              variant="caption"
              color={dayRangeError ? 'error.main' : 'text.secondary'}
              display="block"
              sx={{ mt: 0.5 }}>
              {dayRangeError ? t.dayRangeError : t.dayWindowHelper}
            </Typography>
          </Box>
        </DialogContent>
      </MultiActionDialog>
    </LocalizationProvider>
  )
}
