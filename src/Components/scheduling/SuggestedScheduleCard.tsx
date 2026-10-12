import { Alert, Box, Button, Chip, Divider, Stack, Typography, useTheme } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { averageScore, ScheduleSuggestion, SuggestedSlot } from '../../util/scheduling'
import { SatisfactionSummary, ScoreChip } from './scoreDisplay'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SuggestedScheduleCardTexts {
  favoursYou: string
  favoursStudents: string
  balanced: string
  favoursYouHint: string
  favoursStudentsHint: string
  balancedHint: string
  weightRange: string
  weightSingle: string
  averages: string
  satisfactionYou: string
  satisfactionStudents: string
  lessons: string
  unscheduled: string
  missing: string
  useThis: string
  selected: string
  scoreYou: string
  scoreStudent: string
}

const EN_US: SuggestedScheduleCardTexts = {
  favoursYou: 'Favours you',
  favoursStudents: 'Favours your students',
  balanced: 'Balanced',
  favoursYouHint: 'Leans towards your own preferred times.',
  favoursStudentsHint: 'Leans towards the times students asked for.',
  balancedHint: 'Weighs both sides about equally.',
  weightRange: 'Your preference counts for {from}–{to}%',
  weightSingle: 'Your preference counts for {from}%',
  averages: 'Average satisfaction',
  satisfactionYou: 'You',
  satisfactionStudents: 'Your students',
  lessons: 'lessons',
  unscheduled: 'Could not be scheduled',
  missing: 'missing {n}',
  useThis: 'Use this',
  selected: 'Selected',
  scoreYou: 'you',
  scoreStudent: 'student'
}

const RO_RO: SuggestedScheduleCardTexts = {
  favoursYou: 'Te favorizează pe tine',
  favoursStudents: 'Favorizează elevii',
  balanced: 'Echilibrat',
  favoursYouHint: 'Înclină spre orele tale preferate.',
  favoursStudentsHint: 'Înclină spre orele cerute de elevi.',
  balancedHint: 'Le cântărește aproape egal.',
  weightRange: 'Preferința ta cântărește {from}–{to}%',
  weightSingle: 'Preferința ta cântărește {from}%',
  averages: 'Satisfacție medie',
  satisfactionYou: 'Tu',
  satisfactionStudents: 'Elevii tăi',
  lessons: 'lecții',
  unscheduled: 'Nu au putut fi programați',
  missing: 'lipsesc {n}',
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
  /** The teacher-weight range that produces this schedule, from the solver's sweep. */
  weightFrom: number
  weightTo: number
  suggestion: ScheduleSuggestion
  students: Record<string, { name: string }>
  selected?: boolean
  onUse: () => void
}

interface StudentLine {
  studentId: string
  name: string
  lessonCount: number
  patterns: string[]
  // Kept separate rather than blended. A single combined number next to a student's name reads
  // as "did they get what they wanted" while being mostly the teacher's preference, and it is
  // weighted differently on every card, so the same figure means a different thing card to card.
  teacherScore: number
  studentScore: number
  /** Lessons this student is owed that the solver could not place anywhere. */
  missedLessons: number
}

export default function SuggestedScheduleCard({
  weightFrom,
  weightTo,
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

  // Named from where the band sits rather than from a fixed strategy: the solver decides how
  // many distinct schedules exist, so there is no guarantee of exactly three.
  const midpoint = (weightFrom + weightTo) / 2
  const title = midpoint >= 0.65 ? t.favoursYou : midpoint <= 0.35 ? t.favoursStudents : t.balanced
  const hint =
    midpoint >= 0.65 ? t.favoursYouHint : midpoint <= 0.35 ? t.favoursStudentsHint : t.balancedHint

  // Percentages rather than the raw weight — "0.7" means nothing to a violin teacher.
  const pct = (weight: number) => Math.round(weight * 100)
  const weightLabel =
    weightFrom === weightTo
      ? t.weightSingle.replace('{from}', String(pct(weightFrom)))
      : t.weightRange
          .replace('{from}', String(pct(weightFrom)))
          .replace('{to}', String(pct(weightTo)))

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
      teacherScore: averageScore(slots.map((slot) => slot.teacherScore)),
      studentScore: averageScore(slots.map((slot) => slot.studentScore)),
      missedLessons: suggestion.missedLessonsByStudent[studentId] ?? 0
    }))
  }, [suggestion, students, dayjsLocale])

  // Missing a lesson and being unschedulable are different failures, and conflating them is what
  // let a student who is away for one week appear in the warning while also holding a full row of
  // scores. Only a student the solver placed nowhere at all belongs in the warning.
  const scheduled = new Set(lines.map((line) => line.studentId))
  const unscheduledIds = Object.keys(suggestion.missedLessonsByStudent).filter(
    (studentId) => !scheduled.has(studentId)
  )

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
        <Typography variant="caption" color="text.secondary" display="block">
          {hint}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {weightLabel}
        </Typography>
      </Box>

      <SatisfactionSummary
        slots={suggestion.slots}
        caption={t.averages}
        teacherLabel={t.satisfactionYou}
        studentLabel={t.satisfactionStudents}
      />

      <Divider />

      <Stack spacing={1} sx={{ flex: 1 }}>
        {lines.map((line) => (
          <Box key={line.studentId}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="body2" fontWeight={500} sx={{ minWidth: 0 }}>
                {line.name}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <ScoreChip label={t.scoreYou} value={line.teacherScore} />
                <ScoreChip label={t.scoreStudent} value={line.studentScore} />
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              {line.lessonCount} {t.lessons} · {line.patterns.join(', ')}
              {line.missedLessons > 0 && (
                <Typography component="span" variant="caption" color="warning.main">
                  {` · ${t.missing.replace('{n}', String(line.missedLessons))}`}
                </Typography>
              )}
            </Typography>
          </Box>
        ))}
      </Stack>

      {unscheduledIds.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />} sx={{ py: 0 }}>
          <Typography variant="caption">
            {t.unscheduled}: {unscheduledIds.map((id) => students[id]?.name ?? id).join(', ')}
          </Typography>
        </Alert>
      )}

      <Button variant={selected ? 'contained' : 'outlined'} size="small" onClick={onUse}>
        {t.useThis}
      </Button>
    </Box>
  )
}
