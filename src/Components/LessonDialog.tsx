import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Checkbox,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import MultiActionDialog from './MultiActionDialog'
import { Lesson, RecurringPattern } from '../util/Lesson'
import { User } from '../util/User'
import { SupportedLocale } from '../util/SupportedLocale'

export interface LessonDialogTexts {
  titleCreate: string
  titleEdit: string
  titleRequest: string
  student: string
  teacher: string
  date: string
  time: string
  duration: string
  notes: string
  recurring: string
  recurringPattern: string
  occurrences: string
  patternWeekly: string
  patternBiweekly: string
  patternMonthly: string
  save: string
  cancel: string
  requestLesson: string
  pendingNote: string
  errorStudentRequired: string
  errorTeacherRequired: string
  errorDateRequired: string
  errorTimeRequired: string
  errorPastDate: string
}

export const LESSON_DIALOG_TEXTS = new Map<SupportedLocale, LessonDialogTexts>([
  [
    SupportedLocale.EN_US,
    {
      titleCreate: 'Schedule Lesson',
      titleEdit: 'Edit Lesson',
      titleRequest: 'Request a Lesson',
      student: 'Student',
      teacher: 'Teacher',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      notes: 'Notes',
      recurring: 'Recurring lesson',
      recurringPattern: 'Repeat',
      occurrences: 'Number of occurrences',
      patternWeekly: 'Every week',
      patternBiweekly: 'Every 2 weeks',
      patternMonthly: 'Every month',
      save: 'Save',
      cancel: 'Cancel',
      requestLesson: 'Send Request',
      pendingNote: 'The teacher will confirm your request.',
      errorStudentRequired: 'Please select a student.',
      errorTeacherRequired: 'Please select a teacher.',
      errorDateRequired: 'Please select a date.',
      errorTimeRequired: 'Please select a time.',
      errorPastDate: 'The lesson must be scheduled in the future.'
    }
  ],
  [
    SupportedLocale.RO_RO,
    {
      titleCreate: 'Programează Lecție',
      titleEdit: 'Editează Lecția',
      titleRequest: 'Solicită o Lecție',
      student: 'Elev',
      teacher: 'Profesor',
      date: 'Data',
      time: 'Ora',
      duration: 'Durată',
      notes: 'Notițe',
      recurring: 'Lecție recurentă',
      recurringPattern: 'Repetare',
      occurrences: 'Număr de repetări',
      patternWeekly: 'Săptămânal',
      patternBiweekly: 'La 2 săptămâni',
      patternMonthly: 'Lunar',
      save: 'Salvează',
      cancel: 'Anulează',
      requestLesson: 'Trimite Cererea',
      pendingNote: 'Profesorul va confirma cererea ta.',
      errorStudentRequired: 'Te rugăm să selectezi un elev.',
      errorTeacherRequired: 'Te rugăm să selectezi un profesor.',
      errorDateRequired: 'Te rugăm să selectezi o dată.',
      errorTimeRequired: 'Te rugăm să selectezi o oră.',
      errorPastDate: 'Lecția trebuie programată în viitor.'
    }
  ]
])

const DURATIONS = [30, 45, 60, 90]

export interface LessonDialogProps {
  open: boolean
  texts: LessonDialogTexts
  /** Editing an existing lesson — omit for new */
  lesson?: Partial<Lesson>
  /** Teacher-only: list of students to pick from */
  students?: User[]
  /** Student-only: list of available teachers */
  teachers?: User[]
  /** Whether the current user is the teacher */
  isTeacher: boolean
  onSave: (data: LessonFormData) => void
  onClose: () => void
}

export interface LessonFormData {
  studentId?: string
  teacherId?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  notes: string
  recurring: boolean
  recurringPattern: RecurringPattern
  occurrences: number
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function toTimeString(timestamp: number): string {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function LessonDialog({
  open,
  texts,
  lesson,
  students,
  teachers,
  isTeacher,
  onSave,
  onClose
}: LessonDialogProps) {
  const isEditing = !!lesson?.id
  const formRef = useRef<HTMLFormElement>(null)
  const [recurring, setRecurring] = useState<boolean>(lesson?.recurring ?? false)
  const [errors, setErrors] = useState<{
    student?: string
    teacher?: string
    date?: string
    time?: string
  }>({})

  useEffect(() => {
    setRecurring(lesson?.recurring ?? false)
    setErrors({})
  }, [lesson, open])

  const title = isEditing ? texts.titleEdit : isTeacher ? texts.titleCreate : texts.titleRequest

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const date = data.get('date') as string
    const time = data.get('time') as string

    const studentId = data.get('studentId') as string
    const teacherId = data.get('teacherId') as string

    const newErrors: { student?: string; teacher?: string; date?: string; time?: string } = {}
    if (isTeacher && students && students.length > 0 && !studentId) {
      newErrors.student = texts.errorStudentRequired
    }
    if (!isTeacher && teachers && teachers.length > 1 && !teacherId) {
      newErrors.teacher = texts.errorTeacherRequired
    }
    if (!date) newErrors.date = texts.errorDateRequired
    if (!time) newErrors.time = texts.errorTimeRequired
    if (date && time && new Date(`${date}T${time}`).getTime() <= Date.now()) {
      newErrors.date = texts.errorPastDate
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    onSave({
      studentId: (data.get('studentId') as string) || undefined,
      teacherId: (data.get('teacherId') as string) || undefined,
      date,
      time,
      durationMinutes: Number(data.get('durationMinutes')),
      notes: (data.get('notes') as string) ?? '',
      recurring: recurring && !isEditing,
      recurringPattern: (data.get('recurringPattern') as RecurringPattern) ?? 'weekly',
      occurrences: Number(data.get('occurrences') ?? 10)
    })
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={[
        { label: texts.cancel, onClick: onClose },
        {
          label: isEditing ? texts.save : isTeacher ? texts.save : texts.requestLesson,
          autoFocus: true,
          onClick: () => {
            formRef.current?.requestSubmit()
          }
        }
      ]}>
      <DialogContent>
        <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            {isTeacher && students && (
              <FormControl fullWidth error={!!errors.student}>
                <InputLabel id="student-label">{texts.student}</InputLabel>
                <Select
                  labelId="student-label"
                  name="studentId"
                  label={texts.student}
                  defaultValue={lesson?.studentId ?? ''}
                  onChange={() => setErrors((prev) => ({ ...prev, student: undefined }))}>
                  {students.map((s) => (
                    <MenuItem key={s.uid} value={s.uid}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.student && <FormHelperText>{errors.student}</FormHelperText>}
              </FormControl>
            )}
            {!isTeacher && teachers && teachers.length > 1 && (
              <FormControl fullWidth error={!!errors.teacher}>
                <InputLabel id="teacher-label">{texts.teacher}</InputLabel>
                <Select
                  labelId="teacher-label"
                  name="teacherId"
                  label={texts.teacher}
                  defaultValue={lesson?.teacherId ?? teachers[0]?.uid ?? ''}
                  onChange={() => setErrors((prev) => ({ ...prev, teacher: undefined }))}>
                  {teachers.map((t) => (
                    <MenuItem key={t.uid} value={t.uid}>
                      {t.subject ? `${t.name} (${t.subject})` : t.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.teacher && <FormHelperText>{errors.teacher}</FormHelperText>}
              </FormControl>
            )}
            {!isTeacher && teachers && teachers.length === 1 && (
              <Typography variant="body2" color="text.secondary">
                {texts.teacher}:{' '}
                <strong>
                  {teachers[0].name}
                  {teachers[0].subject ? ` (${teachers[0].subject})` : ''}
                </strong>
              </Typography>
            )}
            <TextField
              label={texts.date}
              name="date"
              type="date"
              defaultValue={lesson?.startTime ? toDateString(lesson.startTime) : ''}
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!errors.date}
              helperText={errors.date}
              onChange={() => setErrors((prev) => ({ ...prev, date: undefined }))}
            />
            <TextField
              label={texts.time}
              name="time"
              type="time"
              defaultValue={lesson?.startTime ? toTimeString(lesson.startTime) : ''}
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!errors.time}
              helperText={errors.time}
              onChange={() => setErrors((prev) => ({ ...prev, time: undefined }))}
            />
            <FormControl fullWidth required>
              <InputLabel id="duration-label">{texts.duration}</InputLabel>
              <Select
                labelId="duration-label"
                name="durationMinutes"
                label={texts.duration}
                defaultValue={lesson?.durationMinutes ?? 45}>
                {DURATIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d} min
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={texts.notes}
              name="notes"
              multiline
              rows={2}
              fullWidth
              defaultValue={lesson?.notes ?? ''}
            />
            {!isEditing && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="recurring"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                    />
                  }
                  label={texts.recurring}
                />
                {recurring && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel id="pattern-label">{texts.recurringPattern}</InputLabel>
                      <Select
                        labelId="pattern-label"
                        name="recurringPattern"
                        label={texts.recurringPattern}
                        defaultValue={lesson?.recurringPattern ?? 'weekly'}>
                        <MenuItem value="weekly">{texts.patternWeekly}</MenuItem>
                        <MenuItem value="biweekly">{texts.patternBiweekly}</MenuItem>
                        <MenuItem value="monthly">{texts.patternMonthly}</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label={texts.occurrences}
                      name="occurrences"
                      type="number"
                      defaultValue={10}
                      inputProps={{ min: 2, max: 52 }}
                      fullWidth
                    />
                  </>
                )}
              </>
            )}
            {!isTeacher && !isEditing && (
              <Typography variant="caption" color="text.secondary">
                {texts.pendingNote}
              </Typography>
            )}
          </Stack>
        </Box>
      </DialogContent>
    </MultiActionDialog>
  )
}
