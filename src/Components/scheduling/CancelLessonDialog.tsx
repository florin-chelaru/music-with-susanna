import {
  Alert,
  Box,
  Checkbox,
  DialogContent,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import dayjs from 'dayjs'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { LessonInstance, isWithinCancellationWindow } from '../../util/scheduling'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface CancelLessonDialogTexts {
  title: string
  cancelAllForward: string
  cancelAllForwardHelp: string
  offerMakeup: string
  offerMakeupHelp: string
  reason: string
  reasonPlaceholder: string
  insideWindow: string
  outsideWindow: string
  teacherNote: string
  keep: string
  confirm: string
}

const EN_US: CancelLessonDialogTexts = {
  title: 'Cancel lesson',
  cancelAllForward: 'Cancel all remaining lessons for this student',
  cancelAllForwardHelp: 'Every later lesson in this semester is canceled, in one notification.',
  offerMakeup: 'Offer a makeup lesson',
  offerMakeupHelp: 'You schedule the replacement separately afterwards.',
  reason: 'Reason (optional)',
  reasonPlaceholder: 'Shared with the other person',
  insideWindow:
    'This is inside the cancellation window. The lesson is charged and no makeup lesson is offered.',
  outsideWindow:
    'This is outside the cancellation window. There is no charge, and a makeup lesson can be requested.',
  teacherNote: 'The student is notified and asked to acknowledge.',
  keep: 'Keep lesson',
  confirm: 'Cancel lesson'
}

const RO_RO: CancelLessonDialogTexts = {
  title: 'Anulează lecția',
  cancelAllForward: 'Anulează toate lecțiile rămase pentru acest elev',
  cancelAllForwardHelp:
    'Toate lecțiile următoare din semestru sunt anulate, cu o singură notificare.',
  offerMakeup: 'Oferă o lecție de recuperare',
  offerMakeupHelp: 'Programezi lecția de înlocuire separat, ulterior.',
  reason: 'Motiv (opțional)',
  reasonPlaceholder: 'Vizibil celeilalte persoane',
  insideWindow:
    'Anularea este în interiorul ferestrei. Lecția se taxează și nu se oferă recuperare.',
  outsideWindow:
    'Anularea este în afara ferestrei. Nu se taxează și se poate cere o lecție de recuperare.',
  teacherNote: 'Elevul este notificat și trebuie să confirme.',
  keep: 'Păstrează lecția',
  confirm: 'Anulează lecția'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CancelLessonOptions {
  reason: string
  cancelAllForward: boolean
  offerMakeup: boolean
}

export interface CancelLessonDialogProps {
  open: boolean
  lesson: LessonInstance | null
  studentName?: string
  cancellationWindowHours: number
  /** Teacher can offer a makeup; the student sees the charge policy instead. */
  mode?: 'teacher' | 'student'
  onClose: () => void
  onConfirm: (options: CancelLessonOptions) => void
}

export default function CancelLessonDialog({
  open,
  lesson,
  studentName,
  cancellationWindowHours,
  mode = 'teacher',
  onClose,
  onConfirm
}: CancelLessonDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(CancelLessonDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(CancelLessonDialog.name) as CancelLessonDialogTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  const [reason, setReason] = useState('')
  const [cancelAllForward, setCancelAllForward] = useState(false)
  const [offerMakeup, setOfferMakeup] = useState(false)

  if (!lesson) return null

  const withinWindow = isWithinCancellationWindow(lesson.scheduledStart, cancellationWindowHours)
  const start = dayjs(lesson.scheduledStart).locale(dayjsLocale)
  const end = dayjs(lesson.scheduledEnd)

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={t.title}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: t.keep, onClick: onClose },
        {
          label: t.confirm,
          autoFocus: true,
          onClick: () => {
            onConfirm({ reason: reason.trim(), cancelAllForward, offerMakeup })
          }
        }
      ]}>
      <DialogContent>
        <Stack spacing={2}>
          <Box>
            {studentName && (
              <Typography variant="subtitle2" fontWeight={600}>
                {studentName}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {start.format('dddd, D MMMM YYYY')} · {start.format('HH:mm')}–{end.format('HH:mm')}
            </Typography>
          </Box>

          <Alert severity={withinWindow ? 'warning' : 'info'}>
            {mode === 'student' ? (withinWindow ? t.insideWindow : t.outsideWindow) : t.teacherNote}
          </Alert>

          <TextField
            label={t.reason}
            placeholder={t.reasonPlaceholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
            }}
            multiline
            minRows={2}
            size="small"
            fullWidth
          />

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cancelAllForward}
                  onChange={(e) => {
                    setCancelAllForward(e.target.checked)
                  }}
                />
              }
              label={t.cancelAllForward}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              {t.cancelAllForwardHelp}
            </Typography>
          </Box>

          {mode === 'teacher' && (
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={offerMakeup}
                    onChange={(e) => {
                      setOfferMakeup(e.target.checked)
                    }}
                  />
                }
                label={t.offerMakeup}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                {t.offerMakeupHelp}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </MultiActionDialog>
  )
}
