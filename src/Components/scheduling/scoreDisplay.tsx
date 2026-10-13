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

export interface ScoreLegendProps {
  /** One entry per colour band, each carrying a score that lands in it. */
  items: Array<{ score: number; label: string }>
  caption?: string
}

/**
 * What the colours on a calendar mean.
 *
 * Each swatch takes its colour from a real score rather than a hand-picked hex, so the legend
 * cannot drift away from the thing it explains: change a threshold in `scoreColor` and the
 * legend moves with it.
 */
export function ScoreLegend({ items, caption }: ScoreLegendProps) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
      {items.map((item) => {
        const color = scoreColor(theme, item.score)
        return (
          <Stack key={item.label} direction="row" spacing={0.5} alignItems="center">
            {/* Shaped like the events themselves: translucent fill behind a 3px accent bar. */}
            <Box
              sx={{
                width: 14,
                height: 10,
                borderRadius: '3px',
                backgroundColor: alpha(color, 0.18),
                borderLeft: `3px solid ${color}`
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          </Stack>
        )
      })}
    </Box>
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
