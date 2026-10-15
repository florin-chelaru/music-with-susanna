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
import { LessonDistribution, StudentEnrollment, weeklyQuota } from '../../util/scheduling'

interface EnrollmentDialogTexts {
  title: string
  student: string
  noStudentsAvailable: string
  duration: string
  totalLessons: string
  totalLessonsHelper: (weeks: number) => string
  weeksRemainingHelper: (weeks: number) => string
  distribution: string
  spreadEven: string
  spreadStart: string
  spreadEnd: string
  perWeek: string
  spreadsAgree: string
  cancellationWindow: string
  cancellationWindowDefault: string
  cancellationWindowOverride: (hours: number) => string
  cancel: string
  save: string
}

const EN_US: EnrollmentDialogTexts = {
  title: 'Enroll Student',
  student: 'Student',
  noStudentsAvailable: 'All students are already enrolled.',
  duration: 'Lesson Duration (min)',
  totalLessons: 'Total Lessons',
  totalLessonsHelper: (weeks) => `${weeks} weeks in this semester`,
  weeksRemainingHelper: (weeks) => `${weeks} weeks left, starting next week`,
  distribution: 'Spread',
  spreadEven: 'Even spread',
  spreadStart: 'More at the start',
  spreadEnd: 'More at the end',
  perWeek: 'Lessons per week',
  spreadsAgree: 'These divide evenly across the term, so all three spreads give this.',
  cancellationWindow: 'Cancellation Window (h)',
  cancellationWindowDefault: 'The semester default. Change it to set one for this student alone.',
  cancellationWindowOverride: (hours) =>
    `Just for this student — the semester default is ${hours} h.`,
  cancel: 'Cancel',
  save: 'Enroll'
}

const RO_RO: EnrollmentDialogTexts = {
  title: 'Înscrie elev',
  student: 'Elev',
  noStudentsAvailable: 'Toți elevii sunt deja înscriși.',
  duration: 'Durată lecție (min)',
  totalLessons: 'Total lecții',
  totalLessonsHelper: (weeks) => `${weeks} săptămâni în acest semestru`,
  weeksRemainingHelper: (weeks) => `${weeks} săptămâni rămase, începând de săptămâna viitoare`,
  distribution: 'Repartizare',
  spreadEven: 'Uniformă',
  spreadStart: 'Mai multe la început',
  spreadEnd: 'Mai multe la final',
  perWeek: 'Lecții pe săptămână',
  spreadsAgree: 'Se împart exact pe săptămâni, așa că toate cele trei variante dau asta.',
  cancellationWindow: 'Fereastră anulare (h)',
  cancellationWindowDefault:
    'Valoarea implicită a semestrului. Schimb-o ca să o setezi doar pentru acest elev.',
  cancellationWindowOverride: (hours) =>
    `Doar pentru acest elev — valoarea semestrului este ${hours} h.`,
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
  /** Weeks in the semester. Draws the spread preview. */
  weeks: number
  /**
   * Weeks still to come, when the semester is already running. Sets the default lesson count for
   * someone joining late — a whole term's worth would be wrong for them, and the number they are
   * shown has to be the one their round will actually schedule against.
   */
  weeksRemaining?: number
  /** Shown in the cancellation field, and what a value equal to it means: inherit, not pin. */
  defaultCancellationWindowHours: number
  onClose: () => void
  onSave: (enrollment: StudentEnrollment) => void
}

export default function EnrollmentDialog({
  open,
  students,
  alreadyEnrolledIds,
  weeks,
  weeksRemaining,
  defaultCancellationWindowHours,
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
  // One a week, which is what almost every enrollment is. The week count is shown next to the
  // field so a teacher wanting a different cadence can work the number out rather than guess.
  const [totalLessons, setTotalLessons] = useState(String(Math.max(1, weeksRemaining ?? weeks)))
  const [distribution, setDistribution] = useState<LessonDistribution>('even')
  // Shown rather than left blank, because an empty box with "leave empty for the default" makes
  // the teacher go and look the default up. Storing it is a different question — see handleSave.
  const [windowHours, setWindowHours] = useState(String(defaultCancellationWindowHours))

  const noneAvailable = availableStudents.length === 0

  const total = parseInt(totalLessons, 10)
  const previewable = !isNaN(total) && total > 0 && weeks > 0

  // Drawn with the same function the solver fills, so the preview cannot promise a pattern the
  // schedule will not have.
  const quota = previewable ? weeklyQuota(total, weeks, distribution) : []

  // The control does nothing when the lessons divide evenly, and a control that appears broken
  // is worse than one that is visibly inert — so say which it is.
  const spreadsAgree =
    previewable &&
    (['start', 'end'] as LessonDistribution[]).every(
      (mode) => weeklyQuota(total, weeks, mode).join() === weeklyQuota(total, weeks, 'even').join()
    )

  function handleSave() {
    if (!studentId) return
    const dur = parseInt(duration, 10)
    const typed = windowHours.trim() !== '' ? parseInt(windowHours.trim(), 10) : undefined
    // A value matching the semester's is left unset, so the enrollment keeps inheriting: change
    // the semester's window later and this student follows, which is what an untouched field
    // ought to mean. Only a figure the teacher actually changed is stored as an override.
    const wh = typed === defaultCancellationWindowHours ? undefined : typed
    onSave({
      studentId,
      lessonDurationMinutes: isNaN(dur) ? 45 : dur,
      totalLessons: isNaN(total) ? 15 : total,
      distribution,
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
              helperText={
                weeksRemaining === undefined
                  ? t.totalLessonsHelper(weeks)
                  : t.weeksRemainingHelper(weeksRemaining)
              }
              inputProps={{ min: 1 }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>{t.distribution}</InputLabel>
              <Select
                label={t.distribution}
                value={distribution}
                onChange={(e: SelectChangeEvent) => {
                  setDistribution(e.target.value as LessonDistribution)
                }}>
                <MenuItem value="even">{t.spreadEven}</MenuItem>
                <MenuItem value="start">{t.spreadStart}</MenuItem>
                <MenuItem value="end">{t.spreadEnd}</MenuItem>
              </Select>
            </FormControl>

            {/* The preview is what stops a teacher picking a spread by accident: with fewer
                lessons than weeks these modes mean spread-versus-cluster, so "more at the start"
                turns a bi-weekly student into eight weeks running and then silence. */}
            {quota.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t.perWeek}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mt: 0.5
                  }}>
                  {quota.map((count, week) => (
                    <Box
                      key={week}
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: count === 0 ? 'text.disabled' : 'primary.main',
                        backgroundColor: count === 0 ? 'action.hover' : 'action.selected'
                      }}>
                      {count}
                    </Box>
                  ))}
                </Box>
                {spreadsAgree && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}>
                    {t.spreadsAgree}
                  </Typography>
                )}
              </Box>
            )}
            <TextField
              label={t.cancellationWindow}
              type="number"
              value={windowHours}
              onChange={(e) => {
                setWindowHours(e.target.value)
              }}
              fullWidth
              margin="normal"
              helperText={
                windowHours.trim() === String(defaultCancellationWindowHours)
                  ? t.cancellationWindowDefault
                  : t.cancellationWindowOverride(defaultCancellationWindowHours)
              }
              inputProps={{ min: 0 }}
            />
          </Box>
        )}
      </DialogContent>
    </MultiActionDialog>
  )
}
