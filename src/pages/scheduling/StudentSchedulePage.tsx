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
  useMyEnrolledSemesters,
  useMyLessons,
  useMySubmittedRounds,
  useMyTeachers
} from '../../util/schedulingHooks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface StudentSchedulePageTexts {
  title: string
  requestsTitle: string
  noRequests: string
  submitAvailability: string
  editSubmission: string
  submitted: string
  pending: string
  beingScheduled: string
  beingScheduledHint: string
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
  beingScheduled: 'Being scheduled',
  beingScheduledHint: 'Your answer is in. Your teacher is working out the timetable.',
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
  beingScheduled: 'Se întocmește orarul',
  beingScheduledHint: 'Răspunsul tău a ajuns. Profesorul pregătește orarul.',
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

/** A lesson as the student's own index stores it: the teacher and semester travel with it. */
type MyLesson = LessonInstance & { teacherId: string; semesterId: string }

interface OpenRequest {
  teacherId: string
  teacherName: string
  semester: Semester
  round: SchedulingRound
  submitted: boolean
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

  const studentId = user.uid
  const { semesters: enrolled, loading: enrolledLoading } = useMyEnrolledSemesters(studentId)
  const { teachers } = useMyTeachers(studentId)
  const { lessons: myLessons } = useMyLessons(studentId)

  // Every round across every enrolled semester, so the next hook can ask whether this student
  // has answered each one.
  const allRounds = useMemo(
    () =>
      enrolled.flatMap(({ teacherId, semester, rounds }) =>
        rounds.map((round) => ({ teacherId, semesterId: semester.id, roundId: round.id }))
      ),
    [enrolled]
  )
  const submittedRounds = useMySubmittedRounds(studentId, allRounds)

  // Mirrored into local state so cancelling still updates the view before Step Q writes it.
  const [lessons, setLessons] = useState<MyLesson[]>([])
  useEffect(() => {
    setLessons(myLessons)
  }, [myLessons])

  // Rounds still collecting, and rounds closed but not yet confirmed.
  //
  // The second kind matters: when the teacher closes a round, it stops collecting and the
  // lessons do not exist yet, so filtering on `collecting` alone made the request vanish with
  // nothing to replace it — from the student's side their submission had simply disappeared.
  const requests: OpenRequest[] = useMemo(
    () =>
      enrolled.flatMap(({ teacherId, semester, rounds }) =>
        rounds
          // An abandoned round is deliberately absent: it is the one state where the teacher has
          // decided this round leads nowhere, and leaving it on screen would go on promising a
          // timetable while a fresh request sits underneath it.
          .filter((round) => round.status === 'collecting' || round.status === 'suggested')
          .map((round) => ({
            teacherId,
            teacherName: teachers[teacherId]?.name ?? teacherId,
            semester,
            round,
            // Whether this student has answered. Their own submission is the only one they can
            // read, which is all this needs.
            submitted: submittedRounds.includes(round.id)
          }))
      ),
    [enrolled, teachers, submittedRounds]
  )

  const [cancelTarget, setCancelTarget] = useState<LessonInstance | null>(null)

  const now = useNow()

  // The cancellation window comes from the semester the lesson belongs to, so a student with
  // two teachers gets each one's policy rather than whichever was found first.
  const semesterOfCancelTarget = useMemo(() => {
    if (!cancelTarget) return undefined
    const match = myLessons.find((lesson) => lesson.id === cancelTarget.id)
    return enrolled.find(({ semester }) => semester.id === match?.semesterId)?.semester
  }, [cancelTarget, myLessons, enrolled])

  // Looked up per lesson from the teacher it belongs to. The student's index carries the
  // teacherId precisely so a calendar holding two teachers' lessons can label each correctly.
  const subjectFor = (lesson: LessonInstance): string | undefined =>
    teachers[(lesson as MyLesson).teacherId]?.subject

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
            // Closed to answers, but the schedule is not out yet — the state that previously
            // showed the student nothing at all.
            const closed = request.round.status === 'suggested'
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
                      label={
                        closed ? t.beingScheduled : request.submitted ? t.submitted : t.pending
                      }
                      color={closed ? 'default' : request.submitted ? 'success' : 'warning'}
                      variant={closed || request.submitted ? 'filled' : 'outlined'}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t.withTeacher} {request.teacherName}
                  </Typography>
                  {closed && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t.beingScheduledHint}
                    </Typography>
                  )}
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
                {/* Nothing to do once the round is closed: the rules refuse a write, so an
                    enabled button would only lead to a failure. */}
                {!closed && (
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
                )}
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
            subjectFor={subjectFor}
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
