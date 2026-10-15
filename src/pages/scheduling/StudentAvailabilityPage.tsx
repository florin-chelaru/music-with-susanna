import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import dayjs from 'dayjs'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AvailabilityCalendar from '../../Components/scheduling/AvailabilityCalendar'
import SchedulingNav from '../../Components/scheduling/SchedulingNav'
import WeekOverridesSection from '../../Components/scheduling/WeekOverridesSection'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale, toDayjsLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import {
  AvailabilityBlock,
  AvailabilityLabel,
  dayWindow,
  LABEL_SCORES,
  SCHEDULING_CONFIG,
  scoreForDayTime
} from '../../util/scheduling'
import { formatCountdown, formatMinutes, parseDate, parseMinutes } from '../../util/schedulingDates'
import { useNow } from '../../util/useNow'
import {
  useMySubmission,
  useSchedulingRounds,
  useSemester,
  useRoundCapacity,
  useTeacherAvailability
} from '../../util/schedulingHooks'
import { saveSubmission } from '../../util/schedulingWrites'
import { notifySubmissionReceived } from '../../util/notifications'
import { loginPath } from '../../util/authRedirect'
// ─── Texts ────────────────────────────────────────────────────────────────────

interface StudentAvailabilityPageTexts {
  title: string
  intro: string
  deadline: string
  closesIn: string
  deadlinePassed: string
  closedTitle: string
  closed: string
  weeklyTitle: string
  needMore: (min: number) => string
  needPreferred: string
  ready: string
  warningTitle: string
  warningBody: (list: string) => string
  submit: string
  resubmit: string
  submittedTitle: string
  submittedBody: string
  saveFailed: string
  notFound: string
}

const EN_US: StudentAvailabilityPageTexts = {
  title: 'Your availability',
  intro:
    'Draw the times you could take a lesson and mark how much each suits you. Your teacher’s own availability is shown faded behind yours.',
  deadline: 'Deadline',
  closesIn: 'closes in',
  deadlinePassed: 'deadline passed',
  closedTitle: 'This round is closed',
  closed: 'Availability is no longer being collected for this semester.',
  weeklyTitle: 'Your usual week',
  needMore: (min) => `Choose at least ${min} time ranges in total.`,
  needPreferred: 'Mark at least one time as Preferred.',
  ready: 'Ready to submit.',
  warningTitle: 'Some choices are unlikely to work',
  warningBody: (list) =>
    `Your teacher is not free, or only reluctantly free, at: ${list}. Marking times they prefer makes it much more likely you get one.`,
  submit: 'Submit availability',
  resubmit: 'Update submission',
  submittedTitle: 'Thank you',
  submittedBody: 'Your availability has been sent. You can change it until the deadline passes.',
  saveFailed:
    'Your availability did not go through. Please try again, or tell your teacher directly.',
  notFound: 'Request not found.'
}

const RO_RO: StudentAvailabilityPageTexts = {
  title: 'Disponibilitatea ta',
  intro:
    'Marchează orele la care ai putea veni la lecție și cât de bine îți convine fiecare. Disponibilitatea profesorului apare estompată în fundal.',
  deadline: 'Termen limită',
  closesIn: 'se închide în',
  deadlinePassed: 'termenul a trecut',
  closedTitle: 'Runda este închisă',
  closed: 'Nu se mai colectează disponibilitate pentru acest semestru.',
  weeklyTitle: 'Săptămâna ta obișnuită',
  needMore: (min) => `Alege cel puțin ${min} intervale în total.`,
  needPreferred: 'Marchează cel puțin un interval ca Preferat.',
  ready: 'Poți trimite.',
  warningTitle: 'Unele alegeri sunt puțin probabile',
  warningBody: (list) =>
    `În următoarele intervale selectate, profesorul are disponibilitate limitată: ${list}. Șansele de a programa o lecție sunt mai mari în intervalele pe care profesorul le-a marcat drept „Disponibil” sau „Preferat”.`,
  submit: 'Trimite disponibilitatea',
  resubmit: 'Actualizează răspunsul',
  submittedTitle: 'Mulțumim',
  submittedBody: 'Disponibilitatea a fost trimisă. O poți modifica până la termenul limită.',
  saveFailed: 'Disponibilitatea nu a ajuns. Încearcă din nou sau anunță-ți direct profesorul.',
  notFound: 'Cererea nu a fost găsită.'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 2024-01-01 is a Monday, so adding our 0=Mon dayOfWeek lands on the right weekday name.
const WEEKDAY_REFERENCE = '2024-01-01'

function weekdayName(dayOfWeek: number, dayjsLocale: string): string {
  return parseDate(WEEKDAY_REFERENCE).add(dayOfWeek, 'day').locale(dayjsLocale).format('ddd')
}

/**
 * The teacher's lowest score anywhere inside a block the student drew.
 *
 * Sampled rather than computed from overlaps because a student block can span several of the
 * teacher's, and the worst point is what matters: a block that is half preferred and half
 * outside the teacher's hours is still half unusable. 0 means part of it falls outside
 * entirely.
 */
function lowestTeacherScore(teacherBlocks: AvailabilityBlock[], block: AvailabilityBlock): number {
  const end = parseMinutes(block.endTime)
  let lowest = Number.POSITIVE_INFINITY
  for (
    let minute = parseMinutes(block.startTime);
    minute < end;
    minute += SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
  ) {
    lowest = Math.min(
      lowest,
      scoreForDayTime(teacherBlocks, block.dayOfWeek, formatMinutes(minute))
    )
  }
  return Number.isFinite(lowest) ? lowest : 0
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentAvailabilityPage() {
  const { teacherId, semesterId, roundId } = useParams<{
    teacherId: string
    semesterId: string
    roundId: string
  }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(StudentAvailabilityPage.name, TEXTS), [])
  const t = localeManager.componentStrings(
    StudentAvailabilityPage.name
  ) as StudentAvailabilityPageTexts
  const dayjsLocale = toDayjsLocale(localeManager.locale)
  const now = useNow()

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate(loginPath())
      return
    }
    if (user.role !== UserRole.STUDENT) {
      navigate('/')
    }
  }, [user.loading, user.uid, user.role])

  const { semester } = useSemester(teacherId, semesterId)
  const { rounds } = useSchedulingRounds(teacherId, semesterId)
  const round = rounds.find((r) => r.id === roundId)
  const { submission: existing } = useMySubmission(teacherId, semesterId, roundId, user.uid)
  const { availability: teacherAvailability } = useTeacherAvailability(teacherId, semesterId)
  // A partial round publishes what the teacher has left once everyone else's lessons are taken
  // out. The student sees it exactly as if those hours had never been offered.
  const { capacity } = useRoundCapacity(teacherId, semesterId, roundId)
  const offered = capacity ?? teacherAvailability

  const [preferences, setPreferences] = useState<AvailabilityBlock[]>([])
  const [overrides, setOverrides] = useState<Record<string, { blocks: AvailabilityBlock[] }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState(false)
  // Seeded once the stored answer arrives, and not again: the student is drawing on this
  // calendar, and the echo of their own submission would wipe whatever they had started.
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || !existing) return
    seeded.current = true
    setPreferences(existing.recurringPreferences ?? [])
    setOverrides(existing.weekOverrides ?? {})
    setSubmitted(existing.status === 'submitted')
  }, [existing])

  const teacherBlocks = offered?.weeklyTemplate.blocks ?? []
  // Per week, because what is left varies: a slot taken on three Tuesdays out of ten is free on
  // the other seven, and the week's own view should say so.
  const teacherBlocksForWeek = useCallback(
    (weekStart: string): AvailabilityBlock[] =>
      offered?.weekOverrides?.[weekStart]?.blocks ?? offered?.weeklyTemplate.blocks ?? [],
    [offered]
  )
  // The teacher's own teaching hours. The student is answering a question about this semester,
  // so they should be looking at the same slice of the day the teacher set for it.
  const { startHour: dayStartHour, endHour: dayEndHour } = dayWindow(semester)

  // ── Validation ───────────────────────────────────────────────────────────────

  const preferredCount = preferences.filter((b) => b.label === AvailabilityLabel.PREFERRED).length
  const missingCount = Math.max(0, SCHEDULING_CONFIG.MIN_STUDENT_PREFERENCES - preferences.length)
  const missingPreferred = preferredCount < SCHEDULING_CONFIG.MIN_PREFERRED_PREFERENCES
  const valid = missingCount === 0 && !missingPreferred

  // Advice, never a block: the student may know something the teacher's template does not say.
  const unlikely = useMemo(
    () =>
      preferences.filter(
        (block) =>
          lowestTeacherScore(teacherBlocks, block) < LABEL_SCORES[AvailabilityLabel.AVAILABLE]
      ),
    [preferences, teacherBlocks]
  )

  if (!semester || !round) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <SchedulingNav section="student" items={[{ label: t.notFound }]} />
        <Typography color="text.secondary">{t.notFound}</Typography>
      </Container>
    )
  }

  const closed = round.status !== 'collecting' || round.deadline <= now

  function handleAddOverride(weekStart: string) {
    if (weekStart in overrides) return
    // A new override starts from the usual week, so the student edits rather than redraws.
    setOverrides((prev) => ({ ...prev, [weekStart]: { blocks: [...preferences] } }))
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />
      <SchedulingNav section="student" items={[{ label: semester.name }]} />

      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {t.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {semester.name} · {t.deadline}:{' '}
        {dayjs(round.deadline).locale(dayjsLocale).format('D MMM YYYY, HH:mm')}{' '}
        <Box component="span" sx={{ color: closed ? 'warning.main' : 'text.secondary' }}>
          ({closed ? t.deadlinePassed : `${t.closesIn} ${formatCountdown(round.deadline - now)}`})
        </Box>
      </Typography>

      {closed ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>{t.closedTitle}</AlertTitle>
          {t.closed}
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t.intro}
          </Typography>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            {t.weeklyTitle}
          </Typography>
          <AvailabilityCalendar
            blocks={preferences}
            overlayBlocks={teacherBlocks}
            displayStartHour={dayStartHour}
            displayEndHour={dayEndHour}
            onChange={(blocks) => {
              setPreferences(blocks)
              setSubmitted(false)
            }}
          />

          {unlikely.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <AlertTitle>{t.warningTitle}</AlertTitle>
              {t.warningBody(
                unlikely
                  .map(
                    (b) => `${weekdayName(b.dayOfWeek, dayjsLocale)} ${b.startTime}–${b.endTime}`
                  )
                  .join(', ')
              )}
            </Alert>
          )}

          <WeekOverridesSection
            overrides={overrides}
            semesterStart={semester.startDate}
            semesterEnd={semester.endDate}
            overlayBlocksFor={teacherBlocksForWeek}
            displayStartHour={dayStartHour}
            displayEndHour={dayEndHour}
            onAdd={handleAddOverride}
            onChange={(weekStart, blocks) => {
              setOverrides((prev) => ({ ...prev, [weekStart]: { blocks } }))
              setSubmitted(false)
            }}
            onRemove={(weekStart) => {
              setOverrides((prev) => {
                const { [weekStart]: _removed, ...rest } = prev
                return rest
              })
              setSubmitted(false)
            }}
          />

          {/* One feedback slot, directly above the button. The confirmation used to sit at
              the top of the page, so submitting from down here appeared to do nothing. */}
          <Stack spacing={1} sx={{ mt: 4 }}>
            <Alert severity={submitted || valid ? 'success' : 'info'}>
              {submitted ? (
                <>
                  <AlertTitle>{t.submittedTitle}</AlertTitle>
                  {t.submittedBody}
                </>
              ) : valid ? (
                t.ready
              ) : (
                <Stack component="span" sx={{ display: 'block' }}>
                  {missingCount > 0 && (
                    <Box component="span" sx={{ display: 'block' }}>
                      {t.needMore(SCHEDULING_CONFIG.MIN_STUDENT_PREFERENCES)}
                    </Box>
                  )}
                  {missingPreferred && (
                    <Box component="span" sx={{ display: 'block' }}>
                      {t.needPreferred}
                    </Box>
                  )}
                </Stack>
              )}
            </Alert>
            {/* The student has just been told nothing. Without this the button simply fails to
                advance, and their availability is silently missing from the round. */}
            {saveError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => {
                  setSaveError(false)
                }}>
                {t.saveFailed}
              </Alert>
            )}
            <Box>
              <Button
                variant="contained"
                disabled={!valid || submitted}
                onClick={() => {
                  if (!teacherId || !semesterId || !roundId || !user.uid) return
                  setSaveError(false)
                  void saveSubmission(teacherId, semesterId, roundId, user.uid, {
                    recurringPreferences: preferences,
                    weekOverrides: overrides
                  })
                    .then(() => {
                      setSubmitted(true)
                      notifySubmissionReceived(teacherId, user.name ?? '', semester?.name ?? '', {
                        semesterId,
                        roundId
                      })
                    })
                    .catch(() => {
                      setSaveError(true)
                    })
                }}>
                {existing?.status === 'submitted' ? t.resubmit : t.submit}
              </Button>
            </Box>
          </Stack>
        </>
      )}
    </Container>
  )
}
