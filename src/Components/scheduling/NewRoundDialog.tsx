import { Box, DialogContent, Typography } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'

interface NewRoundDialogTexts {
  title: string
  deadline: string
  help: string
  pastError: string
  cancel: string
  save: string
}

const EN_US: NewRoundDialogTexts = {
  title: 'New scheduling round',
  deadline: 'Submission deadline',
  help: 'Enrolled students are asked to submit their availability before this time.',
  pastError: 'The deadline must be in the future.',
  cancel: 'Cancel',
  save: 'Open round'
}

const RO_RO: NewRoundDialogTexts = {
  title: 'Rundă nouă de planificare',
  deadline: 'Termen limită',
  help: 'Elevii înscriși sunt rugați să trimită disponibilitatea până la această dată.',
  pastError: 'Termenul trebuie să fie în viitor.',
  cancel: 'Anulează',
  save: 'Deschide runda'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface NewRoundDialogProps {
  open: boolean
  onClose: () => void
  onSave: (deadline: number) => void
}

export default function NewRoundDialog({ open, onClose, onSave }: NewRoundDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(NewRoundDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(NewRoundDialog.name) as NewRoundDialogTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  // A week out is the common case; the teacher adjusts from there.
  const [deadline, setDeadline] = useState<Dayjs | null>(() =>
    dayjs().add(7, 'day').hour(23).minute(59)
  )
  const [error, setError] = useState(false)

  function handleSave() {
    if (!deadline || !deadline.isAfter(dayjs())) {
      setError(true)
      return
    }
    onSave(deadline.valueOf())
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={t.title}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: t.cancel, onClick: onClose },
        { label: t.save, autoFocus: true, onClick: handleSave }
      ]}>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
          <Box sx={{ pt: 0.5 }}>
            <DateTimePicker
              label={t.deadline}
              value={deadline}
              onChange={(v: Dayjs | null) => {
                setDeadline(v)
                setError(false)
              }}
              format="D MMM YYYY, HH:mm"
              minDateTime={dayjs()}
              ampm={false}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  error,
                  helperText: error ? t.pastError : ''
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t.help}
            </Typography>
          </Box>
        </LocalizationProvider>
      </DialogContent>
    </MultiActionDialog>
  )
}
