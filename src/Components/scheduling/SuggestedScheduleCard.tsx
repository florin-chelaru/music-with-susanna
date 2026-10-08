import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import {
  AvailabilityLabel,
  LABEL_SCORES,
  SCHEDULING_CONFIG,
  ScheduleSuggestion,
  SuggestedSlot,
  SuggestionStrategy
} from '../../util/scheduling'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SuggestedScheduleCardTexts {
  teacherBest: string
  studentBest: string
  balanced: string
  teacherBestHint: string
  studentBestHint: string
  balancedHint: string
  totalScore: string
  lessons: string
  unscheduled: string
  useThis: string
  selected: string
  scoreYou: string
  scoreStudent: string
}

const EN_US: SuggestedScheduleCardTexts = {
  teacherBest: 'Best for teacher',
  studentBest: 'Best for students',
  balanced: 'Balanced',
  teacherBestHint: 'Favours your own preferred times.',
  studentBestHint: 'Favours the times students asked for.',
  balancedHint: 'Weighs both, leaning towards yours.',
  totalScore: 'Total score',
  lessons: 'lessons',
  unscheduled: 'Could not be scheduled',
  useThis: 'Use this',
  selected: 'Selected',
  scoreYou: 'you',
  scoreStudent: 'student'
}

const RO_RO: SuggestedScheduleCardTexts = {
  teacherBest: 'Optim pentru profesor',
  studentBest: 'Optim pentru elevi',
  balanced: 'Echilibrat',
  teacherBestHint: 'Favorizează orele tale preferate.',
  studentBestHint: 'Favorizează orele cerute de elevi.',
  balancedHint: 'Le cântărește pe amândouă, înclinând spre ale tale.',
  totalScore: 'Scor total',
  lessons: 'lecții',
  unscheduled: 'Nu au putut fi programați',
  useThis: 'Alege varianta',
  selected: 'Selectată',
  scoreYou: 'tu',
  scoreStudent: 'elev'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SuggestedScheduleCardProps {
  strategy: SuggestionStrategy
  suggestion: ScheduleSuggestion
  students: Record<string, { name: string }>
  selected?: boolean
  onUse: (strategy: SuggestionStrategy) => void
}

interface StudentLine {
  studentId: string
  name: string
  lessonCount: number
  patterns: string[]
  // Kept separate rather than blended. A single combined number next to a student's name
  // reads as "did they get what they wanted" while being 70% the teacher's preference —
  // it made the "best for students" card show its student the lowest figure of the three.
  teacherScore: number
  studentScore: number
  combinedScore: number
}

export default function SuggestedScheduleCard({
  strategy,
  suggestion,
  students,
  selected = false,
  onUse
}: SuggestedScheduleCardProps) {
  const theme = useTheme()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(SuggestedScheduleCard.name, TEXTS), [])
  const t = localeManager.componentStrings(SuggestedScheduleCard.name) as SuggestedScheduleCardTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  const title = { teacher_best: t.teacherBest, student_best: t.studentBest, balanced: t.balanced }[
    strategy
  ]
  const hint = {
    teacher_best: t.teacherBestHint,
    student_best: t.studentBestHint,
    balanced: t.balancedHint
  }[strategy]

  // One line per student: how many lessons they got, on which recurring day and time.
  // The algorithm assigns specific dates, so a student can legitimately end up with more
  // than one pattern — list each rather than showing only the first.
  const lines: StudentLine[] = useMemo(() => {
    const byStudent = new Map<string, SuggestedSlot[]>()
    suggestion.slots.forEach((slot) => {
      const existing = byStudent.get(slot.studentId)
      if (existing) existing.push(slot)
      else byStudent.set(slot.studentId, [slot])
    })
    return Array.from(byStudent.entries()).map(([studentId, slots]) => ({
      studentId,
      name: students[studentId]?.name ?? studentId,
      lessonCount: slots.length,
      patterns: Array.from(
        new Set(
          slots.map((slot) => {
            const day = dayjs(slot.date).locale(dayjsLocale).format('ddd')
            // Show the full range, not just the start: lesson length varies per student
            // and is otherwise only visible on the Students tab.
            return `${day} ${slot.startTime}–${slot.endTime}`
          })
        )
      ),
      teacherScore: average(slots.map((slot) => slot.teacherScore)),
      studentScore: average(slots.map((slot) => slot.studentScore)),
      combinedScore: average(slots.map((slot) => slot.combinedScore))
    }))
  }, [suggestion, students, dayjsLocale])

  // Scores can differ between a student's slots, so show the mean across them.
  function average(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length)
  }

  // Whole scores are the common case; only show a decimal when the mean is not round.
  function formatScore(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }

  // The raw total is a plain sum, so how big it gets depends on how many lessons were placed
  // and the number means little on its own. Show it against the best those lessons could have
  // scored instead. The weights sum to 1, so a perfect lesson is worth the top label score.
  //
  // Note this is per lesson placed: a strategy that drops a student scores *higher*, not
  // lower. The lesson count is shown alongside, and unscheduled students get their own
  // warning, so that is visible rather than hidden.
  const maxPerLesson = LABEL_SCORES[AvailabilityLabel.PREFERRED]
  const scorePercent =
    suggestion.slots.length > 0
      ? Math.round((suggestion.totalScore / (suggestion.slots.length * maxPerLesson)) * 100)
      : 0

  // Shown as the score chip's tooltip, so the breakdown is available on demand without
  // putting three numbers on every row. The weights are read from SCHEDULING_CONFIG rather
  // than written into the string, so the tooltip cannot drift from the real computation.
  function scoreFormula(line: StudentLine): string {
    const { TEACHER_WEIGHT, STUDENT_WEIGHT } = SCHEDULING_CONFIG
    const teacher = `${t.scoreYou} ${formatScore(line.teacherScore)} × ${TEACHER_WEIGHT}`
    const student = `${t.scoreStudent} ${formatScore(line.studentScore)} × ${STUDENT_WEIGHT}`
    return `${teacher} + ${student} = ${formatScore(line.combinedScore)}`
  }

  // Same scale as the availability labels, so a score reads the same way everywhere.
  function scoreColor(score: number): string {
    if (score >= LABEL_SCORES[AvailabilityLabel.PREFERRED] - 1) return theme.palette.success.main
    if (score >= LABEL_SCORES[AvailabilityLabel.AVAILABLE]) return theme.palette.primary.main
    return theme.palette.warning.main
  }

  return (
    <Box
      sx={{
        border: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        backgroundColor: selected ? alpha(theme.palette.primary.main, 0.04) : 'transparent'
      }}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {title}
          </Typography>
          {selected && <Chip size="small" color="primary" label={t.selected} />}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {t.totalScore}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {scorePercent}%
        </Typography>
      </Box>

      <Divider />

      <Stack spacing={1} sx={{ flex: 1 }}>
        {lines.map((line) => (
          <Box key={line.studentId}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="body2" fontWeight={500} sx={{ minWidth: 0 }}>
                {line.name}
              </Typography>
              <Tooltip title={scoreFormula(line)} enterTouchDelay={0}>
                <Chip
                  size="small"
                  label={formatScore(line.combinedScore)}
                  sx={{
                    height: 20,
                    flexShrink: 0,
                    backgroundColor: alpha(scoreColor(line.combinedScore), 0.14),
                    color: scoreColor(line.combinedScore),
                    fontWeight: 700,
                    '& .MuiChip-label': { px: 0.75, fontSize: '0.6875rem' }
                  }}
                />
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              {line.lessonCount} {t.lessons} · {line.patterns.join(', ')}
            </Typography>
          </Box>
        ))}
      </Stack>

      {suggestion.unscheduledStudentIds.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />} sx={{ py: 0 }}>
          <Typography variant="caption">
            {t.unscheduled}:{' '}
            {suggestion.unscheduledStudentIds.map((id) => students[id]?.name ?? id).join(', ')}
          </Typography>
        </Alert>
      )}

      <Button
        variant={selected ? 'contained' : 'outlined'}
        size="small"
        onClick={() => {
          onUse(strategy)
        }}>
        {t.useThis}
      </Button>
    </Box>
  )
}
