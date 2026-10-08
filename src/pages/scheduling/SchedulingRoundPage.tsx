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
import { RoundStatus, SchedulingRound } from '../../util/scheduling'
import { formatCountdown } from '../../util/schedulingDates'
import {
  MOCK_ENROLLMENTS_FALL,
  MOCK_ENROLLMENTS_SPRING,
  MOCK_ROUNDS_FALL,
  MOCK_ROUNDS_SPRING,
  MOCK_SEMESTER_IDS,
  MOCK_SEMESTERS,
  MOCK_STUDENTS,
  MOCK_SUBMISSIONS
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
  notFound: 'Round not found.'
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
  notFound: 'Runda nu a fost găsită.'
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
  return []
}

function enrollmentsFor(semesterId: string | undefined) {
  if (semesterId === MOCK_SEMESTER_IDS.spring2026) return MOCK_ENROLLMENTS_SPRING
  if (semesterId === MOCK_SEMESTER_IDS.fall2026) return MOCK_ENROLLMENTS_FALL
  return []
}

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
    const submission = MOCK_SUBMISSIONS[enrollment.studentId]
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

      {round.status !== 'collecting' ? (
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
