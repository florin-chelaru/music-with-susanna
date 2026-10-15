import { Alert, Box, Stack, Typography } from '@mui/material'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { SCHEDULING_CONFIG } from '../../util/scheduling'
import { ConflictKind, ScheduleConflict } from '../../util/schedulingConflicts'
import { parseDate } from '../../util/schedulingDates'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface ConflictsPanelTexts {
  one: string
  many: (count: number) => string
  overlap: (name: string) => string
  shortBreak: (minutes: number, name: string) => string
  teacherWeek: string
  teacherTemplate: string
  studentWeek: (name: string) => string
  studentTemplate: (name: string) => string
}

const EN_US: ConflictsPanelTexts = {
  one: 'One thing to look at',
  many: (count) => `${count} things to look at`,
  overlap: (name) => `At the same time as ${name}`,
  shortBreak: (minutes, name) => `Less than ${minutes} minutes after ${name}`,
  teacherWeek: 'Outside your hours that week',
  teacherTemplate: 'Outside your usual hours',
  studentWeek: (name) => `Outside ${name}’s hours that week`,
  studentTemplate: (name) => `Outside ${name}’s usual hours`
}

const RO_RO: ConflictsPanelTexts = {
  one: 'Un lucru de verificat',
  many: (count) => `${count} lucruri de verificat`,
  overlap: (name) => `În același timp cu ${name}`,
  shortBreak: (minutes, name) => `La mai puțin de ${minutes} minute după ${name}`,
  teacherWeek: 'În afara orelor tale din acea săptămână',
  teacherTemplate: 'În afara orelor tale obișnuite',
  studentWeek: (name) => `În afara orelor lui ${name} din acea săptămână`,
  studentTemplate: (name) => `În afara orelor obișnuite ale lui ${name}`
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ConflictsPanelProps {
  conflicts: ScheduleConflict[]
  students: Record<string, { name: string }>
  /** Takes the reader to the lesson. Rows are inert without it. */
  onSelect?: (conflict: ScheduleConflict) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Everything wrong with the schedule as it currently stands.
 *
 * Nothing here blocks the teacher. A lesson outside someone's stated hours may be exactly what
 * they intended — what matters is that they can see it rather than discover it later from a
 * student, so this reports and never refuses.
 */
export default function ConflictsPanel({ conflicts, students, onSelect }: ConflictsPanelProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(ConflictsPanel.name, TEXTS), [])
  const t = localeManager.componentStrings(ConflictsPanel.name) as ConflictsPanelTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  if (conflicts.length === 0) return null

  const nameOf = (studentId: string): string => students[studentId]?.name ?? studentId

  function reasonFor(conflict: ScheduleConflict): string {
    const other = conflict.otherStudentId ? nameOf(conflict.otherStudentId) : ''
    // No cast: the exhaustive Record is what makes a new ConflictKind a compile error here
    // rather than a blank line in the panel.
    const reasons: Record<ConflictKind, string> = {
      overlap: t.overlap(other),
      short_break: t.shortBreak(SCHEDULING_CONFIG.MIN_BREAK_MINUTES, other),
      teacher_week: t.teacherWeek,
      teacher_template: t.teacherTemplate,
      student_week: t.studentWeek(nameOf(conflict.studentId)),
      student_template: t.studentTemplate(nameOf(conflict.studentId))
    }
    return reasons[conflict.kind]
  }

  return (
    <Alert severity="warning" sx={{ mb: 1.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        {conflicts.length === 1 ? t.one : t.many(conflicts.length)}
      </Typography>
      <Stack spacing={0.5}>
        {conflicts.map((conflict, index) => (
          <Box
            key={`${conflict.kind}-${conflict.studentId}-${conflict.date}-${conflict.startTime}-${index}`}
            onClick={() => onSelect?.(conflict)}
            sx={{
              cursor: onSelect ? 'pointer' : 'default',
              borderRadius: 1,
              px: 0.5,
              mx: -0.5,
              '&:hover': { backgroundColor: onSelect ? 'action.hover' : 'transparent' }
            }}>
            <Typography variant="body2">
              {nameOf(conflict.studentId)} ·{' '}
              {parseDate(conflict.date).locale(dayjsLocale).format('ddd, D MMM')}{' '}
              {conflict.startTime}–{conflict.endTime}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {reasonFor(conflict)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Alert>
  )
}
