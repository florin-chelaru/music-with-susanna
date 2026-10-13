import { Box, Button, Chip, Divider, Popover, Stack, Typography, useTheme } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import { alpha } from '@mui/material/styles'
import dayjs from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import { Calendar, View, Views } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { localizer } from '../../util/calendarLocalizer'
import CalendarToolbar from './CalendarToolbar'
import { calendarShellSx, monthAgendaSx, timeGridSx } from './calendarStyles'
import { LessonInstance, LessonStatus } from '../../util/scheduling'
import { subjectLabel } from '../../util/User'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface LessonCalendarTexts {
  month: string
  week: string
  agenda: string
  today: string
  back: string
  next: string
  date: string
  time: string
  event: string
  noLessons: string
  lesson: string
  statusScheduled: string
  statusCompleted: string
  statusCanceled: string
  statusRescheduled: string
  cancelLesson: string
  exportIcs: string
}

const EN_US: LessonCalendarTexts = {
  month: 'Month',
  week: 'Week',
  agenda: 'Agenda',
  today: 'Today',
  back: 'Back',
  next: 'Next',
  date: 'Date',
  time: 'Time',
  event: 'Lesson',
  noLessons: 'No lessons in this range.',
  lesson: 'Lesson',
  statusScheduled: 'Scheduled',
  statusCompleted: 'Completed',
  statusCanceled: 'Canceled',
  statusRescheduled: 'Rescheduled',
  cancelLesson: 'Cancel lesson',
  exportIcs: 'Export .ics'
}

const RO_RO: LessonCalendarTexts = {
  month: 'Lună',
  week: 'Săptămână',
  agenda: 'Agendă',
  today: 'Astăzi',
  back: 'Înapoi',
  next: 'Înainte',
  date: 'Data',
  time: 'Ora',
  event: 'Lecție',
  noLessons: 'Nicio lecție în acest interval.',
  lesson: 'Lecție',
  statusScheduled: 'Programată',
  statusCompleted: 'Finalizată',
  statusCanceled: 'Anulată',
  statusRescheduled: 'Reprogramată',
  cancelLesson: 'Anulează lecția',
  exportIcs: 'Exportă .ics'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Internal event type ──────────────────────────────────────────────────────

interface LessonEvent {
  title: string
  start: Date
  end: Date
  lesson: LessonInstance
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LessonCalendarProps {
  lessons: LessonInstance[]
  /** Teacher view: maps studentId → display name. Omit for the student view. */
  students?: Record<string, { name: string }>
  /**
   * Student view: what is being taught, from the teacher's `subject` on their user record.
   * An event titled only "Lesson" tells a student nothing — the production data already has
   * two teachers, one teaching violin and one teaching computer science.
   *
   * TODO (Step P): a student's lessons can come from several teachers, so this becomes a
   * per-lesson lookup rather than one subject for the whole calendar.
   */
  subject?: string
  locationName?: string
  /** Omit to hide the cancel affordance entirely. */
  onCancel?: (lesson: LessonInstance) => void
  /** Omit to hide the export button. */
  onExportIcs?: () => void
  /** Which month the calendar opens on. Defaults to today. */
  defaultDate?: Date
}

export default function LessonCalendar({
  lessons,
  students,
  subject,
  locationName,
  onCancel,
  onExportIcs,
  defaultDate
}: LessonCalendarProps) {
  const theme = useTheme()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(LessonCalendar.name, TEXTS), [])
  const t = localeManager.componentStrings(LessonCalendar.name) as LessonCalendarTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'
  dayjs.locale(dayjsLocale)

  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState<Date>(defaultDate ?? new Date())
  const [selected, setSelected] = useState<{ lesson: LessonInstance; anchor: HTMLElement } | null>(
    null
  )

  // ── Status presentation ──────────────────────────────────────────────────────

  const statusColor = useMemo(
    () => ({
      scheduled: theme.palette.primary.main,
      completed: theme.palette.success.main,
      canceled: theme.palette.error.main,
      rescheduled: theme.palette.warning.main
    }),
    [theme]
  )

  const statusLabel = (status: LessonStatus): string => {
    switch (status) {
      case 'scheduled':
        return t.statusScheduled
      case 'completed':
        return t.statusCompleted
      case 'canceled':
        return t.statusCanceled
      case 'rescheduled':
        return t.statusRescheduled
    }
  }

  // A teacher sees which student the lesson is with; a student sees what it is.
  //
  // `subject` is free text the teacher typed, and the stored values are inconsistently cased
  // ("violin" but "Computer Science"), so only the first letter is forced — title-casing every
  // word would mangle subjects that are already written properly.
  //
  // Translated first: the teacher types it once, in one language, and a Romanian student should
  // not be told their lesson is "violin".
  const titleFor = (lesson: LessonInstance): string => {
    if (students) return students[lesson.studentId]?.name ?? lesson.studentId
    if (!subject) return t.lesson
    const label = subjectLabel(subject, localeManager.locale)
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  const events: LessonEvent[] = useMemo(
    () =>
      lessons.map((lesson) => ({
        title: titleFor(lesson),
        start: new Date(lesson.scheduledStart),
        end: new Date(lesson.scheduledEnd),
        lesson
      })),
    [lessons, students, dayjsLocale, t]
  )

  // Canceled lessons stay visible but read as struck through, so a gap in the schedule is
  // distinguishable from a lesson that was called off.
  const eventPropGetter = (event: LessonEvent) => {
    const color = statusColor[event.lesson.status]
    const canceled = event.lesson.status === 'canceled'
    return {
      style: {
        backgroundColor: alpha(color, canceled ? 0.08 : 0.16),
        borderLeft: `3px solid ${color}`,
        color: theme.palette.text.primary,
        opacity: canceled ? 0.6 : 1,
        textDecoration: canceled ? 'line-through' : 'none'
      }
    }
  }

  const messages = useMemo(
    () => ({
      month: t.month,
      week: t.week,
      day: t.event,
      agenda: t.agenda,
      today: t.today,
      previous: t.back,
      next: t.next,
      date: t.date,
      time: t.time,
      event: t.event,
      noEventsInRange: t.noLessons
    }),
    [t]
  )

  // ── Styling ──────────────────────────────────────────────────────────────────

  const calendarSx = useMemo(
    () => ({
      ...calendarShellSx(theme, { minHeight: 520 }),
      ...timeGridSx(theme),
      ...monthAgendaSx(theme)
    }),
    [theme]
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  const selectedLesson = selected?.lesson ?? null
  const canCancel = onCancel && selectedLesson?.status === 'scheduled'

  return (
    <Box>
      {onExportIcs && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button size="small" startIcon={<DownloadIcon />} onClick={onExportIcs}>
            {t.exportIcs}
          </Button>
        </Stack>
      )}

      <Box sx={calendarSx}>
        <Calendar
          localizer={localizer}
          culture={dayjsLocale}
          key={dayjsLocale}
          events={events}
          messages={messages}
          components={{ toolbar: CalendarToolbar }}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          view={view}
          onView={(v) => {
            setView(v)
          }}
          date={date}
          onNavigate={(d) => {
            setDate(d)
          }}
          popup
          selectable={false}
          onSelectEvent={(event: LessonEvent, e) => {
            setSelected({ lesson: event.lesson, anchor: e.currentTarget as HTMLElement })
          }}
          eventPropGetter={eventPropGetter}
        />
      </Box>

      {/* Only the statuses actually present, so the legend never explains a colour that is
          not on screen. */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1 }}>
        {(['scheduled', 'completed', 'canceled', 'rescheduled'] as LessonStatus[])
          .filter((status) => lessons.some((lesson) => lesson.status === status))
          .map((status) => (
            <Stack key={status} direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '2px',
                  backgroundColor: alpha(statusColor[status], 0.3),
                  borderLeft: `3px solid ${statusColor[status]}`
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {statusLabel(status)}
              </Typography>
            </Stack>
          ))}
      </Stack>

      <Popover
        open={Boolean(selected)}
        anchorEl={selected?.anchor ?? null}
        onClose={() => {
          setSelected(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
        {selectedLesson && (
          <Box sx={{ p: 2, minWidth: 240 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {titleFor(selectedLesson)}
              </Typography>
              <Chip
                size="small"
                label={statusLabel(selectedLesson.status)}
                sx={{
                  backgroundColor: alpha(statusColor[selectedLesson.status], 0.14),
                  color: statusColor[selectedLesson.status],
                  fontWeight: 600
                }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {dayjs(selectedLesson.scheduledStart).locale(dayjsLocale).format('dddd, D MMMM YYYY')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayjs(selectedLesson.scheduledStart).format('HH:mm')} –{' '}
              {dayjs(selectedLesson.scheduledEnd).format('HH:mm')}
            </Typography>
            {locationName && (
              <Typography variant="body2" color="text.secondary">
                {locationName}
              </Typography>
            )}

            {canCancel && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Button
                  size="small"
                  color="error"
                  startIcon={<EventBusyIcon />}
                  onClick={() => {
                    const lesson = selectedLesson
                    setSelected(null)
                    onCancel?.(lesson)
                  }}>
                  {t.cancelLesson}
                </Button>
              </>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  )
}
