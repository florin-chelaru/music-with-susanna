import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import dayjs from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CancelLessonDialog, {
  CancelLessonOptions
} from '../../Components/scheduling/CancelLessonDialog'
import LessonCalendar from '../../Components/scheduling/LessonCalendar'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import { applyCancellation, LessonInstance, SchedulingRound, Semester } from '../../util/scheduling'
import { formatCountdown } from '../../util/schedulingDates'
import { useNow } from '../../util/useNow'
import {
  MOCK_ENROLLMENTS_FALL,
  MOCK_ENROLLMENTS_SPRING2027,
  MOCK_LESSON_INSTANCES_FALL,
  MOCK_ROUNDS_FALL,
  MOCK_ROUNDS_SPRING2027,
  MOCK_SEMESTER_IDS,
  MOCK_SEMESTERS,
  MOCK_SUBMISSIONS_BY_ROUND,
  MOCK_TEACHER_ID,
  MOCK_TEACHER_NAME,
  MOCK_TEACHER_SUBJECT,
  MOCK_VIEWING_STUDENT_ID
} from '../../data/schedulingMocks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface StudentSchedulePageTexts {
  title: string
  requestsTitle: string
  noRequests: string
  submitAvailability: string
  editSubmission: string
  submitted: string
  pending: string
  deadline: string
  closesIn: string
  deadlinePassed: string
  lessonsTitle: string
  noLessons: string
  withTeacher: string
}

const EN_US: StudentSchedulePageTexts = {
  title: 'My Schedule',
  requestsTitle: 'Availability requests',
  noRequests: 'Nothing to submit right now.',
  submitAvailability: 'Submit availability',
  editSubmission: 'Edit submission',
  submitted: 'Submitted',
  pending: 'Not submitted',
  deadline: 'Deadline',
  closesIn: 'closes in',
  deadlinePassed: 'deadline passed',
  lessonsTitle: 'My lessons',
  noLessons: 'No lessons scheduled yet.',
  withTeacher: 'with'
}

const RO_RO: StudentSchedulePageTexts = {
  title: 'Orarul Meu',
  requestsTitle: 'Cereri de disponibilitate',
  noRequests: 'Nimic de trimis momentan.',
  submitAvailability: 'Trimite disponibilitatea',
  editSubmission: 'Modifică răspunsul',
  submitted: 'Trimis',
  pending: 'Netrimis',
  deadline: 'Termen limită',
  closesIn: 'se închide în',
  deadlinePassed: 'termenul a trecut',
  lessonsTitle: 'Lecțiile mele',
  noLessons: 'Nicio lecție programată încă.',
  withTeacher: 'cu'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Mock lookups ─────────────────────────────────────────────────────────────

interface OpenRequest {
  teacherId: string
  teacherName: string
  semester: Semester
  round: SchedulingRound
  submitted: boolean
}

// A student may study with more than one teacher, so the real version walks
// /students/{uid}/teachers and checks each teacher's semesters. The mocks have one teacher.
function openRequestsFor(studentId: string): OpenRequest[] {
  const bySemester: Array<{ semesterId: string; rounds: SchedulingRound[]; enrolled: boolean }> = [
    {
      semesterId: MOCK_SEMESTER_IDS.fall2026,
      rounds: MOCK_ROUNDS_FALL,
      enrolled: MOCK_ENROLLMENTS_FALL.some((e) => e.studentId === studentId)
    },
    {
      semesterId: MOCK_SEMESTER_IDS.spring2027,
      rounds: MOCK_ROUNDS_SPRING2027,
      enrolled: MOCK_ENROLLMENTS_SPRING2027.some((e) => e.studentId === studentId)
    }
  ]

  const requests: OpenRequest[] = []
  bySemester.forEach(({ semesterId, rounds, enrolled }) => {
    if (!enrolled) return
    const semester = MOCK_SEMESTERS.find((s) => s.id === semesterId)
    if (!semester) return
    rounds
      .filter((round) => round.status === 'collecting')
      .forEach((round) => {
        requests.push({
          teacherId: MOCK_TEACHER_ID,
          teacherName: MOCK_TEACHER_NAME,
          semester,
          round,
          submitted: MOCK_SUBMISSIONS_BY_ROUND[round.id]?.[studentId]?.status === 'submitted'
        })
      })
  })
  return requests
}

function lessonsFor(studentId: string): LessonInstance[] {
  return MOCK_LESSON_INSTANCES_FALL.filter((lesson) => lesson.studentId === studentId)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentSchedulePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(StudentSchedulePage.name, TEXTS), [])
  const t = localeManager.componentStrings(StudentSchedulePage.name) as StudentSchedulePageTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
      return
    }
    if (user.role !== UserRole.STUDENT) {
      navigate('/')
    }
  }, [user.loading, user.uid, user.role])

  // TODO (Step P): read the signed-in student's own requests and lessons from RTDB.
  const studentId = MOCK_VIEWING_STUDENT_ID
  const requests = openRequestsFor(studentId)
  const [lessons, setLessons] = useState<LessonInstance[]>(() => lessonsFor(studentId))
  const [cancelTarget, setCancelTarget] = useState<LessonInstance | null>(null)

  const now = useNow()

  const semesterOfCancelTarget = useMemo(
    () => MOCK_SEMESTERS.find((s) => s.id === MOCK_SEMESTER_IDS.fall2026),
    []
  )

  function handleConfirmCancel({ cancelAllForward }: CancelLessonOptions) {
    const target = cancelTarget
    if (!target) return
    // TODO (Step Q): write the Cancellation record and notify the teacher.
    setLessons((prev) => applyCancellation(prev, target, cancelAllForward))
    setCancelTarget(null)
  }

  // The calendar opens on today while a semester is running, so a student lands on the weeks
  // that still matter rather than on the start of term.
  const calendarDefaultDate = useMemo(() => {
    if (lessons.length === 0) return new Date()
    const today = dayjs()
    const dates = lessons.map((lesson) => lesson.scheduledStart).sort((a, b) => a - b)
    if (today.isBefore(dayjs(dates[0]), 'day')) return new Date(dates[0])
    if (today.isAfter(dayjs(dates[dates.length - 1]), 'day')) {
      return new Date(dates[dates.length - 1])
    }
    return today.toDate()
  }, [lessons])

  return (
    <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />

      <Typography variant="h5" sx={{ mb: 3 }}>
        {t.title}
      </Typography>

      {/* ── Availability requests ──────────────────────────────────────────── */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        {t.requestsTitle}
      </Typography>

      {requests.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t.noRequests}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {requests.map((request) => {
            const passed = request.round.deadline <= now
            return (
              <Box
                key={`${request.semester.id}-${request.round.id}`}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap'
                }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {request.semester.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={request.submitted ? t.submitted : t.pending}
                      color={request.submitted ? 'success' : 'warning'}
                      variant={request.submitted ? 'filled' : 'outlined'}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t.withTeacher} {request.teacherName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.deadline}:{' '}
                    {dayjs(request.round.deadline).locale(dayjsLocale).format('D MMM YYYY, HH:mm')}{' '}
                    <Box
                      component="span"
                      sx={{ color: passed ? 'warning.main' : 'text.secondary' }}>
                      (
                      {passed
                        ? t.deadlinePassed
                        : `${t.closesIn} ${formatCountdown(request.round.deadline - now)}`}
                      )
                    </Box>
                  </Typography>
                </Box>
                <Button
                  variant={request.submitted ? 'text' : 'contained'}
                  size="small"
                  onClick={() => {
                    navigate(
                      `/schedule/rounds/${request.teacherId}/${request.semester.id}/${request.round.id}`
                    )
                  }}>
                  {request.submitted ? t.editSubmission : t.submitAvailability}
                </Button>
              </Box>
            )
          })}
        </Stack>
      )}

      <Divider sx={{ my: 4 }} />

      {/* ── Lessons ────────────────────────────────────────────────────────── */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        {t.lessonsTitle}
      </Typography>

      {lessons.length === 0 ? (
        <Alert severity="info">{t.noLessons}</Alert>
      ) : (
        <>
          {/* No `students` prop — a student should never see another student's name, and their
              own on every event is noise. They see who the lesson is with instead. */}
          <LessonCalendar
            lessons={lessons}
            subject={MOCK_TEACHER_SUBJECT}
            defaultDate={calendarDefaultDate}
            onCancel={(lesson) => {
              setCancelTarget(lesson)
            }}
          />
          <CancelLessonDialog
            key={cancelTarget?.id ?? 'none'}
            open={Boolean(cancelTarget)}
            lesson={cancelTarget}
            cancellationWindowHours={semesterOfCancelTarget?.defaultCancellationWindowHours ?? 24}
            mode="student"
            onClose={() => {
              setCancelTarget(null)
            }}
            onConfirm={handleConfirmCancel}
          />
        </>
      )}
    </Container>
  )
}
