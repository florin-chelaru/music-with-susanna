import EditIcon from '@mui/icons-material/Edit'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useContext, useMemo, useState } from 'react'
import {
  AnnouncementContext,
  AnnouncementData,
  AnnouncementHandler,
  HIDE_ANNOUNCEMENT_COOKIE
} from '../store/AnnouncementProvider'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { UserRole } from '../util/User'
import { SupportedLocale } from '../util/SupportedLocale'
import { useUser } from '../store/UserProvider'

export const userHidAnnouncement: () => boolean = () => {
  try {
    return localStorage.getItem(HIDE_ANNOUNCEMENT_COOKIE) === 'true'
  } catch (e) {
    console.error(
      `Could not load ${HIDE_ANNOUNCEMENT_COOKIE} preferences from localStorage. Details: ${
        (e as Error).message
      }`
    )
    return false
  }
}

interface AnnouncementTexts extends LocalizedData {
  editTooltip: string
  dialogTitle: string
  enTitleLabel: string
  enBodyLabel: string
  roTitleLabel: string
  roBodyLabel: string
  visibleLabel: string
  save: string
  cancel: string
  hiddenBadge: string
}

const EN_US: AnnouncementTexts = {
  editTooltip: 'Edit announcement',
  dialogTitle: 'Edit Announcement',
  enTitleLabel: 'English title',
  enBodyLabel: 'English body',
  roTitleLabel: 'Romanian title',
  roBodyLabel: 'Romanian body',
  visibleLabel: 'Show announcement to all visitors',
  save: 'Save',
  cancel: 'Cancel',
  hiddenBadge: 'hidden from public'
}

const RO_RO: AnnouncementTexts = {
  editTooltip: 'Editează anunțul',
  dialogTitle: 'Editează anunțul',
  enTitleLabel: 'Titlu în engleză',
  enBodyLabel: 'Text în engleză',
  roTitleLabel: 'Titlu în română',
  roBodyLabel: 'Text în română',
  visibleLabel: 'Arată anunțul tuturor vizitatorilor',
  save: 'Salvează',
  cancel: 'Anulează',
  hiddenBadge: 'ascuns publicului'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const EMPTY_LOCALE_DATA = { title: '', body: '' }

function EditDialog({
  open,
  initial,
  strings,
  onSave,
  onClose
}: {
  open: boolean
  initial: AnnouncementData
  strings: AnnouncementTexts
  onSave: (data: AnnouncementData) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AnnouncementData>(initial)

  const update = (path: string, value: string | boolean) => {
    if (path === 'visible') {
      setDraft((prev) => ({ ...prev, visible: value as boolean }))
    } else {
      const [locale, field] = path.split('.') as [SupportedLocale, 'title' | 'body']
      setDraft((prev) => ({
        ...prev,
        [locale]: { ...prev[locale], [field]: value }
      }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{strings.dialogTitle}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={draft.visible}
                onChange={(e) => update('visible', e.target.checked)}
              />
            }
            label={strings.visibleLabel}
          />
          <TextField
            label={strings.enTitleLabel}
            value={draft[SupportedLocale.EN_US]?.title ?? ''}
            onChange={(e) => update(`${SupportedLocale.EN_US}.title`, e.target.value)}
            fullWidth
            multiline
          />
          <TextField
            label={strings.enBodyLabel}
            value={draft[SupportedLocale.EN_US]?.body ?? ''}
            onChange={(e) => update(`${SupportedLocale.EN_US}.body`, e.target.value)}
            fullWidth
            multiline
          />
          <TextField
            label={strings.roTitleLabel}
            value={draft[SupportedLocale.RO_RO]?.title ?? ''}
            onChange={(e) => update(`${SupportedLocale.RO_RO}.title`, e.target.value)}
            fullWidth
            multiline
          />
          <TextField
            label={strings.roBodyLabel}
            value={draft[SupportedLocale.RO_RO]?.body ?? ''}
            onChange={(e) => update(`${SupportedLocale.RO_RO}.body`, e.target.value)}
            fullWidth
            multiline
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{strings.cancel}</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>
          {strings.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Announcement() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const { user } = useUser()
  const [editOpen, setEditOpen] = useState(false)

  useMemo(() => localeManager.registerComponentStrings(Announcement.name, TEXTS), [])

  const strings = localeManager.componentStrings(Announcement.name) as AnnouncementTexts
  const locale = localeManager.locale as SupportedLocale
  const isTeacher = user?.role === UserRole.TEACHER
  const { data } = announcementManager

  const localeData = data?.[locale] ?? EMPTY_LOCALE_DATA
  const isVisible = data?.visible ?? false

  const initialDraft: AnnouncementData = data ?? {
    visible: false,
    [SupportedLocale.EN_US]: EMPTY_LOCALE_DATA,
    [SupportedLocale.RO_RO]: EMPTY_LOCALE_DATA
  }

  const handleSave = async (updated: AnnouncementData) => {
    setEditOpen(false)
    await announcementManager.update(updated)
  }

  const editButton = isTeacher ? (
    <Tooltip title={strings.editTooltip}>
      <IconButton size="small" onClick={() => setEditOpen(true)} aria-label={strings.editTooltip}>
        <EditIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  ) : null

  return (
    <Grid2 container>
      <Grid2 xs={12}>
        <Alert
          severity={isTeacher && !isVisible ? 'warning' : 'info'}
          sx={{ borderRadius: 0 }}
          onClose={isTeacher ? undefined : () => announcementManager.hide()}
          action={
            isTeacher ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{editButton}</Box>
            ) : undefined
          }>
          <AlertTitle>
            {localeData.title}
            {isTeacher && !isVisible && (
              <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', opacity: 0.7 }}>
                ({strings.hiddenBadge})
              </Box>
            )}
          </AlertTitle>
          <Box
            component="span"
            dangerouslySetInnerHTML={{ __html: localeData.body }}
            sx={{ '& a': { color: 'inherit' } }}
          />
        </Alert>
      </Grid2>

      {isTeacher && (
        <EditDialog
          open={editOpen}
          initial={initialDraft}
          strings={strings}
          onSave={(d) => {
            void handleSave(d)
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </Grid2>
  )
}
