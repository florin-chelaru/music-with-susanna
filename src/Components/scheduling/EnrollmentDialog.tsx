import {
  Box,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography
} from '@mui/material'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { StudentEnrollment } from '../../util/scheduling'

interface EnrollmentDialogTexts {
  title: string
  student: string
  noStudentsAvailable: string
  duration: string
  totalLessons: string
  cancellationWindow: string
  cancellationWindowHelper: string
  cancel: string
  save: string
}

const EN_US: EnrollmentDialogTexts = {
  title: 'Enroll Student',
  student: 'Student',
  noStudentsAvailable: 'All students are already enrolled.',
  duration: 'Lesson Duration (min)',
  totalLessons: 'Total Lessons',
  cancellationWindow: 'Cancellation Window (h)',
  cancellationWindowHelper: 'Leave empty to use the semester default',
  cancel: 'Cancel',
  save: 'Enroll'
}

const RO_RO: EnrollmentDialogTexts = {
  title: 'Înscrie elev',
  student: 'Elev',
  noStudentsAvailable: 'Toți elevii sunt deja înscriși.',
  duration: 'Durată lecție (min)',
  totalLessons: 'Total lecții',
  cancellationWindow: 'Fereastră anulare (h)',
  cancellationWindowHelper: 'Lasă gol pentru a folosi valoarea implicită a semestrului',
  cancel: 'Anulează',
  save: 'Înscrie'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface EnrollmentDialogProps {
  open: boolean
  students: Record<string, { name: string; email: string }>
  alreadyEnrolledIds: string[]
  onClose: () => void
  onSave: (enrollment: StudentEnrollment) => void
}

export default function EnrollmentDialog({
  open,
  students,
  alreadyEnrolledIds,
  onClose,
  onSave
}: EnrollmentDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(EnrollmentDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(EnrollmentDialog.name) as EnrollmentDialogTexts

  const availableStudents = useMemo(
    () =>
      Object.entries(students)
        .filter(([id]) => !alreadyEnrolledIds.includes(id))
        .map(([id, info]) => ({ id, ...info }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, alreadyEnrolledIds]
  )

  const [studentId, setStudentId] = useState<string>(availableStudents[0]?.id ?? '')
  const [duration, setDuration] = useState('45')
  const [totalLessons, setTotalLessons] = useState('15')
  const [windowHours, setWindowHours] = useState('')

  const noneAvailable = availableStudents.length === 0

  function handleSave() {
    if (!studentId) return
    const dur = parseInt(duration, 10)
    const total = parseInt(totalLessons, 10)
    const wh = windowHours.trim() !== '' ? parseInt(windowHours.trim(), 10) : undefined
    onSave({
      studentId,
      lessonDurationMinutes: isNaN(dur) ? 45 : dur,
      totalLessons: isNaN(total) ? 15 : total,
      cancellationWindowHours: wh !== undefined && !isNaN(wh) ? wh : undefined
    })
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={t.title}
      actions={[
        { label: t.cancel, onClick: onClose },
        { label: t.save, onClick: handleSave, disabled: noneAvailable || !studentId }
      ]}>
      <DialogContent>
        {noneAvailable ? (
          <Typography color="text.secondary">{t.noStudentsAvailable}</Typography>
        ) : (
          <Box sx={{ minWidth: 300 }}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>{t.student}</InputLabel>
              <Select
                label={t.student}
                value={studentId}
                onChange={(e: SelectChangeEvent) => {
                  setStudentId(e.target.value)
                }}>
                {availableStudents.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t.duration}
              type="number"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value)
              }}
              required
              fullWidth
              margin="normal"
              inputProps={{ min: 15, step: 15 }}
            />
            <TextField
              label={t.totalLessons}
              type="number"
              value={totalLessons}
              onChange={(e) => {
                setTotalLessons(e.target.value)
              }}
              required
              fullWidth
              margin="normal"
              inputProps={{ min: 1 }}
            />
            <TextField
              label={t.cancellationWindow}
              type="number"
              value={windowHours}
              onChange={(e) => {
                setWindowHours(e.target.value)
              }}
              fullWidth
              margin="normal"
              helperText={t.cancellationWindowHelper}
              inputProps={{ min: 0 }}
            />
          </Box>
        )}
      </DialogContent>
    </MultiActionDialog>
  )
}
