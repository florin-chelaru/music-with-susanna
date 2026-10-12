import { Box, Chip, Stack, Theme, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AvailabilityLabel, averageScore, LABEL_SCORES, SuggestedSlot } from '../../util/scheduling'

// Shared presentation for availability scores.
//
// The suggestion card, the editable calendar and the move dialog all show the same 0–10 figures,
// and each had started growing its own colour ramp and formatter. They belong together: a score
// that reads one way on a card and another on a calendar is worse than no score at all.

/** Whole scores are the common case; only show a decimal when the mean is not round. */
export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Same scale as the availability labels, so a score reads the same way everywhere. */
export function scoreColor(theme: Theme, score: number): string {
  if (score >= LABEL_SCORES[AvailabilityLabel.PREFERRED] - 1) return theme.palette.success.main
  if (score >= LABEL_SCORES[AvailabilityLabel.AVAILABLE]) return theme.palette.primary.main
  return theme.palette.warning.main
}

/** One side's score, small enough to sit at the end of a row. */
export function ScoreChip({ label, value }: { label: string; value: number }) {
  const theme = useTheme()
  const color = scoreColor(theme, value)
  return (
    <Chip
      size="small"
      label={`${label} ${formatScore(value)}`}
      sx={{
        height: 20,
        flexShrink: 0,
        backgroundColor: alpha(color, 0.14),
        color,
        fontWeight: 600,
        '& .MuiChip-label': { px: 0.75, fontSize: '0.6875rem' }
      }}
    />
  )
}

export interface SatisfactionSummaryProps {
  slots: Array<Pick<SuggestedSlot, 'teacherScore' | 'studentScore'>>
  teacherLabel: string
  studentLabel: string
  caption?: string
}

/**
 * The averages that let one schedule be compared with another.
 *
 * A schedule's own total is optimised at its own teacher weight, so it always flatters itself
 * and says nothing against another schedule's. These two sit on the same 0–10 scale whatever the
 * weight, which is what makes them comparable — and what makes them worth recomputing live while
 * the teacher edits.
 */
export function SatisfactionSummary({
  slots,
  teacherLabel,
  studentLabel,
  caption
}: SatisfactionSummaryProps) {
  const theme = useTheme()
  const entries = [
    { key: 'teacher', label: teacherLabel, value: averageScore(slots.map((s) => s.teacherScore)) },
    { key: 'student', label: studentLabel, value: averageScore(slots.map((s) => s.studentScore)) }
  ]

  return (
    <Box>
      {caption && (
        <Typography variant="caption" color="text.secondary" display="block">
          {caption}
        </Typography>
      )}
      <Stack direction="row" spacing={3} sx={{ mt: 0.25 }}>
        {entries.map((entry) => (
          <Box key={entry.key}>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1.2}
              sx={{ color: scoreColor(theme, entry.value) }}>
              {formatScore(entry.value)}
              <Typography component="span" variant="caption" color="text.disabled">
                {` / ${LABEL_SCORES[AvailabilityLabel.PREFERRED]}`}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {entry.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
