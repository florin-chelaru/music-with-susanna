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
import { LessonInstance, LessonStatus } from '../../util/scheduling'

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

  const titleFor = (lesson: LessonInstance): string =>
    students ? students[lesson.studentId]?.name ?? lesson.studentId : t.lesson

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

  const calendarSx = useMemo(() => {
    const d = theme.palette.divider
    const paper = theme.palette.background.paper
    return {
      border: `1px solid ${d}`,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: paper,
      p: 1.5,

      '& .rbc-calendar': {
        backgroundColor: paper,
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
        fontSize: '0.8125rem',
        minHeight: 520
      },
      '& .rbc-toolbar': {
        marginBottom: theme.spacing(1.5),
        flexWrap: 'wrap',
        gap: theme.spacing(1)
      },
      '& .rbc-toolbar button': {
        color: theme.palette.text.primary,
        borderColor: d,
        borderRadius: '6px'
      },
      '& .rbc-toolbar button:hover': { backgroundColor: theme.palette.action.hover },
      '& .rbc-toolbar button.rbc-active': {
        backgroundColor: theme.palette.action.selected,
        borderColor: d,
        boxShadow: 'none'
      },
      '& .rbc-toolbar-label': { fontWeight: 600 },
      '& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view': {
        border: `1px solid ${d}`,
        borderRadius: '6px',
        overflow: 'hidden'
      },
      '& .rbc-header': {
        border: 'none',
        borderBottom: `1px solid ${d}`,
        padding: theme.spacing(0.75, 0.5),
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontSize: '0.6875rem',
        color: theme.palette.text.secondary
      },
      '& .rbc-month-row + .rbc-month-row': { borderTop: `1px solid ${d}` },
      '& .rbc-day-bg + .rbc-day-bg': { borderLeft: `1px solid ${d}` },
      '& .rbc-off-range-bg': { backgroundColor: theme.palette.action.hover },
      '& .rbc-today': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
      '& .rbc-event': {
        borderRadius: '4px',
        border: 'none',
        padding: '1px 4px',
        fontSize: '0.75rem'
      },
      '& .rbc-event:focus': { outline: 'none' },
      '& .rbc-event.rbc-selected': { boxShadow: 'none' },
      '& .rbc-show-more': { color: theme.palette.primary.main, fontSize: '0.6875rem' },
      '& .rbc-agenda-view table': { borderColor: d },
      '& .rbc-agenda-view table tbody > tr > td': { borderColor: d }
    }
  }, [theme])

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
