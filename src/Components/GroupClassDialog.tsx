import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Checkbox,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material'
import MultiActionDialog from './MultiActionDialog'
import { GroupClass, RecurringPattern } from '../util/Lesson'
import { User } from '../util/User'
import { SupportedLocale } from '../util/SupportedLocale'

export interface GroupClassDialogTexts {
  titleCreate: string
  titleEdit: string
  title: string
  description: string
  date: string
  time: string
  duration: string
  students: string
  recurring: string
  recurringPattern: string
  occurrences: string
  patternWeekly: string
  patternBiweekly: string
  patternMonthly: string
  save: string
  cancel: string
  errorStudentsRequired: string
  errorDateRequired: string
  errorTimeRequired: string
  errorPastDate: string
}

export const GROUP_CLASS_DIALOG_TEXTS = new Map<SupportedLocale, GroupClassDialogTexts>([
  [
    SupportedLocale.EN_US,
    {
      titleCreate: 'Create Group Class',
      titleEdit: 'Edit Group Class',
      title: 'Class title',
      description: 'Description',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      students: 'Students',
      recurring: 'Recurring class',
      recurringPattern: 'Repeat',
      occurrences: 'Number of occurrences',
      patternWeekly: 'Every week',
      patternBiweekly: 'Every 2 weeks',
      patternMonthly: 'Every month',
      save: 'Save',
      cancel: 'Cancel',
      errorStudentsRequired: 'Please enroll at least one student.',
      errorDateRequired: 'Please select a date.',
      errorTimeRequired: 'Please select a time.',
      errorPastDate: 'The class must be scheduled in the future.'
    }
  ],
  [
    SupportedLocale.RO_RO,
    {
      titleCreate: 'Creează Clasă de Grup',
      titleEdit: 'Editează Clasa de Grup',
      title: 'Titlul clasei',
      description: 'Descriere',
      date: 'Data',
      time: 'Ora',
      duration: 'Durată',
      students: 'Elevi',
      recurring: 'Clasă recurentă',
      recurringPattern: 'Repetare',
      occurrences: 'Număr de repetări',
      patternWeekly: 'Săptămânal',
      patternBiweekly: 'La 2 săptămâni',
      patternMonthly: 'Lunar',
      save: 'Salvează',
      cancel: 'Anulează',
      errorStudentsRequired: 'Te rugăm să înscrii cel puțin un elev.',
      errorDateRequired: 'Te rugăm să selectezi o dată.',
      errorTimeRequired: 'Te rugăm să selectezi o oră.',
      errorPastDate: 'Clasa trebuie programată în viitor.'
    }
  ]
])

const DURATIONS = [30, 45, 60, 90, 120]

export interface GroupClassFormData {
  title: string
  description: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  enrolledStudentIds: string[]
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

export interface GroupClassDialogProps {
  open: boolean
  texts: GroupClassDialogTexts
  groupClass?: Partial<GroupClass>
  students?: User[]
  onSave: (data: GroupClassFormData) => void
  onClose: () => void
}

export default function GroupClassDialog({
  open,
  texts,
  groupClass,
  students,
  onSave,
  onClose
}: GroupClassDialogProps) {
  const isEditing = !!groupClass?.id
  const formRef = useRef<HTMLFormElement>(null)
  const [recurring, setRecurring] = useState<boolean>(groupClass?.recurring ?? false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    Object.keys(groupClass?.enrolledStudents ?? {})
  )
  const [errors, setErrors] = useState<{
    students?: string
    date?: string
    time?: string
  }>({})

  useEffect(() => {
    setRecurring(groupClass?.recurring ?? false)
    setSelectedStudentIds(Object.keys(groupClass?.enrolledStudents ?? {}))
    setErrors({})
  }, [groupClass, open])

  const toggleStudent = (uid: string, checked: boolean) => {
    setSelectedStudentIds((prev) => (checked ? [...prev, uid] : prev.filter((id) => id !== uid)))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const date = data.get('date') as string
    const time = data.get('time') as string

    const newErrors: { students?: string; date?: string; time?: string } = {}
    if (students && students.length > 0 && selectedStudentIds.length === 0) {
      newErrors.students = texts.errorStudentsRequired
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
      title: data.get('title') as string,
      description: (data.get('description') as string) ?? '',
      date,
      time,
      durationMinutes: Number(data.get('durationMinutes')),
      enrolledStudentIds: selectedStudentIds,
      recurring: recurring && !isEditing,
      recurringPattern: (data.get('recurringPattern') as RecurringPattern) ?? 'weekly',
      occurrences: Number(data.get('occurrences') ?? 10)
    })
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={isEditing ? texts.titleEdit : texts.titleCreate}
      actions={[
        { label: texts.cancel, onClick: onClose },
        {
          label: texts.save,
          autoFocus: true,
          onClick: () => formRef.current?.requestSubmit()
        }
      ]}>
      <DialogContent>
        <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <TextField
              label={texts.title}
              name="title"
              required
              fullWidth
              defaultValue={groupClass?.title ?? ''}
            />
            <TextField
              label={texts.description}
              name="description"
              multiline
              rows={2}
              fullWidth
              defaultValue={groupClass?.description ?? ''}
            />
            <TextField
              label={texts.date}
              name="date"
              type="date"
              defaultValue={groupClass?.startTime ? toDateString(groupClass.startTime) : ''}
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
              defaultValue={groupClass?.startTime ? toTimeString(groupClass.startTime) : ''}
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
                defaultValue={groupClass?.durationMinutes ?? 60}>
                {DURATIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d} min
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {students && students.length > 0 && (
              <FormControl component="fieldset" error={!!errors.students}>
                <FormLabel component="legend">{texts.students}</FormLabel>
                <FormGroup>
                  {students.map((s) => (
                    <FormControlLabel
                      key={s.uid}
                      control={
                        <Checkbox
                          checked={selectedStudentIds.includes(s.uid ?? '')}
                          onChange={(e) => {
                            toggleStudent(s.uid ?? '', e.target.checked)
                            setErrors((prev) => ({ ...prev, students: undefined }))
                          }}
                        />
                      }
                      label={s.name ?? ''}
                    />
                  ))}
                </FormGroup>
                {errors.students && <FormHelperText>{errors.students}</FormHelperText>}
              </FormControl>
            )}
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
                        defaultValue="weekly">
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
          </Stack>
        </Box>
      </DialogContent>
    </MultiActionDialog>
  )
}
