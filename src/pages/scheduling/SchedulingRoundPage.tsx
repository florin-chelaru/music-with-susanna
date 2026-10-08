import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import dayjs from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SchedulingNav from '../../Components/scheduling/SchedulingNav'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import { RoundStatus, SchedulingRound, SuggestionStrategy } from '../../util/scheduling'
import SuggestedScheduleCard from '../../Components/scheduling/SuggestedScheduleCard'
import { formatCountdown } from '../../util/schedulingDates'
import {
  MOCK_ENROLLMENTS_FALL,
  MOCK_ENROLLMENTS_SPRING,
  MOCK_ENROLLMENTS_SPRING2027,
  MOCK_ROUNDS_FALL,
  MOCK_ROUNDS_SPRING,
  MOCK_ROUNDS_SPRING2027,
  MOCK_SUGGESTIONS,
  MOCK_SEMESTER_IDS,
  MOCK_SEMESTERS,
  MOCK_STUDENTS,
  MOCK_SUBMISSIONS_BY_ROUND
} from '../../data/schedulingMocks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SchedulingRoundPageTexts {
  round: string
  deadline: string
  closesIn: string
  deadlinePassed: string
  colStudent: string
  colStatus: string
  colSubmitted: string
  submitted: string
  pending: string
  closeRound: string
  waitingOn: string
  readyToClose: string
  statusCollecting: string
  statusReady: string
  statusSuggested: string
  statusFinalized: string
  notCollecting: string
  notFound: string
  suggestionsTitle: string
  suggestionsHint: string
  confirmSchedule: string
  pickOne: string
  selectedHint: string
}

const EN_US: SchedulingRoundPageTexts = {
  round: 'Round',
  deadline: 'Deadline',
  closesIn: 'closes in',
  deadlinePassed: 'deadline passed',
  colStudent: 'Student',
  colStatus: 'Status',
  colSubmitted: 'Submitted',
  submitted: 'Submitted',
  pending: 'Pending',
  closeRound: 'Close round & generate suggestions',
  waitingOn:
    'Waiting on {count} student(s). The round can be closed once everyone has submitted, or once the deadline passes.',
  readyToClose: 'Everyone has submitted. The round is ready to close.',
  statusCollecting: 'Collecting',
  statusReady: 'Ready',
  statusSuggested: 'Suggested',
  statusFinalized: 'Finalized',
  notCollecting: 'This round is no longer collecting availability.',
  notFound: 'Round not found.',
  suggestionsTitle: 'Suggested schedules',
  suggestionsHint:
    'Three ways to fit everyone in. Pick the one closest to what you want — you can adjust it before confirming.',
  confirmSchedule: 'Confirm schedule',
  pickOne: 'Pick a suggestion to continue.',
  selectedHint:
    'Confirming generates every lesson for the rest of the semester and notifies the students.'
}

const RO_RO: SchedulingRoundPageTexts = {
  round: 'Runda',
  deadline: 'Termen limită',
  closesIn: 'se închide în',
  deadlinePassed: 'termenul a trecut',
  colStudent: 'Elev',
  colStatus: 'Stare',
  colSubmitted: 'Trimis',
  submitted: 'Trimis',
  pending: 'În așteptare',
  closeRound: 'Închide runda și generează sugestii',
  waitingOn:
    'Se așteaptă {count} elev(i). Runda poate fi închisă după ce trimit toți sau după expirarea termenului.',
  readyToClose: 'Toți elevii au trimis. Runda poate fi închisă.',
  statusCollecting: 'În colectare',
  statusReady: 'Pregătită',
  statusSuggested: 'Cu sugestii',
  statusFinalized: 'Finalizată',
  notCollecting: 'Această rundă nu mai colectează disponibilitate.',
  notFound: 'Runda nu a fost găsită.',
  suggestionsTitle: 'Orare sugerate',
  suggestionsHint:
    'Trei moduri de a încadra pe toată lumea. Alege-l pe cel mai apropiat de ce vrei — îl poți ajusta înainte de confirmare.',
  confirmSchedule: 'Confirmă orarul',
  pickOne: 'Alege o sugestie pentru a continua.',
  selectedHint: 'Confirmarea generează toate lecțiile din restul semestrului și notifică elevii.'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function roundStatusLabel(status: RoundStatus, t: SchedulingRoundPageTexts): string {
  switch (status) {
    case 'collecting':
      return t.statusCollecting
    case 'ready':
      return t.statusReady
    case 'suggested':
      return t.statusSuggested
    case 'finalized':
      return t.statusFinalized
  }
}

function roundsFor(semesterId: string | undefined): SchedulingRound[] {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_ROUNDS_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_ROUNDS_FALL
  if (semesterId === MOCK_SEMESTER_IDS.spring2027) return MOCK_ROUNDS_SPRING2027
  return []
}

function enrollmentsFor(semesterId: string | undefined) {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_ENROLLMENTS_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_ENROLLMENTS_FALL
  if (semesterId === MOCK_SEMESTER_IDS.spring2027) return MOCK_ENROLLMENTS_SPRING2027
  return []
}

// Order shown to the teacher: own preference first, then the students', then the compromise.
const STRATEGY_ORDER: SuggestionStrategy[] = ['teacher_best', 'student_best', 'balanced']

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulingRoundPage() {
  const { semesterId, roundId } = useParams<{ semesterId: string; roundId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const theme = useTheme()
  // Two separate useMediaQuery calls, never OR'd inline — hooks must not short-circuit.
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobile = isTouch || isSmallScreen
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(SchedulingRoundPage.name, TEXTS), [])
  const t = localeManager.componentStrings(SchedulingRoundPage.name) as SchedulingRoundPageTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

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

  const semester = MOCK_SEMESTERS.find((s) => s.id === semesterId)
  const round = roundsFor(semesterId).find((r) => r.id === roundId)
  const enrollments = enrollmentsFor(semesterId)

  const [selectedStrategy, setSelectedStrategy] = useState<SuggestionStrategy | null>(null)

  // The countdown re-renders once a minute; it is never shown finer than minutes.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, 60000)
    return () => {
      clearInterval(id)
    }
  }, [])

  if (!semester || !round) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <SchedulingNav items={[{ label: t.notFound }]} />
        <Typography color="text.secondary">{t.notFound}</Typography>
      </Container>
    )
  }

  const rows = enrollments.map((enrollment) => {
    const submission = MOCK_SUBMISSIONS_BY_ROUND[round.id]?.[enrollment.studentId]
    return {
      studentId: enrollment.studentId,
      name: MOCK_STUDENTS[enrollment.studentId]?.name ?? enrollment.studentId,
      status: submission?.status ?? 'pending',
      submittedAt: submission?.submittedAt
    }
  })

  const pendingCount = rows.filter((r) => r.status !== 'submitted').length
  const deadlinePassed = round.deadline <= now
  const canClose = round.status === 'collecting' && (deadlinePassed || pendingCount === 0)

  return (
    <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />

      <SchedulingNav
        items={[
          { label: semester.name, to: `/scheduling/semesters/${semester.id}?tab=scheduling` },
          { label: `${t.round} ${round.roundNumber}` }
        ]}
      />

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Typography variant="h5">
          {t.round} {round.roundNumber}
        </Typography>
        <Chip
          size="small"
          label={roundStatusLabel(round.status, t)}
          color={round.status === 'collecting' ? 'primary' : 'default'}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {semester.name}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.deadline}: {dayjs(round.deadline).locale(dayjsLocale).format('D MMMM YYYY, HH:mm')}{' '}
        <Box component="span" sx={{ color: deadlinePassed ? 'warning.main' : 'text.secondary' }}>
          (
          {deadlinePassed
            ? t.deadlinePassed
            : `${t.closesIn} ${formatCountdown(round.deadline - now)}`}
          )
        </Box>
      </Typography>

      {round.status === 'suggested' ? (
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {t.suggestionsTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.suggestionsHint}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              mb: 3
            }}>
            {STRATEGY_ORDER.map((strategy) => (
              <SuggestedScheduleCard
                key={strategy}
                strategy={strategy}
                suggestion={MOCK_SUGGESTIONS[strategy]}
                students={MOCK_STUDENTS}
                selected={selectedStrategy === strategy}
                onUse={setSelectedStrategy}
              />
            ))}
          </Box>

          <Alert severity={selectedStrategy ? 'success' : 'info'} sx={{ mb: 2 }}>
            {selectedStrategy ? t.selectedHint : t.pickOne}
          </Alert>
          <Button
            variant="contained"
            disabled={!selectedStrategy}
            onClick={() => {
              // TODO (Step I): load the chosen suggestion into an editable calendar, then
              // (Step O) write the confirmed schedule and generate the lesson instances.
            }}>
            {t.confirmSchedule}
          </Button>
        </Box>
      ) : round.status !== 'collecting' ? (
        <Alert severity="info">{t.notCollecting}</Alert>
      ) : (
        <>
          {isMobile ? (
            // One container per student, stacked vertically, rather than a table that needs
            // horizontal scrolling on a phone.
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {rows.map((row) => (
                <Box
                  key={row.studentId}
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
                      {row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.colSubmitted}:{' '}
                      {row.submittedAt
                        ? dayjs(row.submittedAt).locale(dayjsLocale).format('D MMM, HH:mm')
                        : '—'}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={row.status === 'submitted' ? t.submitted : t.pending}
                    color={row.status === 'submitted' ? 'success' : 'default'}
                    variant={row.status === 'submitted' ? 'filled' : 'outlined'}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t.colStudent}</TableCell>
                  <TableCell>{t.colStatus}</TableCell>
                  <TableCell>{t.colSubmitted}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.studentId} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status === 'submitted' ? t.submitted : t.pending}
                        color={row.status === 'submitted' ? 'success' : 'default'}
                        variant={row.status === 'submitted' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {row.submittedAt
                        ? dayjs(row.submittedAt).locale(dayjsLocale).format('D MMM, HH:mm')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Alert severity={canClose ? 'success' : 'info'} sx={{ mb: 2 }}>
            {canClose ? t.readyToClose : t.waitingOn.replace('{count}', String(pendingCount))}
          </Alert>

          <Button
            variant="contained"
            disabled={!canClose}
            onClick={() => {
              // TODO (Step O): run generateAllSuggestions, write them to RTDB and
              // advance the round to `suggested`.
            }}>
            {t.closeRound}
          </Button>
        </>
      )}
    </Container>
  )
}
