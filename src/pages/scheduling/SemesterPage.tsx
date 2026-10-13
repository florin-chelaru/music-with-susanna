import {
  Box,
  Button,
  Chip,
  Container,
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
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import dayjs from 'dayjs'
import 'dayjs/locale/ro'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AvailabilityCalendar from '../../Components/scheduling/AvailabilityCalendar'
import WeekOverridesSection from '../../Components/scheduling/WeekOverridesSection'
import CancelLessonDialog, {
  CancelLessonOptions
} from '../../Components/scheduling/CancelLessonDialog'
import ConflictsPanel from '../../Components/scheduling/ConflictsPanel'
import EnrollmentDialog from '../../Components/scheduling/EnrollmentDialog'
import LessonCalendar from '../../Components/scheduling/LessonCalendar'
import NewRoundDialog from '../../Components/scheduling/NewRoundDialog'
import SchedulingNav from '../../Components/scheduling/SchedulingNav'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import {
  applyCancellation,
  AvailabilityBlock,
  LessonInstance,
  RoundStatus,
  SchedulingRound,
  SemesterStatus,
  StudentEnrollment,
  WeeklyAvailability
} from '../../util/scheduling'
import { findScheduleConflicts, ScheduleConflict } from '../../util/schedulingConflicts'
import { eachWeekStartInRange, formatDate, parseDate } from '../../util/schedulingDates'
import {
  MOCK_ENROLLMENTS_FALL,
  MOCK_ENROLLMENTS_SPRING,
  MOCK_ENROLLMENTS_SPRING2027,
  MOCK_LESSON_INSTANCES_FALL,
  MOCK_LESSON_INSTANCES_SPRING,
  MOCK_ROUNDS_FALL,
  MOCK_ROUNDS_SPRING,
  MOCK_ROUNDS_SPRING2027,
  MOCK_SUBMISSIONS_BY_ROUND,
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
  removeStudent: string
  round: string
  newRound: string
  noRounds: string
  open: string
  deadline: string
  submittedOf: string
  roundAlreadyOpen: string
  roundStatusCollecting: string
  roundStatusReady: string
  roundStatusSuggested: string
  roundStatusFinalized: string
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
  defaultWindow: 'Default',
  removeStudent: 'Remove',
  round: 'Round',
  newRound: 'New Round',
  noRounds: 'No scheduling rounds yet.',
  open: 'Open',
  deadline: 'Deadline',
  submittedOf: '{done} of {total} submitted',
  roundAlreadyOpen: 'A round is already collecting availability. Close it before opening another.',
  roundStatusCollecting: 'Collecting',
  roundStatusReady: 'Ready',
  roundStatusSuggested: 'Suggested',
  roundStatusFinalized: 'Finalized'
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
  defaultWindow: 'Implicit',
  removeStudent: 'Elimină',
  round: 'Runda',
  newRound: 'Rundă nouă',
  noRounds: 'Nicio rundă de planificare încă.',
  open: 'Deschide',
  deadline: 'Termen limită',
  submittedOf: '{done} din {total} au trimis',
  roundAlreadyOpen:
    'O rundă colectează deja disponibilitate. Închide-o înainte de a deschide alta.',
  roundStatusCollecting: 'În colectare',
  roundStatusReady: 'Pregătită',
  roundStatusSuggested: 'Cu sugestii',
  roundStatusFinalized: 'Finalizată'
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

function roundStatusLabel(status: RoundStatus, t: SemesterPageTexts): string {
  switch (status) {
    case 'collecting':
      return t.roundStatusCollecting
    case 'ready':
      return t.roundStatusReady
    case 'suggested':
      return t.roundStatusSuggested
    case 'finalized':
      return t.roundStatusFinalized
  }
}

function formatDeadline(ms: number, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === SupportedLocale.RO_RO ? 'ro-RO' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ms))
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

// Tab order, and the values accepted in the ?tab= query parameter.
const TAB_KEYS = ['availability', 'students', 'scheduling', 'calendar']

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SemesterPage() {
  const { semesterId } = useParams<{ semesterId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  // Two separate useMediaQuery calls, never OR'd inline — hooks must not short-circuit.
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobile = isTouch || isSmallScreen
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
  // How many weeks a new enrollment has to fill. The enrollment dialog defaults to one lesson
  // a week from this, and draws its spread preview against it.
  const semesterWeeks = semester
    ? eachWeekStartInRange(semester.startDate, semester.endDate).length
    : 0
  const location = semester ? MOCK_LOCATIONS.find((l) => l.id === semester.locationId) : null

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  //
  // The tab lives in the URL rather than component state so that links can point at a
  // specific tab — the round page's breadcrumb returns to the Scheduling tab, not to
  // whichever tab happened to be open first. It also survives a reload and makes the
  // browser's back button step between tabs sensibly.

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = Math.max(0, TAB_KEYS.indexOf(searchParams.get('tab') ?? ''))

  function handleTabChange(value: number) {
    // Copy the existing params rather than replacing them — the app carries the locale in
    // ?hl=, and handing setSearchParams a fresh object would drop it.
    const next = new URLSearchParams(searchParams)
    next.set('tab', TAB_KEYS[value])
    // `replace` so flipping through tabs does not fill the history stack.
    setSearchParams(next, { replace: true })
  }

  // ── Availability state ───────────────────────────────────────────────────────

  const [availability, setAvailability] = useState<WeeklyAvailability>(MOCK_TEACHER_AVAILABILITY)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // The week a conflict row pointed at, and the weekly template it points at instead when the
  // problem recurs. Both exist so the panel can send the teacher to the thing that fixes it.
  const [focusWeek, setFocusWeek] = useState<string | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)
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
    if (semesterId === MOCK_SEMESTER_IDS.spring2027) return [...MOCK_ENROLLMENTS_SPRING2027]
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

  // ── Scheduling round state ───────────────────────────────────────────────────

  const [rounds, setRounds] = useState<SchedulingRound[]>(() => {
    if (semesterId === MOCK_SEMESTER_IDS.spring2026) return [...MOCK_ROUNDS_SPRING]
    if (semesterId === MOCK_SEMESTER_IDS.fall2026) return [...MOCK_ROUNDS_FALL]
    if (semesterId === MOCK_SEMESTER_IDS.spring2027) return [...MOCK_ROUNDS_SPRING2027]
    return []
  })
  const [newRoundOpen, setNewRoundOpen] = useState(false)

  // Only one round may collect at a time, otherwise students would have two open
  // requests for the same semester and no way to tell which one counts.
  const hasOpenRound = rounds.some((r) => r.status === 'collecting')

  function handleCreateRound(deadline: number) {
    // TODO (Step N): push the round to RTDB and notify every enrolled student.
    setRounds((prev) => [
      ...prev,
      {
        id: `round-local-${Date.now()}`,
        roundNumber: prev.reduce((max, r) => Math.max(max, r.roundNumber), 0) + 1,
        status: 'collecting',
        deadline,
        createdAt: Date.now()
      }
    ])
    setNewRoundOpen(false)
  }

  function handleConfirmCancel({ cancelAllForward }: CancelLessonOptions) {
    const target = cancelTarget
    if (!target) return
    // TODO (Step Q): write the Cancellation record, update RTDB, notify the other party.
    // `reason` and `offerMakeup` are collected already but have nowhere to go until then.
    setLessons((prev) => applyCancellation(prev, target, cancelAllForward))
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

  // A new override starts from the weekly template, so the teacher edits from what they
  // normally do rather than from an empty week.
  // Where the teacher's own availability disagrees with the schedule already in the calendar.
  //
  // No student submissions are passed: this tab is about the teacher's hours, the round that
  // collected the students' preferences is over, and a student's availability is not something
  // the teacher can edit here anyway.
  const availabilityConflicts = useMemo(() => {
    const scheduled = lessons
      .filter((lesson) => lesson.status === 'scheduled')
      .map((lesson) => ({
        studentId: lesson.studentId,
        date: formatDate(new Date(lesson.scheduledStart)),
        startTime: dayjs(lesson.scheduledStart).format('HH:mm'),
        endTime: dayjs(lesson.scheduledEnd).format('HH:mm')
      }))
    return findScheduleConflicts(scheduled, availability, {})
  }, [lessons, availability])

  // A conflict confined to one week is mended with an override for that week, so the row makes
  // one if it does not exist and then points at it. Anything recurring is the weekly template's
  // doing, and no per-week fix would hold.
  function handleConflictSelect(conflict: ScheduleConflict) {
    if (conflict.kind === 'teacher_week') {
      handleAddOverride(conflict.weekStart)
      setFocusWeek(conflict.weekStart)
      return
    }
    setFocusWeek(null)
    templateRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    })
  }

  function handleAddOverride(weekStart: string) {
    if (weekStart in availability.weekOverrides) return
    handleOverrideChange(weekStart, [...availability.weeklyTemplate.blocks])
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
      <SchedulingNav items={[{ label: semester.name }]} />

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
            handleTabChange(v as number)
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
          <ConflictsPanel
            conflicts={availabilityConflicts}
            students={MOCK_STUDENTS}
            onSelect={handleConflictSelect}
          />

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
          <Box ref={templateRef} sx={{ scrollMarginTop: 16 }}>
            <AvailabilityCalendar
              blocks={availability.weeklyTemplate.blocks}
              onChange={handleTemplateChange}
            />
          </Box>

          <WeekOverridesSection
            overrides={availability.weekOverrides}
            semesterStart={semester.startDate}
            semesterEnd={semester.endDate}
            focusWeek={focusWeek}
            onAdd={handleAddOverride}
            onChange={handleOverrideChange}
            onRemove={handleRemoveOverride}
          />
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
          ) : isMobile ? (
            // A five-column table does not fit a phone: the delete button ended up off-screen
            // behind a horizontal scroll. One card per student keeps every control reachable.
            <Stack spacing={1.5}>
              {enrollments.map((enrollment) => {
                const student = MOCK_STUDENTS[enrollment.studentId]
                return (
                  <Box
                    key={enrollment.studentId}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1
                    }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {student?.name ?? enrollment.studentId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {enrollment.lessonDurationMinutes} min · {enrollment.totalLessons}{' '}
                        {t.colTotalLessons.toLowerCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t.colCancellationWindow}:{' '}
                        {enrollment.cancellationWindowHours !== undefined
                          ? `${enrollment.cancellationWindowHours} h`
                          : `${t.defaultWindow} (${semester.defaultCancellationWindowHours} h)`}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      aria-label={`${t.removeStudent} ${student?.name ?? enrollment.studentId}`}
                      onClick={() => {
                        handleRemoveStudent(enrollment.studentId)
                      }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )
              })}
            </Stack>
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
                          aria-label={`${t.removeStudent} ${student?.name ?? enrollment.studentId}`}
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
            weeks={semesterWeeks}
            defaultCancellationWindowHours={semester.defaultCancellationWindowHours}
            onClose={() => {
              setEnrollDialogOpen(false)
            }}
            onSave={handleAddStudent}
          />
        </Box>
      )}

      {/* ── Scheduling tab ─────────────────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.tabScheduling}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={hasOpenRound}
              title={hasOpenRound ? t.roundAlreadyOpen : undefined}
              onClick={() => {
                setNewRoundOpen(true)
              }}>
              {t.newRound}
            </Button>
          </Stack>

          {hasOpenRound && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t.roundAlreadyOpen}
            </Typography>
          )}

          {rounds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t.noRounds}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {[...rounds]
                .sort((a, b) => b.roundNumber - a.roundNumber)
                .map((round) => {
                  const submissions = MOCK_SUBMISSIONS_BY_ROUND[round.id] ?? {}
                  const done = enrollments.filter(
                    (e) => submissions[e.studentId]?.status === 'submitted'
                  ).length
                  return (
                    <Box
                      key={round.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5
                      }}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {t.round} {round.roundNumber}
                          </Typography>
                          <Chip
                            size="small"
                            label={roundStatusLabel(round.status, t)}
                            color={round.status === 'collecting' ? 'primary' : 'default'}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {t.deadline}:{' '}
                          {formatDeadline(round.deadline, localeManager.locale as SupportedLocale)}
                          {round.status === 'collecting' &&
                            ` · ${t.submittedOf
                              .replace('{done}', String(done))
                              .replace('{total}', String(enrollments.length))}`}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => {
                          navigate(`/scheduling/semesters/${semester.id}/rounds/${round.id}`)
                        }}>
                        {t.open}
                      </Button>
                    </Box>
                  )
                })}
            </Stack>
          )}

          <NewRoundDialog
            key={newRoundOpen ? 'open' : 'closed'}
            open={newRoundOpen}
            onClose={() => {
              setNewRoundOpen(false)
            }}
            onSave={handleCreateRound}
          />
        </Box>
      )}

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
