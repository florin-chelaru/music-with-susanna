import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import EventIcon from '@mui/icons-material/Event'
import RepeatIcon from '@mui/icons-material/Repeat'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { useContext } from 'react'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { GroupClass, Lesson, LessonStatus } from '../util/Lesson'
import { SupportedLocale } from '../util/SupportedLocale'

interface LessonCardTexts {
  confirm: string
  edit: string
  cancel: string
  delete: string
  proposeNewTime: string
  approveCancel: string
  statusRequested: string
  statusScheduled: string
  statusCancellationRequested: string
  statusCancelled: string
  statusCompleted: string
  recurring: string
  minutes: string
  enrolledCount: string
}

export const LESSON_CARD_TEXTS = new Map<SupportedLocale, LessonCardTexts>([
  [
    SupportedLocale.EN_US,
    {
      confirm: 'Confirm',
      edit: 'Edit',
      cancel: 'Cancel',
      delete: 'Delete',
      proposeNewTime: 'Propose new time',
      approveCancel: 'Approve cancellation',
      statusRequested: 'Pending',
      statusScheduled: 'Confirmed',
      statusCancellationRequested: 'Cancellation requested',
      statusCancelled: 'Cancelled',
      statusCompleted: 'Completed',
      recurring: 'Recurring',
      minutes: 'min',
      enrolledCount: 'enrolled'
    }
  ],
  [
    SupportedLocale.RO_RO,
    {
      confirm: 'Confirmă',
      edit: 'Editează',
      cancel: 'Anulează',
      delete: 'Șterge',
      proposeNewTime: 'Propune un nou timp',
      approveCancel: 'Aprobă anularea',
      statusRequested: 'În așteptare',
      statusScheduled: 'Confirmat',
      statusCancellationRequested: 'Anulare solicitată',
      statusCancelled: 'Anulat',
      statusCompleted: 'Finalizat',
      recurring: 'Recurent',
      minutes: 'min',
      enrolledCount: 'înscriși'
    }
  ]
])

function statusColor(status: LessonStatus): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'requested':
      return 'warning'
    case 'scheduled':
      return 'success'
    case 'cancellation_requested':
      return 'warning'
    case 'cancelled':
      return 'error'
    case 'completed':
      return 'default'
  }
}

function statusLabel(status: LessonStatus, texts: LessonCardTexts): string {
  switch (status) {
    case 'requested':
      return texts.statusRequested
    case 'scheduled':
      return texts.statusScheduled
    case 'cancellation_requested':
      return texts.statusCancellationRequested
    case 'cancelled':
      return texts.statusCancelled
    case 'completed':
      return texts.statusCompleted
  }
}

export interface LessonCardProps {
  lesson: Lesson
  participantName?: string
  texts: LessonCardTexts
  onConfirm?: (lesson: Lesson) => void
  onPropose?: (lesson: Lesson) => void
  onEdit?: (lesson: Lesson) => void
  onCancel?: (lesson: Lesson) => void
  onApproveCancel?: (lesson: Lesson) => void
}

export function LessonCard({
  lesson,
  participantName,
  texts,
  onConfirm,
  onPropose,
  onEdit,
  onCancel,
  onApproveCancel
}: LessonCardProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const startDate = new Date(lesson.startTime)
  const endDate = new Date(lesson.startTime + lesson.durationMinutes * 60 * 1000)

  const dateStr = localeManager.formatLongDate(startDate, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const isPast = lesson.startTime < Date.now()

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: lesson.status === 'cancelled' ? 0.6 : 1,
        borderColor: lesson.status === 'cancellation_requested' ? 'warning.main' : undefined,
        bgcolor: lesson.status === 'cancellation_requested' ? 'warning.50' : undefined
      }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {dateStr}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {timeStr} – {endTimeStr} ({lesson.durationMinutes} {texts.minutes})
            </Typography>
            {participantName && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {participantName}
              </Typography>
            )}
            {lesson.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {lesson.notes}
              </Typography>
            )}
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {lesson.recurring && (
              <Tooltip title={texts.recurring}>
                <RepeatIcon fontSize="small" color="action" />
              </Tooltip>
            )}
            <Chip
              label={statusLabel(lesson.status, texts)}
              color={statusColor(lesson.status)}
              size="small"
            />
          </Stack>
        </Stack>

        {lesson.status === 'cancellation_requested' && !isPast && onApproveCancel && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
            <Tooltip title={texts.approveCancel}>
              <IconButton size="small" color="warning" onClick={() => onApproveCancel(lesson)}>
                <ThumbUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        {lesson.status !== 'cancelled' && lesson.status !== 'cancellation_requested' && !isPast && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
            {lesson.status === 'requested' && onConfirm && (
              <Tooltip title={texts.confirm}>
                <IconButton size="small" color="success" onClick={() => onConfirm(lesson)}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {lesson.status === 'requested' && onPropose && (
              <Tooltip title={texts.proposeNewTime}>
                <IconButton size="small" color="info" onClick={() => onPropose(lesson)}>
                  <EventIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title={texts.edit}>
                <IconButton size="small" onClick={() => onEdit(lesson)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onCancel && (
              <Tooltip title={texts.cancel}>
                <IconButton size="small" color="error" onClick={() => onCancel(lesson)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
        {lesson.status === 'cancelled' && onCancel && !isPast && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
            <Tooltip title={texts.delete}>
              <IconButton size="small" color="error" onClick={() => onCancel(lesson)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export interface GroupClassCardProps {
  groupClass: GroupClass
  texts: LessonCardTexts
  isEnrolled?: boolean
  enrolledStudentNames?: string[]
  onEdit?: (cls: GroupClass) => void
  onCancel?: (cls: GroupClass) => void
  onEnroll?: (cls: GroupClass) => void
  onUnenroll?: (cls: GroupClass) => void
}

export function GroupClassCard({
  groupClass,
  texts,
  isEnrolled,
  enrolledStudentNames,
  onEdit,
  onCancel,
  onEnroll,
  onUnenroll
}: GroupClassCardProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const startDate = new Date(groupClass.startTime)
  const endDate = new Date(groupClass.startTime + groupClass.durationMinutes * 60 * 1000)

  const dateStr = localeManager.formatLongDate(startDate, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const enrolledCount = Object.keys(groupClass.enrolledStudents ?? {}).length
  const isPast = groupClass.startTime < Date.now()

  return (
    <Card variant="outlined" sx={{ opacity: groupClass.status === 'cancelled' ? 0.6 : 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {groupClass.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dateStr}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {timeStr} – {endTimeStr} ({groupClass.durationMinutes} {texts.minutes})
            </Typography>
            {groupClass.description && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {groupClass.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {enrolledCount} {texts.enrolledCount}
            </Typography>
            {enrolledStudentNames && enrolledStudentNames.length > 0 && enrolledCount <= 5 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {enrolledStudentNames.join(', ')}
              </Typography>
            )}
          </Box>
          <Stack direction="column" alignItems="flex-end" spacing={0.5}>
            {groupClass.recurring && (
              <Tooltip title={texts.recurring}>
                <RepeatIcon fontSize="small" color="action" />
              </Tooltip>
            )}
            {isEnrolled && <Chip label="✓" color="success" size="small" />}
          </Stack>
        </Stack>

        {!isPast && groupClass.status !== 'cancelled' && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
            {onEnroll && !isEnrolled && (
              <Chip
                label={texts.confirm}
                color="primary"
                size="small"
                onClick={() => onEnroll(groupClass)}
                clickable
              />
            )}
            {onUnenroll && isEnrolled && (
              <Chip
                label={texts.cancel}
                color="default"
                size="small"
                onClick={() => onUnenroll(groupClass)}
                clickable
              />
            )}
            {onEdit && (
              <Tooltip title={texts.edit}>
                <IconButton size="small" onClick={() => onEdit(groupClass)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onCancel && (
              <Tooltip title={texts.cancel}>
                <IconButton size="small" color="error" onClick={() => onCancel(groupClass)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
