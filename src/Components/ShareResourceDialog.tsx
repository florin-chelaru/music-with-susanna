import {
  Checkbox,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from './MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource } from '../util/resources'

interface ShareResourceDialogTexts {
  shareResource: string
  cancel: string
  share: string
}

const EN_US: ShareResourceDialogTexts = {
  shareResource: 'Share Resource',
  cancel: 'Cancel',
  share: 'Share'
}

const RO_RO: ShareResourceDialogTexts = {
  shareResource: 'Partajează Resursă',
  cancel: 'Anulează',
  share: 'Partajează'
}

const SHARE_RESOURCE_DIALOG_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface MockStudent {
  id: string
  name: string
}

export interface ShareResourceDialogProps {
  open: boolean
  resource: Resource | null
  students: MockStudent[]
  sharedWithIds: Set<string>
  onClose: () => void
  onConfirm: (resourceId: string, selectedIds: Set<string>) => void
}

export default function ShareResourceDialog({
  open,
  resource,
  students,
  sharedWithIds,
  onClose,
  onConfirm
}: ShareResourceDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(ShareResourceDialog.name, SHARE_RESOURCE_DIALOG_TEXTS),
    []
  )
  const strings = localeManager.componentStrings(
    ShareResourceDialog.name
  ) as ShareResourceDialogTexts

  const [selected, setSelected] = useState<Set<string>>(new Set(sharedWithIds))

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (resource) onConfirm(resource.id, selected)
    onClose()
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={strings.shareResource}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: strings.cancel, onClick: onClose },
        { label: strings.share, onClick: handleConfirm, autoFocus: true }
      ]}>
      <DialogContent sx={{ pt: 0 }}>
        <List dense disablePadding>
          {students.map((student) => (
            <ListItem key={student.id} disablePadding>
              <ListItemButton onClick={() => handleToggle(student.id)} dense>
                <Checkbox
                  edge="start"
                  checked={selected.has(student.id)}
                  tabIndex={-1}
                  disableRipple
                  size="small"
                />
                <ListItemText primary={student.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </MultiActionDialog>
  )
}
