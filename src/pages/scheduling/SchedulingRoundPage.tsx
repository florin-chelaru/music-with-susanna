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
import {
  computeCombinedScore,
  RoundStatus,
  SchedulingRound,
  scoreForDayTime,
  SlotScores,
  SlotTime
} from '../../util/scheduling'
import {
  candidatesForDate,
  generateAllSuggestions,
  getEffectiveBlocksForDate,
  getScoreForSpan,
  pickSpread,
  SchedulingInput,
  ScoredTimeOption,
  WeightedSuggestion
} from '../../util/schedulingAlgorithm'
import EditableScheduleCalendar, {
  EditableSlot,
  UnscheduledLesson
} from '../../Components/scheduling/EditableScheduleCalendar'
import SuggestedScheduleCard from '../../Components/scheduling/SuggestedScheduleCard'
import { findScheduleConflicts } from '../../util/schedulingConflicts'
import {
  formatCountdown,
  formatMinutes,
  parseDate,
  parseMinutes,
  toDayOfWeek
} from '../../util/schedulingDates'
import { useNow } from '../../util/useNow'
import {
  enrollmentsForSemester,
  MOCK_SEMESTERS,
  MOCK_STUDENTS,
  MOCK_SUBMISSIONS_BY_ROUND,
  MOCK_TEACHER_AVAILABILITY,
  roundsForSemester
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
  adjustTitle: string
  adjustHint: string
  chooseDifferent: string
  confirmedBanner: string
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
    'Each strikes a different balance between your preferences and your students’, ordered from the ones that favour you to the ones that favour them. Pick the closest — you can adjust it before confirming.',
  confirmSchedule: 'Confirm schedule',
  pickOne: 'Pick a suggestion to continue.',
  selectedHint:
    'Confirming generates every lesson for the rest of the semester and notifies the students.',
  adjustTitle: 'Adjust the schedule',
  adjustHint:
    'Drag a lesson to move it, drag its edge to change the length, or click it to pick a time or put it back. Two lessons at once are refused; anything else is flagged above rather than blocked.',
  chooseDifferent: 'Choose a different suggestion',
  confirmedBanner:
    'Schedule confirmed. Every lesson for the rest of the semester would now be created and the students notified.'
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
    'Fiecare echilibrează diferit preferințele tale cu ale elevilor, de la cele care te favorizează pe tine la cele care îi favorizează pe ei. Alege-l pe cel mai apropiat — îl poți ajusta înainte de confirmare.',
  confirmSchedule: 'Confirmă orarul',
  pickOne: 'Alege o sugestie pentru a continua.',
  selectedHint: 'Confirmarea generează toate lecțiile din restul semestrului și notifică elevii.',
  adjustTitle: 'Ajustează orarul',
  adjustHint:
    'Trage o lecție pentru a o muta, trage de margine pentru a-i schimba durata sau dă clic pe ea ca să alegi o oră ori s-o readuci. Două lecții în același timp sunt refuzate; restul este semnalat mai sus, nu blocat.',
  chooseDifferent: 'Alege altă sugestie',
  confirmedBanner:
    'Orar confirmat. Toate lecțiile din restul semestrului ar fi create acum, iar elevii notificați.'
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

// Open the editor on the week the schedule starts, not on today — the suggestion may begin
// after the round's deadline, so today's week can be empty.
/** A schedule's identity for the purpose of remembering edits: the weight band that produced it. */
function bandKey(suggestion: WeightedSuggestion): string {
  return `${suggestion.weightFrom}-${suggestion.weightTo}`
}

/**
 * What a schedule still owes each student, once the teacher has placed some of it by hand.
 *
 * The card's warning and the editor's to-do list both ask this, and answering it two ways is how
 * a lesson ends up scheduled and still listed as missing.
 */
function remainingMissed(
  missed: Record<string, number>,
  slots: EditableSlot[]
): Record<string, number> {
  const remaining: Record<string, number> = {}
  Object.entries(missed).forEach(([studentId, count]) => {
    const placedByHand = slots.filter(
      (slot) => slot.studentId === studentId && slot.added === true
    ).length
    if (count - placedByHand > 0) remaining[studentId] = count - placedByHand
  })
  return remaining
}

function firstSlotDate(slots: EditableSlot[]): Date | undefined {
  if (slots.length === 0) return undefined
  const earliest = slots.map((slot) => slot.date).sort((a, b) => a.localeCompare(b))[0]
  return parseDate(earliest).toDate()
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
  const round = roundsForSemester(semesterId).find((r) => r.id === roundId)
  const enrollments = enrollmentsForSemester(semesterId)

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // TODO (Step O): run this when the teacher closes the round and persist the result, rather
  // than recomputing on every render of a round that is already `suggested`.
  const suggestions: WeightedSuggestion[] = useMemo(() => {
    if (!semester || !round) return []
    const schedulingInput: SchedulingInput = {
      semesterStart: semester.startDate,
      semesterEnd: semester.endDate,
      teacherAvailability: MOCK_TEACHER_AVAILABILITY,
      enrollments: enrollmentsForSemester(semester.id),
      submissions: MOCK_SUBMISSIONS_BY_ROUND[round.id] ?? {}
    }
    return pickSpread(generateAllSuggestions(schedulingInput))
  }, [semester, round])
  // Edits are kept per schedule and outlive stepping back to the cards. Losing an afternoon of
  // hand-placing because the teacher went back to compare against another option is not a
  // trade-off worth making. Keyed by weight band rather than position: the band is what the card
  // is, and it survives the list being recomputed.
  const [editsByBand, setEditsByBand] = useState<Record<string, EditableSlot[]>>({})
  const [confirmed, setConfirmed] = useState(false)

  const selected = selectedIndex !== null ? suggestions[selectedIndex] : null
  const selectedBand = selected ? bandKey(selected) : null

  const editedSlots: EditableSlot[] | null = useMemo(() => {
    if (!selected || !selectedBand) return null
    return editsByBand[selectedBand] ?? selected.slots.map((slot) => ({ ...slot }))
  }, [selected, selectedBand, editsByBand])

  function handleSlotsChange(slots: EditableSlot[]) {
    if (!selectedBand) return
    setEditsByBand((previous) => ({ ...previous, [selectedBand]: slots }))
  }

  function discardEdits(band: string) {
    setEditsByBand((previous) => {
      const next = { ...previous }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[band]
      return next
    })
  }

  // Selecting no longer copies anything: `editedSlots` resolves to the teacher's saved version
  // of this schedule when there is one, and to the solver's otherwise.
  function handleUseSuggestion(index: number) {
    setSelectedIndex(index)
  }

  function clearSelection() {
    setSelectedIndex(null)
  }

  // Each card stands for its own schedule: the solver's, or the teacher's version of it once
  // they have touched it. Showing the original's figures next to an "edited" badge would put a
  // number on the card that no longer describes anything.
  const cards = suggestions.map((suggestion) => {
    const band = bandKey(suggestion)
    const edits = editsByBand[band]
    if (!edits) return { band, suggestion, edited: false }
    return {
      band,
      edited: true,
      suggestion: {
        ...suggestion,
        slots: edits,
        missedLessonsByStudent: remainingMissed(suggestion.missedLessonsByStudent, edits)
      }
    }
  })

  const submissions = round ? MOCK_SUBMISSIONS_BY_ROUND[round.id] ?? {} : {}

  // The weight this schedule was built at, so a time the teacher picks is blended the same way
  // the solver blended the ones around it.
  const weight = selectedIndex !== null ? suggestions[selectedIndex].weightFrom : undefined

  const teacherBlocksOn = (date: string) =>
    getEffectiveBlocksForDate(
      MOCK_TEACHER_AVAILABILITY.weeklyTemplate.blocks,
      MOCK_TEACHER_AVAILABILITY.weekOverrides,
      date
    )

  const blocksOn = (studentId: string, date: string) => {
    const submission = submissions[studentId]
    return {
      teacher: teacherBlocksOn(date),
      student: submission
        ? getEffectiveBlocksForDate(submission.recurringPreferences, submission.weekOverrides, date)
        : []
    }
  }

  // The teacher's own rating of one point in the grid, for the shading behind the week view.
  // A point lookup rather than a span: this answers "what did I say about this moment?", not
  // "could a whole lesson sit here?".
  const teacherScoreAt = (date: string, startTime: string): number =>
    scoreForDayTime(teacherBlocksOn(date), toDayOfWeek(date), startTime)

  // What a time is worth to each side, for a lesson the teacher places or moves by hand. The
  // solver scores its own output; anything the teacher does afterwards has to be scored here,
  // because the calendar holds no availability data.
  //
  // Scored over the whole lesson, not at its starting minute. A 45-minute lesson beginning at
  // 12:45 against availability that ends at 13:00 starts inside the block and finishes outside
  // it: scoring the start alone calls that a perfect 10, which is how the figure a dialog row
  // showed could differ from the one the lesson arrived on the calendar wearing.
  const scoreAt = (studentId: string, time: SlotTime): SlotScores => {
    const blocks = blocksOn(studentId, time.date)
    const minutes = parseMinutes(time.endTime) - parseMinutes(time.startTime)
    const teacherScore = getScoreForSpan(blocks.teacher, time.startTime, minutes)
    const studentScore = getScoreForSpan(blocks.student, time.startTime, minutes)
    return {
      teacherScore,
      studentScore,
      combinedScore: computeCombinedScore(teacherScore, studentScore, weight)
    }
  }

  // Every start time on a date that suits both sides, straight from the solver's own candidate
  // generator — so the times the picker offers are by construction the ones the solver would
  // have considered. Lessons already placed are removed by the calendar, which owns them.
  const overlappingTimes = (
    studentId: string,
    date: string,
    durationMinutes: number
  ): ScoredTimeOption[] => {
    const blocks = blocksOn(studentId, date)
    return candidatesForDate(blocks.teacher, blocks.student, durationMinutes).map((option) => ({
      ...option,
      combinedScore: computeCombinedScore(option.teacherScore, option.studentScore, weight)
    }))
  }

  // Recomputed from the slots rather than carried over from the solver, so it still describes
  // the schedule after the teacher has dragged half of it around.
  const conflicts = useMemo(
    () =>
      editedSlots ? findScheduleConflicts(editedSlots, MOCK_TEACHER_AVAILABILITY, submissions) : [],
    [editedSlots, submissions]
  )

  // One entry per lesson the student is owed but has no time for.
  const unscheduled: UnscheduledLesson[] = useMemo(() => {
    if (!selected || !editedSlots || !semester) return []
    const missed = remainingMissed(selected.missedLessonsByStudent, editedSlots)
    return Object.entries(missed).flatMap(([studentId, count]) => {
      const enrollment = enrollments.find((e) => e.studentId === studentId)
      const minutes = enrollment?.lessonDurationMinutes ?? 45
      // The picker opens on the student's existing lessons where there are any, so the teacher
      // only has to change the day rather than build a time from scratch.
      const existing = editedSlots.find((slot) => slot.studentId === studentId)
      const seed: SlotTime = {
        date: existing?.date ?? semester.startDate,
        startTime: existing?.startTime ?? '09:00',
        endTime: existing?.endTime ?? formatMinutes(parseMinutes('09:00') + minutes)
      }
      return Array.from({ length: count }, () => ({ studentId, seed }))
    })
  }, [selected, editedSlots, semester, enrollments])

  const now = useNow()

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

      {/* Adjusting a chosen suggestion is a sub-view of the round, not a route of its own, so
          the round crumb clears the selection rather than navigating. Without this the only way
          out of the editor was the semester crumb, which overshoots to the list of all rounds. */}
      <SchedulingNav
        items={[
          { label: semester.name, to: `/scheduling/semesters/${semester.id}?tab=scheduling` },
          {
            label: `${t.round} ${round.roundNumber}`,
            onClick: editedSlots ? clearSelection : undefined
          },
          ...(editedSlots ? [{ label: t.adjustTitle }] : [])
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
          {confirmed ? (
            <Alert severity="success">{t.confirmedBanner}</Alert>
          ) : editedSlots ? (
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t.adjustTitle}
                </Typography>
                <Button size="small" onClick={clearSelection}>
                  {t.chooseDifferent}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.adjustHint}
              </Typography>

              <EditableScheduleCalendar
                slots={editedSlots}
                students={MOCK_STUDENTS}
                onChange={handleSlotsChange}
                defaultDate={firstSlotDate(editedSlots)}
                unscheduled={unscheduled}
                scoreAt={scoreAt}
                overlappingTimes={overlappingTimes}
                teacherScoreAt={teacherScoreAt}
                conflicts={conflicts}
              />

              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                {t.selectedHint}
              </Alert>
              <Button
                variant="contained"
                onClick={() => {
                  // TODO (Step O): write the confirmed schedule, generate the lesson
                  // instances and advance the round to `finalized`.
                  setConfirmed(true)
                }}>
                {t.confirmSchedule}
              </Button>
            </Box>
          ) : (
            <>
              {/* The heading belongs to the choosing step. Once a schedule is open for editing
                  it has its own heading, and "pick the closest" describes a decision already
                  made. */}
              <Typography variant="subtitle1" fontWeight={600}>
                {t.suggestionsTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.suggestionsHint}
              </Typography>

              {/* One strip, scrolled rather than wrapped. The cards are ordered as a spectrum
                  from teacher-favouring to student-favouring, and a three-column grid broke that
                  reading as soon as there were more than three — the fourth restarted on a new
                  row. The negative margin lets the strip use the full window width while the
                  padding keeps the first card aligned with the rest of the page. */}
              <Box
                sx={{
                  mx: 'calc(50% - 50vw)',
                  px: 'calc(50vw - 50%)',
                  overflowX: 'auto',
                  pb: 1.5,
                  mb: 3
                }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="stretch"
                  sx={{ width: 'max-content' }}>
                  {cards.map((card, index) => (
                    <Box key={card.band} sx={{ width: 300, flexShrink: 0 }}>
                      <SuggestedScheduleCard
                        weightFrom={card.suggestion.weightFrom}
                        weightTo={card.suggestion.weightTo}
                        suggestion={card.suggestion}
                        students={MOCK_STUDENTS}
                        selected={selectedIndex === index}
                        edited={card.edited}
                        onUse={() => {
                          handleUseSuggestion(index)
                        }}
                        onDiscardEdits={
                          card.edited
                            ? () => {
                                discardEdits(card.band)
                              }
                            : undefined
                        }
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Alert severity="info">{t.pickOne}</Alert>
            </>
          )}
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
