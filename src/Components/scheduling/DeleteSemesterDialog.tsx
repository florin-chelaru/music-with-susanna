import { Alert, DialogContent, Stack, Typography } from '@mui/material'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { Semester } from '../../util/scheduling'
import { countSemesterContents, SemesterContents } from '../../util/schedulingWrites'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface DeleteSemesterDialogTexts {
  title: string
  body: (name: string) => string
  students: (count: number) => string
  lessons: (count: number) => string
  rounds: (count: number) => string
  empty: string
  warning: string
  accountsKept: string
  cancel: string
  confirm: string
}

const EN_US: DeleteSemesterDialogTexts = {
  title: 'Delete semester',
  body: (name) => `Deleting ${name} also removes everything in it:`,
  students: (count) => `${count} enrollments`,
  lessons: (count) => `${count} lessons`,
  rounds: (count) => `${count} scheduling rounds`,
  empty: 'Nothing has been scheduled in it yet.',
  warning: 'Students lose these lessons from their own calendars. This cannot be undone here.',
  accountsKept:
    'Their accounts are not affected, and neither are their lessons in other semesters.',
  cancel: 'Keep semester',
  confirm: 'Delete semester'
}

const RO_RO: DeleteSemesterDialogTexts = {
  title: 'Șterge semestrul',
  body: (name) => `Ștergerea semestrului ${name} elimină și tot ce conține:`,
  students: (count) => `${count} înscrieri`,
  lessons: (count) => `${count} lecții`,
  rounds: (count) => `${count} runde de programare`,
  empty: 'Nu s-a programat nimic în el încă.',
  warning:
    'Elevii pierd aceste lecții din propriile calendare. Operația nu poate fi anulată de aici.',
  accountsKept: 'Conturile lor nu sunt afectate, nici lecțiile din alte semestre.',
  cancel: 'Păstrează semestrul',
  confirm: 'Șterge semestrul'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DeleteSemesterDialogProps {
  open: boolean
  teacherId: string
  semester: Semester | null
  onClose: () => void
  onConfirm: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Confirms deleting a semester, naming what goes with it.
 *
 * The counts are read live rather than estimated. "Delete this semester?" is a question nobody
 * can answer safely; "this removes 7 students and 94 lessons" is.
 */
export default function DeleteSemesterDialog({
  open,
  teacherId,
  semester,
  onClose,
  onConfirm
}: DeleteSemesterDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(DeleteSemesterDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(DeleteSemesterDialog.name) as DeleteSemesterDialogTexts

  const [contents, setContents] = useState<SemesterContents | null>(null)

  useEffect(() => {
    if (!open || !semester) return
    setContents(null)
    let cancelled = false
    void countSemesterContents(teacherId, semester.id).then((result) => {
      if (!cancelled) setContents(result)
    })
    return () => {
      cancelled = true
    }
  }, [open, semester, teacherId])

  if (!semester) return null

  const lines = contents
    ? [
        { key: 'students', value: contents.students, label: t.students },
        { key: 'lessons', value: contents.lessons, label: t.lessons },
        { key: 'rounds', value: contents.rounds, label: t.rounds }
      ].filter((line) => line.value > 0)
    : []

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={t.title}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: t.cancel, onClick: onClose },
        // Not autoFocus: the destructive action should not be one stray Enter away.
        { label: t.confirm, onClick: onConfirm, disabled: contents === null }
      ]}>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t.body(semester.name)}
        </Typography>
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          {lines.map((line) => (
            <Typography key={line.key} variant="body2" fontWeight={600}>
              {line.label(line.value)}
            </Typography>
          ))}
          {contents && lines.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t.empty}
            </Typography>
          )}
        </Stack>
        <Alert severity="warning">{t.warning}</Alert>
        {/* Said plainly because "7 enrollments" still reads, at a glance, like seven students
            are about to be deleted. Nothing outside this semester is touched. */}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {t.accountsKept}
        </Typography>
      </DialogContent>
    </MultiActionDialog>
  )
}
