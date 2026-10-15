import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  DialogContent,
  IconButton,
  Link,
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
import CancellationsPanel from '../../Components/scheduling/CancellationsPanel'
import ConflictsPanel from '../../Components/scheduling/ConflictsPanel'
import MultiActionDialog from '../../Components/MultiActionDialog'
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
  Cancellation,
  cancellationWindowFor,
  dayWindow,
  isWithinCancellationWindow,
  EMPTY_AVAILABILITY,
  LessonInstance,
  RoundStatus,
  SchedulingRound,
  SemesterStatus,
  StudentEnrollment,
  WeeklyAvailability
} from '../../util/scheduling'
import { findScheduleConflicts, ScheduleConflict } from '../../util/schedulingConflicts'
import { notifyLessonCanceled, notifyRoundOpened } from '../../util/notifications'
import {
  useCancellations,
  useLessonInstances,
  useLocations,
  useSchedulingRounds,
  useStudentEnrollments,
  useAllRoundSubmissions,
  useTeacherStudents,
  useTeacherAvailability,
  useSemester
} from '../../util/schedulingHooks'
import {
  acknowledgeCancellation,
  cancelLessons,
  countRoundSubmissions,
  createRound,
  deleteRound,
  reviveRound,
  removeEnrollment,
  saveEnrollment,
  saveTeacherAvailability
} from '../../util/schedulingWrites'
import {
  eachWeekStartInRange,
  formatDate,
  formatDateTime,
  parseDate
} from '../../util/schedulingDates'

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
  saveFailed: string
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
  deleteRound: string
  reviveRound: string
  deleteRoundTitle: string
  deleteRoundBody: (round: number) => string
  deleteRoundSubmissions: (count: number) => string
  deleteRoundWarning: string
  keepRound: string
  deadline: string
  submittedOf: (done: number, total: number) => string
  roundAlreadyOpen: string
  roundStatusCollecting: string
  roundStatusReady: string
  roundStatusSuggested: string
  roundStatusAbandoned: string
  abandonRound: string
  abandonRoundTitle: string
  abandonRoundKeepsAnswers: string
  keepGoing: string
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
  saveFailed: 'Not saved — your changes are still here, and the next edit will try again.',
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
  deleteRound: 'Delete round',
  reviveRound: 'Revive',
  deleteRoundTitle: 'Delete this round?',
  deleteRoundBody: (round) => `Round ${round} and everything collected in it will be removed.`,
  deleteRoundSubmissions: (count) => `${count} students have already answered.`,
  deleteRoundWarning: 'Their answers go with it. A round that produced lessons cannot be deleted.',
  keepRound: 'Keep round',
  deadline: 'Deadline',
  submittedOf: (done, total) => `${done} of ${total} submitted`,
  roundAlreadyOpen: 'A round is already collecting availability. Close it before opening another.',
  roundStatusCollecting: 'Collecting',
  roundStatusReady: 'Ready',
  roundStatusSuggested: 'Suggested',
  roundStatusAbandoned: 'Abandoned',
  abandonRound: 'Abandon round',
  abandonRoundTitle: 'Abandon this round?',
  abandonRoundKeepsAnswers:
    'Their answers are kept, so the next round can start from them instead of asking again.',
  keepGoing: 'Keep going',
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
  saveFailed:
    'Nu s-a salvat — modificările tale sunt încă aici și se reîncearcă la următoarea editare.',
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
  deleteRound: 'Șterge runda',
  reviveRound: 'Reia',
  deleteRoundTitle: 'Ștergi această rundă?',
  deleteRoundBody: (round) => `Runda ${round} și tot ce s-a colectat în ea vor fi eliminate.`,
  deleteRoundSubmissions: (count) => `${count} elevi au răspuns deja.`,
  deleteRoundWarning:
    'Răspunsurile lor dispar odată cu ea. O rundă care a produs lecții nu poate fi ștearsă.',
  keepRound: 'Păstrează runda',
  deadline: 'Termen limită',
  submittedOf: (done, total) => `${done} din ${total} au trimis`,
  roundAlreadyOpen:
    'O rundă colectează deja disponibilitate. Închide-o înainte de a deschide alta.',
  roundStatusCollecting: 'În colectare',
  roundStatusReady: 'Pregătită',
  roundStatusSuggested: 'Cu sugestii',
  roundStatusAbandoned: 'Abandonată',
  abandonRound: 'Abandonează runda',
  abandonRoundTitle: 'Abandonezi această rundă?',
  abandonRoundKeepsAnswers:
    'Răspunsurile lor se păstrează, ca runda următoare să pornească de la ele.',
  keepGoing: 'Continuă runda',
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
    case 'abandoned':
      return t.roundStatusAbandoned
    case 'finalized':
      return t.roundStatusFinalized
  }
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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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

  // ── Semester ─────────────────────────────────────────────────────────────────
  //
  const { semester } = useSemester(user.uid, semesterId)
  // How many weeks a new enrollment has to fill. The enrollment dialog defaults to one lesson
  // a week from this, and draws its spread preview against it.
  const semesterWeeks = semester
    ? eachWeekStartInRange(semester.startDate, semester.endDate).length
    : 0
  const { locations } = useLocations(user.uid)
  // How much of the day every grid on this page draws. A teacher who only works afternoons
  // should not be looking at eight empty morning rows.
  const { startHour: dayStartHour, endHour: dayEndHour } = dayWindow(semester ?? null)
  // The teacher's own students, for every place this page names one.
  const { students } = useTeacherStudents(user.uid)
  const location = semester ? locations.find((l) => l.id === semester.locationId) ?? null : null

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

  // Edited locally and pushed on a debounce, rather than driven straight from the subscription:
  // the calendar is a continuous drag-and-draw surface, and a remote echo arriving mid-gesture
  // would fight the teacher's hand.
  const { availability: remoteAvailability } = useTeacherAvailability(user.uid, semesterId)
  const [availability, setAvailability] = useState<WeeklyAvailability>(EMPTY_AVAILABILITY)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // True from the first edit until its write lands. Without it the echo of our own save, or a
  // slow first read, would overwrite what the teacher has just drawn.
  const dirty = useRef(false)

  useEffect(() => {
    if (dirty.current || !remoteAvailability) return
    setAvailability(remoteAvailability)
  }, [remoteAvailability])
  // The week a conflict row pointed at, and the weekly template it points at instead when the
  // problem recurs. Both exist so the panel can send the teacher to the thing that fixes it.
  const [focusWeek, setFocusWeek] = useState<string | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function triggerAutoSave(next: WeeklyAvailability) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    dirty.current = true
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      if (!user.uid || !semesterId) {
        setSaveStatus('saved')
        dirty.current = false
        return
      }
      void saveTeacherAvailability(user.uid, semesterId, next)
        .then(() => {
          setSaveStatus('saved')
          dirty.current = false
        })
        .catch(() => {
          // Left dirty on purpose: the local copy is the only one that has the teacher's work,
          // so the next edit must still win over whatever the subscription is holding.
          setSaveStatus('error')
        })
    }, 1000)
  }

  function handleTemplateChange(newBlocks: AvailabilityBlock[]) {
    const next = { ...availability, weeklyTemplate: { blocks: newBlocks } }
    setAvailability(next)
    triggerAutoSave(next)
  }

  function handleOverrideChange(weekStart: string, newBlocks: AvailabilityBlock[]) {
    const next = {
      ...availability,
      weekOverrides: { ...availability.weekOverrides, [weekStart]: { blocks: newBlocks } }
    }
    setAvailability(next)
    triggerAutoSave(next)
  }

  function handleRemoveOverride(weekStart: string) {
    const { [weekStart]: _removed, ...rest } = availability.weekOverrides
    const next = { ...availability, weekOverrides: rest }
    setAvailability(next)
    triggerAutoSave(next)
  }

  // ── Enrollment state ─────────────────────────────────────────────────────────

  const { enrollments: remoteEnrollments } = useStudentEnrollments(user.uid, semesterId)
  const enrollments: StudentEnrollment[] = remoteEnrollments
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)

  // ── Lesson state ─────────────────────────────────────────────────────────────

  const { lessons: remoteLessons } = useLessonInstances(user.uid, semesterId)

  // Mirrored into local state so cancelling still updates the view before Step Q writes it.
  const [lessons, setLessons] = useState<LessonInstance[]>([])
  useEffect(() => {
    setLessons(remoteLessons)
  }, [remoteLessons])
  const [cancelTarget, setCancelTarget] = useState<LessonInstance | null>(null)
  const { cancellations } = useCancellations(user.uid, semesterId)

  function handleAcknowledge(cancellation: Cancellation, charged: boolean) {
    if (!user.uid || !semesterId) return
    void acknowledgeCancellation(user.uid, semesterId, cancellation, charged).catch(() => {
      setSaveStatus('error')
    })
  }

  // ── Scheduling round state ───────────────────────────────────────────────────

  const { rounds: remoteRounds } = useSchedulingRounds(user.uid, semesterId)
  const rounds: SchedulingRound[] = remoteRounds
  const { submissionsByRound } = useAllRoundSubmissions(user.uid, semesterId)
  const [newRoundOpen, setNewRoundOpen] = useState(false)
  const [deleteRoundTarget, setDeleteRoundTarget] = useState<SchedulingRound | null>(null)
  // Read when the dialog opens: the teacher should be told how many answers they are discarding
  // before they do it, not after.
  const [roundAnswers, setRoundAnswers] = useState<number | null>(null)

  useEffect(() => {
    if (!deleteRoundTarget || !user.uid || !semesterId) return
    setRoundAnswers(null)
    let cancelled = false
    void countRoundSubmissions(user.uid, semesterId, deleteRoundTarget.id).then((count) => {
      if (!cancelled) setRoundAnswers(count)
    })
    return () => {
      cancelled = true
    }
  }, [deleteRoundTarget, user.uid, semesterId])

  // Reviving is only on the table while nothing else is in the way: another round collecting
  // would leave students with two open requests, and a confirmed schedule would mean confirming
  // this one adds a second term's lessons rather than replacing the first.
  const canReviveAny =
    !rounds.some((round) => round.status === 'collecting') &&
    !rounds.some((round) => round.status === 'finalized')

  function handleReviveRound(round: SchedulingRound) {
    if (!user.uid || !semesterId) return
    void reviveRound(user.uid, semesterId, round.id, round.abandonedFrom ?? 'suggested').catch(
      () => {
        setSaveStatus('error')
      }
    )
  }

  function handleDeleteRound() {
    const target = deleteRoundTarget
    setDeleteRoundTarget(null)
    if (!target || !user.uid || !semesterId) return
    void deleteRound(user.uid, semesterId, target.id).catch(() => {
      setSaveStatus('error')
    })
  }

  // Only one round may collect at a time, otherwise students would have two open
  // requests for the same semester and no way to tell which one counts.
  const hasOpenRound = rounds.some((r) => r.status === 'collecting')

  function handleCreateRound(deadline: number) {
    setNewRoundOpen(false)
    if (!user.uid || !semesterId) return
    // Numbered from what is on screen rather than from a fresh read: the teacher is looking at
    // the list, and counting at write time would need a read that could race another tab.
    const roundNumber = rounds.reduce((max, round) => Math.max(max, round.roundNumber), 0) + 1
    // The latest previous round is what the new one starts from, so students amend rather than
    // redraw a term. Its own status does not matter — abandoned or closed, the answers stand.
    const previous = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0]
    const teacherName = user.name ?? ''
    const semesterName = semester?.name ?? ''
    void createRound(user.uid, semesterId, roundNumber, deadline, previous?.id)
      .then(() => {
        // Only once the round exists. A student told to submit against a round that failed to
        // open would find nothing to submit to.
        notifyRoundOpened(
          enrollments.map((enrollment) => enrollment.studentId),
          teacherName,
          semesterName,
          deadline
        )
      })
      .catch(() => {
        setSaveStatus('error')
      })
  }

  function handleConfirmCancel({ cancelAllForward, offerMakeup, reason }: CancelLessonOptions) {
    const target = cancelTarget
    setCancelTarget(null)
    if (!target) return
    // Shown immediately; the subscription confirms it a moment later.
    setLessons((prev) => applyCancellation(prev, target, cancelAllForward))
    if (!user.uid || !semesterId) return

    // The same set the view just marked, so what is written matches what the teacher saw.
    const affected = applyCancellation(lessons, target, cancelAllForward).filter(
      (lesson, index) => lesson.status === 'canceled' && lessons[index]?.status !== 'canceled'
    )
    // Through the same helper the dialog used, so a student on their own window is judged
    // against that window rather than the semester's.
    const withinWindow = isWithinCancellationWindow(
      target.scheduledStart,
      cancellationWindowFor(
        semester,
        enrollments.find((e) => e.studentId === target.studentId)
      )
    )
    const note = reason.trim() || undefined
    const teacherName = user.name ?? ''
    void cancelLessons(
      user.uid,
      semesterId,
      affected.map((lesson) => ({ id: lesson.id, studentId: lesson.studentId })),
      {
        canceledBy: user.uid,
        otherParty: target.studentId,
        withinWindow,
        makeupOffered: offerMakeup,
        reason: note
      }
    )
      .then(() => {
        notifyLessonCanceled(
          target.studentId,
          {
            lessonId: target.id,
            start: target.scheduledStart,
            end: target.scheduledEnd,
            alsoAfter: affected.length - 1,
            reason: note,
            calendarSequence: target.calendarSequence ?? 0
          },
          {
            teacherName,
            studentName: students[target.studentId]?.name ?? '',
            canceledByTeacher: true
          },
          // Titled with the teacher, which is what the lesson is called in the student's own
          // calendar.
          { subject: teacherName, makeupOffered: offerMakeup, withinWindow }
        )
      })
      .catch(() => {
        setSaveStatus('error')
      })
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

  const cancelWindowHours = useMemo(
    () =>
      cancellationWindowFor(
        semester,
        cancelTarget ? enrollments.find((e) => e.studentId === cancelTarget.studentId) : undefined
      ),
    [cancelTarget, enrollments, semester]
  )

  function handleAddStudent(enrollment: StudentEnrollment) {
    setEnrollDialogOpen(false)
    if (!user.uid || !semesterId) return
    void saveEnrollment(user.uid, semesterId, enrollment).catch(() => {
      setSaveStatus('error')
    })
  }

  function handleRemoveStudent(studentId: string) {
    if (!user.uid || !semesterId) return
    void removeEnrollment(user.uid, semesterId, studentId).catch(() => {
      setSaveStatus('error')
    })
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
            students={students}
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
            {saveStatus === 'error' && (
              <Typography variant="caption" color="error.main">
                {t.saveFailed}
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
              displayStartHour={dayStartHour}
              displayEndHour={dayEndHour}
            />
          </Box>

          <WeekOverridesSection
            overrides={availability.weekOverrides}
            semesterStart={semester.startDate}
            semesterEnd={semester.endDate}
            displayStartHour={dayStartHour}
            displayEndHour={dayEndHour}
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
                const student = students[enrollment.studentId]
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
                  const student = students[enrollment.studentId]
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
            students={students}
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
                  const submissions = submissionsByRound[round.id] ?? {}
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
                          {/* The whole row is about this round, so its name is the way in —
                              a separate Open button repeated that in every row. */}
                          <Link
                            component="button"
                            variant="subtitle1"
                            underline="hover"
                            fontWeight={600}
                            textAlign="left"
                            onClick={() => {
                              navigate(`/scheduling/semesters/${semester.id}/rounds/${round.id}`)
                            }}>
                            {t.round} {round.roundNumber}
                          </Link>
                          <Chip
                            size="small"
                            label={roundStatusLabel(round.status, t)}
                            color={round.status === 'collecting' ? 'primary' : 'default'}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {t.deadline}:{' '}
                          {formatDateTime(round.deadline, localeManager.locale as SupportedLocale)}
                          {round.status === 'collecting' &&
                            ` · ${t.submittedOf(done, enrollments.length)}`}
                        </Typography>
                      </Box>
                      {round.status === 'abandoned' && canReviveAny && (
                        <Button
                          size="small"
                          onClick={() => {
                            handleReviveRound(round)
                          }}>
                          {t.reviveRound}
                        </Button>
                      )}
                      {/* A finalized round produced the lessons being taught; deleting it would
                          leave them with no account of where they came from. */}
                      {round.status !== 'finalized' && (
                        <IconButton
                          size="small"
                          aria-label={`${t.deleteRound} ${round.roundNumber}`}
                          onClick={() => {
                            setDeleteRoundTarget(round)
                          }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )
                })}
            </Stack>
          )}

          <MultiActionDialog
            open={deleteRoundTarget !== null}
            onClose={() => {
              setDeleteRoundTarget(null)
            }}
            title={t.deleteRoundTitle}
            fullWidth
            maxWidth="xs"
            actions={[
              {
                label: t.keepRound,
                onClick: () => {
                  setDeleteRoundTarget(null)
                }
              },
              { label: t.deleteRound, disabled: roundAnswers === null, onClick: handleDeleteRound }
            ]}>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {deleteRoundTarget && t.deleteRoundBody(deleteRoundTarget.roundNumber)}
              </Typography>
              {roundAnswers !== null && roundAnswers > 0 && (
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  {t.deleteRoundSubmissions(roundAnswers)}
                </Typography>
              )}
              <Alert severity="warning">{t.deleteRoundWarning}</Alert>
            </DialogContent>
          </MultiActionDialog>

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
          {/* Above the calendar rather than inside it: a cancellation needs a decision, and the
              teacher should meet it on the way to the lessons rather than by finding a greyed
              event. */}
          <CancellationsPanel
            cancellations={cancellations}
            lessons={lessons}
            titleFor={(cancellation) =>
              students[cancellation.studentId]?.name ?? cancellation.studentId
            }
            viewerId={user.uid ?? ''}
            onAcknowledge={handleAcknowledge}
          />
          <LessonCalendar
            lessons={lessons}
            students={students}
            locationName={location?.name}
            calendarName={semester.name}
            defaultDate={calendarDefaultDate}
            onCancel={(lesson) => {
              setCancelTarget(lesson)
            }}
          />
          <CancelLessonDialog
            key={cancelTarget?.id ?? 'none'}
            open={Boolean(cancelTarget)}
            lesson={cancelTarget}
            studentName={cancelTarget ? students[cancelTarget.studentId]?.name : undefined}
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
