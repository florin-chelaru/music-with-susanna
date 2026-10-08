import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ro'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AvailabilityCalendar from '../../Components/scheduling/AvailabilityCalendar'
import CancelLessonDialog, {
  CancelLessonOptions
} from '../../Components/scheduling/CancelLessonDialog'
import EnrollmentDialog from '../../Components/scheduling/EnrollmentDialog'
import LessonCalendar from '../../Components/scheduling/LessonCalendar'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import {
  AvailabilityBlock,
  LessonInstance,
  SemesterStatus,
  StudentEnrollment,
  WeeklyAvailability
} from '../../util/scheduling'
import { parseDate, weekStartDate, weekStartOf } from '../../util/schedulingDates'
import {
  MOCK_ENROLLMENTS_FALL,
  MOCK_ENROLLMENTS_SPRING,
  MOCK_LESSON_INSTANCES_FALL,
  MOCK_LESSON_INSTANCES_SPRING,
  MOCK_LOCATIONS,
  MOCK_SEMESTER_IDS,
  MOCK_SEMESTERS,
  MOCK_STUDENTS,
  MOCK_TEACHER_AVAILABILITY
} from '../../data/schedulingMocks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SemesterPageTexts {
  tabAvailability: string
  tabStudents: string
  tabScheduling: string
  tabCalendar: string
  weeklyTemplate: string
  weekOverrides: string
  addOverride: string
  weekOf: string
  saving: string
  saved: string
  statusDraft: string
  statusScheduling: string
  statusActive: string
  statusCompleted: string
  comingSoon: string
  addStudent: string
  noStudents: string
  colStudent: string
  colDuration: string
  colTotalLessons: string
  colCancellationWindow: string
  defaultWindow: string
}

const EN_US: SemesterPageTexts = {
  tabAvailability: 'Availability',
  tabStudents: 'Students',
  tabScheduling: 'Scheduling',
  tabCalendar: 'Calendar',
  weeklyTemplate: 'Weekly Template',
  weekOverrides: 'Week Overrides',
  addOverride: 'Add Override',
  weekOf: 'Week of',
  saving: 'Saving…',
  saved: 'Saved',
  statusDraft: 'Draft',
  statusScheduling: 'Scheduling',
  statusActive: 'Active',
  statusCompleted: 'Completed',
  comingSoon: 'Coming soon',
  addStudent: 'Add Student',
  noStudents: 'No students enrolled.',
  colStudent: 'Student',
  colDuration: 'Duration',
  colTotalLessons: 'Total Lessons',
  colCancellationWindow: 'Cancellation Window',
  defaultWindow: 'Default'
}

const RO_RO: SemesterPageTexts = {
  tabAvailability: 'Disponibilitate',
  tabStudents: 'Elevi',
  tabScheduling: 'Planificare',
  tabCalendar: 'Calendar',
  weeklyTemplate: 'Șablon săptămânal',
  weekOverrides: 'Excepții săptămânale',
  addOverride: 'Adaugă excepție',
  weekOf: 'Săptămâna din',
  saving: 'Se salvează…',
  saved: 'Salvat',
  statusDraft: 'Draft',
  statusScheduling: 'În planificare',
  statusActive: 'Activ',
  statusCompleted: 'Finalizat',
  comingSoon: 'În curând',
  addStudent: 'Adaugă elev',
  noStudents: 'Niciun elev înscris.',
  colStudent: 'Elev',
  colDuration: 'Durată',
  colTotalLessons: 'Total lecții',
  colCancellationWindow: 'Fereastră anulare',
  defaultWindow: 'Implicit'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusChipColor(status: SemesterStatus): 'default' | 'primary' | 'success' {
  if (status === 'scheduling') return 'primary'
  if (status === 'active') return 'success'
  return 'default'
}

// Format a YYYY-MM-DD week-start string for display.
function formatWeekStart(weekStart: string, locale: SupportedLocale): string {
  const fmt = new Intl.DateTimeFormat(locale === SupportedLocale.RO_RO ? 'ro-RO' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  return fmt.format(parseDate(weekStart).toDate())
}

function statusLabel(status: SemesterStatus, t: SemesterPageTexts): string {
  switch (status) {
    case 'draft':
      return t.statusDraft
    case 'scheduling':
      return t.statusScheduling
    case 'active':
      return t.statusActive
    case 'completed':
      return t.statusCompleted
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SemesterPage() {
  const { semesterId } = useParams<{ semesterId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(SemesterPage.name, TEXTS), [])
  const t = localeManager.componentStrings(SemesterPage.name) as SemesterPageTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  // ── Auth guard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
      return
    }
    if (user.role !== UserRole.TEACHER) {
      navigate('/')
    }
  }, [user.loading, user.uid, user.role])

  // ── Mock data lookup ─────────────────────────────────────────────────────────

  const semester = MOCK_SEMESTERS.find((s) => s.id === semesterId)
  const location = semester ? MOCK_LOCATIONS.find((l) => l.id === semester.locationId) : null

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState(0)

  // ── Availability state ───────────────────────────────────────────────────────

  const [availability, setAvailability] = useState<WeeklyAvailability>(MOCK_TEACHER_AVAILABILITY)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function triggerAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      // TODO (Step N): write availability to RTDB
      setSaveStatus('saved')
      saveTimer.current = null
    }, 1000)
  }

  function handleTemplateChange(newBlocks: AvailabilityBlock[]) {
    setAvailability((prev) => ({ ...prev, weeklyTemplate: { blocks: newBlocks } }))
    triggerAutoSave()
  }

  function handleOverrideChange(weekStart: string, newBlocks: AvailabilityBlock[]) {
    setAvailability((prev) => ({
      ...prev,
      weekOverrides: { ...prev.weekOverrides, [weekStart]: { blocks: newBlocks } }
    }))
    triggerAutoSave()
  }

  function handleRemoveOverride(weekStart: string) {
    setAvailability((prev) => {
      const { [weekStart]: _removed, ...rest } = prev.weekOverrides
      return { ...prev, weekOverrides: rest }
    })
    triggerAutoSave()
  }

  // ── Enrollment state ─────────────────────────────────────────────────────────

  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>(() => {
    if (semesterId === MOCK_SEMESTER_IDS.spring2026) return [...MOCK_ENROLLMENTS_SPRING]
    if (semesterId === MOCK_SEMESTER_IDS.fall2026) return [...MOCK_ENROLLMENTS_FALL]
    return []
  })
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)

  // ── Lesson state ─────────────────────────────────────────────────────────────

  const [lessons, setLessons] = useState<LessonInstance[]>(() => {
    if (semesterId === MOCK_SEMESTER_IDS.spring2026) return [...MOCK_LESSON_INSTANCES_SPRING]
    if (semesterId === MOCK_SEMESTER_IDS.fall2026) return [...MOCK_LESSON_INSTANCES_FALL]
    return []
  })
  const [cancelTarget, setCancelTarget] = useState<LessonInstance | null>(null)

  function handleConfirmCancel({ cancelAllForward }: CancelLessonOptions) {
    const target = cancelTarget
    if (!target) return
    // TODO (Step Q): write the Cancellation record, update RTDB, notify the other party.
    // `reason` and `offerMakeup` are collected already but have nowhere to go until then.
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id === target.id) return { ...l, status: 'canceled' }
        const laterForSameStudent =
          cancelAllForward &&
          l.studentId === target.studentId &&
          l.scheduledStart > target.scheduledStart &&
          l.status === 'scheduled'
        return laterForSameStudent ? { ...l, status: 'canceled' } : l
      })
    )
    setCancelTarget(null)
  }

  // The calendar opens on today when the semester is running, and on its start date otherwise,
  // so a past or future semester does not open on an empty month.
  const calendarDefaultDate = useMemo(() => {
    if (!semester) return new Date()
    const today = dayjs()
    const from = parseDate(semester.startDate)
    const to = parseDate(semester.endDate)
    if (today.isBefore(from, 'day')) return from.toDate()
    if (today.isAfter(to, 'day')) return to.toDate()
    return today.toDate()
  }, [semester])

  const cancelWindowHours = useMemo(() => {
    if (!cancelTarget || !semester) return semester?.defaultCancellationWindowHours ?? 24
    const enrollment = enrollments.find((e) => e.studentId === cancelTarget.studentId)
    return enrollment?.cancellationWindowHours ?? semester.defaultCancellationWindowHours
  }, [cancelTarget, enrollments, semester])

  function handleAddStudent(enrollment: StudentEnrollment) {
    setEnrollments((prev) => [...prev, enrollment])
    setEnrollDialogOpen(false)
  }

  function handleRemoveStudent(studentId: string) {
    setEnrollments((prev) => prev.filter((e) => e.studentId !== studentId))
  }

  // ── Week override picker ─────────────────────────────────────────────────────

  const [newOverrideDate, setNewOverrideDate] = useState<Dayjs | null>(null)
  const [showOverridePicker, setShowOverridePicker] = useState(false)

  // A week is valid if: it overlaps the semester AND it hasn't fully passed.
  function shouldDisableOverrideDate(date: Dayjs): boolean {
    if (!semester) return true
    const monday = weekStartOf(date)
    const sunday = monday.add(6, 'day')
    if (sunday.isBefore(dayjs(), 'day')) return true
    return (
      monday.isAfter(parseDate(semester.endDate), 'day') ||
      sunday.isBefore(parseDate(semester.startDate), 'day')
    )
  }

  function handleAddOverride() {
    if (!newOverrideDate) return
    const weekStart = weekStartDate(newOverrideDate)
    if (!(weekStart in availability.weekOverrides)) {
      handleOverrideChange(weekStart, [...availability.weeklyTemplate.blocks])
    }
    setNewOverrideDate(null)
    setShowOverridePicker(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const sortedOverrides = useMemo(
    () => Object.entries(availability.weekOverrides).sort(([a], [b]) => a.localeCompare(b)),
    [availability.weekOverrides]
  )

  if (!semester) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Typography color="text.secondary">Semester not found.</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Typography variant="h5">{semester.name}</Typography>
        <Chip
          label={statusLabel(semester.status, t)}
          color={statusChipColor(semester.status)}
          size="small"
        />
      </Stack>
      {location && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {location.name}
        </Typography>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => {
            setTab(v as number)
          }}>
          <Tab label={t.tabAvailability} />
          <Tab label={t.tabStudents} />
          <Tab label={t.tabScheduling} />
          <Tab label={t.tabCalendar} />
        </Tabs>
      </Box>

      {/* ── Availability tab ───────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          {/* Weekly template */}
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.weeklyTemplate}
            </Typography>
            {saveStatus === 'saving' && (
              <Typography variant="caption" color="text.secondary">
                {t.saving}
              </Typography>
            )}
            {saveStatus === 'saved' && (
              <Typography variant="caption" color="success.main">
                {t.saved}
              </Typography>
            )}
          </Stack>
          <AvailabilityCalendar
            blocks={availability.weeklyTemplate.blocks}
            onChange={handleTemplateChange}
          />

          {/* Week overrides */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 4, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.weekOverrides}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setShowOverridePicker((v) => !v)
              }}>
              {t.addOverride}
            </Button>
          </Stack>

          {showOverridePicker && (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <DatePicker
                  label={t.weekOf}
                  value={newOverrideDate}
                  onChange={(v) => {
                    setNewOverrideDate(v)
                  }}
                  format="D MMM YYYY"
                  shouldDisableDate={shouldDisableOverrideDate}
                  minDate={parseDate(semester.startDate)}
                  maxDate={parseDate(semester.endDate)}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <Button variant="contained" size="small" onClick={handleAddOverride}>
                  {t.addOverride}
                </Button>
              </Stack>
            </LocalizationProvider>
          )}

          {sortedOverrides.length === 0 && !showOverridePicker && (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}

          {sortedOverrides.map(([weekStart, { blocks }]) => (
            <Box key={weekStart} sx={{ mb: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {t.weekOf} {formatWeekStart(weekStart, localeManager.locale as SupportedLocale)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    handleRemoveOverride(weekStart)
                  }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <AvailabilityCalendar
                blocks={blocks}
                weekStart={weekStart}
                onChange={(newBlocks) => {
                  handleOverrideChange(weekStart, newBlocks)
                }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ── Students tab ───────────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.tabStudents}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setEnrollDialogOpen(true)
              }}>
              {t.addStudent}
            </Button>
          </Stack>
          {enrollments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t.noStudents}
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t.colStudent}</TableCell>
                  <TableCell align="center">{t.colDuration}</TableCell>
                  <TableCell align="center">{t.colTotalLessons}</TableCell>
                  <TableCell>{t.colCancellationWindow}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const student = MOCK_STUDENTS[enrollment.studentId]
                  return (
                    <TableRow key={enrollment.studentId} hover>
                      <TableCell>{student?.name ?? enrollment.studentId}</TableCell>
                      <TableCell align="center">{enrollment.lessonDurationMinutes} min</TableCell>
                      <TableCell align="center">{enrollment.totalLessons}</TableCell>
                      <TableCell>
                        {enrollment.cancellationWindowHours !== undefined
                          ? `${enrollment.cancellationWindowHours} h`
                          : `${t.defaultWindow} (${semester.defaultCancellationWindowHours} h)`}
                      </TableCell>
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          onClick={() => {
                            handleRemoveStudent(enrollment.studentId)
                          }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <EnrollmentDialog
            key={enrollDialogOpen ? 'open' : 'closed'}
            open={enrollDialogOpen}
            students={MOCK_STUDENTS}
            alreadyEnrolledIds={enrollments.map((e) => e.studentId)}
            onClose={() => {
              setEnrollDialogOpen(false)
            }}
            onSave={handleAddStudent}
          />
        </Box>
      )}

      {/* ── Scheduling tab (not built yet) ─────────────────────────────────── */}
      {tab === 2 && <Typography color="text.secondary">{t.comingSoon}</Typography>}

      {/* ── Calendar tab ───────────────────────────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <LessonCalendar
            lessons={lessons}
            students={MOCK_STUDENTS}
            locationName={location?.name}
            defaultDate={calendarDefaultDate}
            onCancel={(lesson) => {
              setCancelTarget(lesson)
            }}
            onExportIcs={() => {
              // TODO (Step R): generate and download the .ics file
            }}
          />
          <CancelLessonDialog
            key={cancelTarget?.id ?? 'none'}
            open={Boolean(cancelTarget)}
            lesson={cancelTarget}
            studentName={cancelTarget ? MOCK_STUDENTS[cancelTarget.studentId]?.name : undefined}
            cancellationWindowHours={cancelWindowHours}
            mode="teacher"
            onClose={() => {
              setCancelTarget(null)
            }}
            onConfirm={handleConfirmCancel}
          />
        </Box>
      )}
    </Container>
  )
}
