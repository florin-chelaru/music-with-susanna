import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControlLabel,
  Stack,
  Typography
} from '@mui/material'
import dayjs from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { Cancellation, LessonInstance } from '../../util/scheduling'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface CancellationsPanelTexts {
  reviewTitle: string
  pendingTitle: string
  showHistory: string
  hideHistory: string
  billableLate: string
  billable: string
  notBillable: string
  byYou: string
  byStudent: string
  byTeacher: string
  noReason: string
  waive: string
  acknowledge: string
  awaitingReply: string
  seen: string
}

const EN_US: CancellationsPanelTexts = {
  reviewTitle: 'Cancellations to review',
  pendingTitle: 'Cancelled, awaiting your teacher',
  showHistory: 'Past cancellations ({n})',
  hideHistory: 'Hide past cancellations',
  billableLate: 'Billable (not cancelled in time)',
  billable: 'Billable',
  notBillable: 'Not billable',
  byYou: 'Cancelled by you',
  byStudent: 'Cancelled by the student',
  byTeacher: 'Cancelled by your teacher',
  noReason: 'No reason given.',
  waive: 'Do not bill for this one',
  acknowledge: 'Acknowledge',
  awaitingReply: 'Your teacher has not replied yet.',
  seen: 'Your teacher has seen this.'
}

const RO_RO: CancellationsPanelTexts = {
  reviewTitle: 'Anulări de verificat',
  pendingTitle: 'Anulate, în așteptarea profesorului',
  showHistory: 'Anulări anterioare ({n})',
  hideHistory: 'Ascunde anulările anterioare',
  billableLate: 'De plată (nu a fost anulată la timp)',
  billable: 'De plată',
  notBillable: 'Fără plată',
  byYou: 'Anulată de tine',
  byStudent: 'Anulată de elev',
  byTeacher: 'Anulată de profesor',
  noReason: 'Fără motiv.',
  waive: 'Nu încasa plata pentru această lecție',
  acknowledge: 'Confirmă',
  awaitingReply: 'Profesorul nu a răspuns încă.',
  seen: 'Profesorul a văzut anularea.'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CancellationsPanelProps {
  cancellations: Cancellation[]
  lessons: LessonInstance[]
  /** How to name a row: the student for a teacher, the subject for a student. */
  titleFor: (cancellation: Cancellation, lesson?: LessonInstance) => string
  /** Whose side the reader is on, which is what makes a cancellation read "by you". */
  viewerId: string
  mode?: 'teacher' | 'student'
  /** Teacher only; without it the panel is a record rather than a decision. */
  onAcknowledge?: (cancellation: Cancellation, charged: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Cancellations, for whichever side is reading.
 *
 * One component rather than two because both sides want the same record of what was cancelled and
 * when, and a student told one thing while their teacher sees another is the failure this feature
 * exists to avoid.
 *
 * Only the teacher is shown whether a lesson is billable. Nothing here moves money — it is taken
 * at the lesson, or at either end of the month, by whatever each family agreed — so a student
 * reading a running "charged / not charged" ledger would be reading a balance that does not
 * exist. The obligation is stated to them once, before they commit to cancelling.
 *
 * Billable is decided here rather than when the lesson was cancelled. The window gives the
 * default, but it cannot read "my daughter has a temperature" — so the teacher sees the reason
 * and the timing together, and the record keeps what they actually decided.
 */
export default function CancellationsPanel({
  cancellations,
  lessons,
  titleFor,
  viewerId,
  mode = 'teacher',
  onAcknowledge
}: CancellationsPanelProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(CancellationsPanel.name, TEXTS), [])
  const t = localeManager.componentStrings(CancellationsPanel.name) as CancellationsPanelTexts
  const dayjsLocale = localeManager.locale === SupportedLocale.RO_RO ? 'ro' : 'en'

  // Which ones the teacher has ticked to waive, before pressing Acknowledge.
  const [waived, setWaived] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons])

  // Newest first in both lists: a cancellation is read as news, and the one that just happened is
  // the one being looked for.
  const { pending, settled } = useMemo(() => {
    const byDate = [...cancellations].sort((a, b) => b.canceledAt - a.canceledAt)
    return {
      pending: byDate.filter((c) => c.acknowledgmentStatus !== 'acknowledged'),
      settled: byDate.filter((c) => c.acknowledgmentStatus === 'acknowledged')
    }
  }, [cancellations])

  if (pending.length === 0 && settled.length === 0) return null

  function renderRow(cancellation: Cancellation) {
    const lesson = lessonById.get(cancellation.lessonId)
    const waive = waived.includes(cancellation.id)
    const acknowledged = cancellation.acknowledgmentStatus === 'acknowledged'
    const byOther = mode === 'teacher' ? t.byStudent : t.byTeacher
    const isTeacher = mode === 'teacher'

    return (
      <Box key={cancellation.id}>
        <Typography variant="body2" fontWeight={500}>
          {titleFor(cancellation, lesson)}
          {lesson && (
            <>
              {' · '}
              {dayjs(lesson.scheduledStart).locale(dayjsLocale).format('ddd, D MMM, HH:mm')}
            </>
          )}
        </Typography>
        {/* Teacher only — see above. */}
        <Typography variant="caption" color="text.secondary" display="block">
          {cancellation.canceledBy === viewerId ? t.byYou : byOther}
          {isTeacher && ` · ${cancellation.withinWindow ? t.billableLate : t.notBillable}`}
        </Typography>
        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
          {cancellation.reason ?? t.noReason}
        </Typography>

        {acknowledged ? (
          <Typography
            variant="caption"
            color={isTeacher ? undefined : 'text.secondary'}
            fontWeight={isTeacher ? 600 : undefined}
            display="block"
            sx={{ mt: 0.5 }}>
            {/* What the teacher settled on. The student is told only that it was read — the
                outcome is money, and money is arranged off the app. */}
            {isTeacher ? (cancellation.charged ? t.billable : t.notBillable) : t.seen}
          </Typography>
        ) : onAcknowledge ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            {/* Only offered where there is something to waive. */}
            {cancellation.withinWindow && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={waive}
                    onChange={(event) => {
                      setWaived((previous) =>
                        event.target.checked
                          ? [...previous, cancellation.id]
                          : previous.filter((id) => id !== cancellation.id)
                      )
                    }}
                  />
                }
                label={<Typography variant="caption">{t.waive}</Typography>}
              />
            )}
            <Button
              size="small"
              onClick={() => {
                onAcknowledge(cancellation, cancellation.withinWindow && !waive)
              }}>
              {t.acknowledge}
            </Button>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {t.awaitingReply}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 2 }}>
      {pending.length > 0 && (
        <Alert severity="info" sx={{ mb: settled.length > 0 ? 1 : 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            {mode === 'teacher' ? t.reviewTitle : t.pendingTitle} ({pending.length})
          </Typography>
          <Stack spacing={1.5}>{pending.map(renderRow)}</Stack>
        </Alert>
      )}

      {/* Folded away by default. The history only grows, and it is a record to go looking for
          rather than something either side needs in front of them. */}
      {settled.length > 0 && (
        <Box>
          <Button
            size="small"
            onClick={() => {
              setHistoryOpen((open) => !open)
            }}>
            {historyOpen ? t.hideHistory : t.showHistory.replace('{n}', String(settled.length))}
          </Button>
          <Collapse in={historyOpen}>
            <Stack spacing={1.5} sx={{ mt: 1, px: 1 }}>
              {settled.map(renderRow)}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Box>
  )
}
