import {
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography
} from '@mui/material'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { SCHEDULING_CONFIG } from '../../util/scheduling'
import { formatMinutes, parseMinutes } from '../../util/schedulingDates'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface BlockTimesDialogTexts {
  title: string
  from: string
  to: string
  hint: string
  rangeError: string
  cancel: string
  save: string
}

const EN_US: BlockTimesDialogTexts = {
  title: 'Set times',
  from: 'From',
  to: 'To',
  hint: 'Typing the times is often quicker than dragging, and does not need the whole day on screen.',
  rangeError: 'The end has to be after the start.',
  cancel: 'Cancel',
  save: 'Set times'
}

const RO_RO: BlockTimesDialogTexts = {
  title: 'Setează orele',
  from: 'De la',
  to: 'Până la',
  hint: 'Scrisul orelor e adesea mai rapid decât trasul și nu cere toată ziua pe ecran.',
  rangeError: 'Sfârșitul trebuie să fie după început.',
  cancel: 'Renunță',
  save: 'Setează'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BlockTimesDialogProps {
  open: boolean
  /** The block's current times, or where a newly drawn one starts. */
  startTime: string
  endTime: string
  /** The semester's teaching hours, so the lists offer only times the grid draws. */
  dayStartHour: number
  dayEndHour: number
  onClose: () => void
  onSave: (startTime: string, endTime: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Sets a block's start and end by picking them, rather than by dragging its edges.
 *
 * Dragging is unusable for a long block on a short screen: the grid has to be scrolled to reach
 * the far edge, and the edge moves while scrolling. Typing the times has neither problem, and is
 * faster even when dragging would work.
 */
export default function BlockTimesDialog({
  open,
  startTime,
  endTime,
  dayStartHour,
  dayEndHour,
  onClose,
  onSave
}: BlockTimesDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(BlockTimesDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(BlockTimesDialog.name) as BlockTimesDialogTexts

  const [start, setStart] = useState(startTime)
  const [end, setEnd] = useState(endTime)

  // Reseeded whenever the dialog is opened on a different block — it stays mounted between them.
  useEffect(() => {
    if (!open) return
    setStart(startTime)
    setEnd(endTime)
  }, [open, startTime, endTime])

  // Every time the grid can actually show, on its own snap grid. Offering 03:00 when the teacher
  // works afternoons would be a list nobody can use.
  const options = useMemo(() => {
    const times: string[] = []
    for (
      let minute = dayStartHour * 60;
      minute <= dayEndHour * 60;
      minute += SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
    ) {
      times.push(formatMinutes(minute))
    }
    return times
  }, [dayStartHour, dayEndHour])

  const invalid = parseMinutes(end) <= parseMinutes(start)

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={t.title}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: t.cancel, onClick: onClose },
        {
          label: t.save,
          autoFocus: true,
          disabled: invalid,
          onClick: () => {
            onSave(start, end)
          }
        }
      ]}>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t.from}</InputLabel>
            <Select
              label={t.from}
              value={start}
              onChange={(e: SelectChangeEvent) => {
                setStart(e.target.value)
              }}>
              {options.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" error={invalid}>
            <InputLabel>{t.to}</InputLabel>
            <Select
              label={t.to}
              value={end}
              onChange={(e: SelectChangeEvent) => {
                setEnd(e.target.value)
              }}>
              {options.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Typography
          variant="caption"
          color={invalid ? 'error.main' : 'text.secondary'}
          display="block"
          sx={{ mt: 1 }}>
          {invalid ? t.rangeError : t.hint}
        </Typography>
      </DialogContent>
    </MultiActionDialog>
  )
}
