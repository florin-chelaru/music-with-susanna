import {
  Box,
  Checkbox,
  DialogContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale, toDayjsLocale } from '../../util/SupportedLocale'

interface NewRoundDialogTexts {
  title: string
  deadline: string
  help: string
  pastError: string
  asksEveryone: string
  asksSome: string
  whoHelp: string
  noneChosen: string
  cancel: string
  save: string
}

const EN_US: NewRoundDialogTexts = {
  title: 'New scheduling round',
  deadline: 'Submission deadline',
  help: 'Enrolled students are asked to submit their availability before this time.',
  pastError: 'The deadline must be in the future.',
  asksEveryone: 'Ask everyone enrolled',
  asksSome: 'Ask only some students',
  whoHelp:
    'The students you leave out keep the lessons they have, and those times are not offered to the ones you ask.',
  noneChosen: 'Choose at least one student.',
  cancel: 'Cancel',
  save: 'Open round'
}

const RO_RO: NewRoundDialogTexts = {
  title: 'Rundă nouă de planificare',
  deadline: 'Termen limită',
  help: 'Elevii înscriși sunt rugați să trimită disponibilitatea până la această dată.',
  pastError: 'Termenul trebuie să fie în viitor.',
  asksEveryone: 'Întreabă toți elevii înscriși',
  asksSome: 'Întreabă doar anumiți elevi',
  whoHelp:
    'Elevii pe care nu îi incluzi își păstrează lecțiile, iar acele ore nu le sunt oferite celor întrebați.',
  noneChosen: 'Alege cel puțin un elev.',
  cancel: 'Anulează',
  save: 'Deschide runda'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface NewRoundDialogProps {
  open: boolean
  /** The semester's enrolled students, by id, for the "only some" case. */
  students: Array<{ id: string; name: string }>
  onClose: () => void
  /** `studentIds` is null when the round asks everyone. */
  onSave: (deadline: number, studentIds: string[] | null) => void
}

export default function NewRoundDialog({ open, students, onClose, onSave }: NewRoundDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(NewRoundDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(NewRoundDialog.name) as NewRoundDialogTexts

  // A week out is the common case; the teacher adjusts from there.
  const [deadline, setDeadline] = useState<Dayjs | null>(() =>
    dayjs().add(7, 'day').hour(23).minute(59)
  )
  const [error, setError] = useState(false)
  // Everyone, unless the teacher says otherwise — which is what every round was before this.
  const [everyone, setEveryone] = useState(true)
  const [chosen, setChosen] = useState<string[]>([])

  function handleSave() {
    if (!deadline || !deadline.isAfter(dayjs())) {
      setError(true)
      return
    }
    if (!everyone && chosen.length === 0) return
    onSave(deadline.valueOf(), everyone ? null : chosen)
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
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale={toDayjsLocale(localeManager.locale)}>
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

            {/* A round for one student is how someone who joined late gets scheduled, and how an
                existing student's lesson is allowed to move: being asked is what makes it
                moveable. */}
            <RadioGroup
              value={everyone ? 'all' : 'some'}
              onChange={(event) => {
                setEveryone(event.target.value === 'all')
              }}
              sx={{ mt: 2 }}>
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label={<Typography variant="body2">{t.asksEveryone}</Typography>}
              />
              <FormControlLabel
                value="some"
                control={<Radio size="small" />}
                label={<Typography variant="body2">{t.asksSome}</Typography>}
              />
            </RadioGroup>

            {!everyone && (
              <Box sx={{ pl: 1 }}>
                {students.map((student) => (
                  <FormControlLabel
                    key={student.id}
                    sx={{ display: 'flex' }}
                    control={
                      <Checkbox
                        size="small"
                        checked={chosen.includes(student.id)}
                        onChange={(event) => {
                          setChosen((previous) =>
                            event.target.checked
                              ? [...previous, student.id]
                              : previous.filter((id) => id !== student.id)
                          )
                        }}
                      />
                    }
                    label={<Typography variant="body2">{student.name}</Typography>}
                  />
                ))}
                <Typography variant="caption" color="text.secondary" display="block">
                  {chosen.length === 0 ? t.noneChosen : t.whoHelp}
                </Typography>
              </Box>
            )}
          </Box>
        </LocalizationProvider>
      </DialogContent>
    </MultiActionDialog>
  )
}
