import { Box, DialogContent, TextField } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ro'
import { useContext, useMemo, useRef, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { Semester } from '../../util/scheduling'

interface SemesterDialogTexts {
  title: string
  editTitle: string
  name: string
  startDate: string
  endDate: string
  cancellationWindow: string
  cancel: string
  save: string
  dateRangeError: string
}

const EN_US: SemesterDialogTexts = {
  title: 'Add Semester',
  editTitle: 'Edit Semester',
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
  'name' | 'startDate' | 'endDate' | 'defaultCancellationWindowHours'
>

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
    onSave({
      name,
      startDate: start,
      endDate: end,
      defaultCancellationWindowHours: isNaN(hours) ? 24 : hours
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
          </Box>
        </DialogContent>
      </MultiActionDialog>
    </LocalizationProvider>
  )
}
