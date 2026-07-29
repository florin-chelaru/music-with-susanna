import {
  Checkbox,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from './MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource } from '../util/resources'

interface AddResourcesToStudentDialogTexts {
  addResources: string
  cancel: string
  save: string
}

const EN_US: AddResourcesToStudentDialogTexts = {
  addResources: 'Manage Shared Resources',
  cancel: 'Cancel',
  save: 'Save'
}

const RO_RO: AddResourcesToStudentDialogTexts = {
  addResources: 'Gestionează Resurse Partajate',
  cancel: 'Anulează',
  save: 'Salvează'
}

const ADD_RESOURCES_TO_STUDENT_DIALOG_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface AddResourcesToStudentDialogProps {
  open: boolean
  allResources: Resource[]
  sharedResourceIds: Set<string>
  onClose: () => void
  onConfirm: (selectedIds: Set<string>) => void
}

export default function AddResourcesToStudentDialog({
  open,
  allResources,
  sharedResourceIds,
  onClose,
  onConfirm
}: AddResourcesToStudentDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        AddResourcesToStudentDialog.name,
        ADD_RESOURCES_TO_STUDENT_DIALOG_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    AddResourcesToStudentDialog.name
  ) as AddResourcesToStudentDialogTexts

  const [selected, setSelected] = useState<Set<string>>(new Set(sharedResourceIds))

  useEffect(() => {
    if (open) setSelected(new Set(sharedResourceIds))
  }, [open])

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
    onConfirm(selected)
    onClose()
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={strings.addResources}
      fullWidth
      maxWidth="xs"
      actions={[
        { label: strings.cancel, onClick: onClose },
        { label: strings.save, onClick: handleConfirm, autoFocus: true }
      ]}>
      <DialogContent sx={{ pt: 0 }}>
        <List dense disablePadding>
          {allResources.map((resource) => (
            <ListItem key={resource.id} disablePadding>
              <ListItemButton onClick={() => handleToggle(resource.id)} dense>
                <Checkbox
                  edge="start"
                  checked={selected.has(resource.id)}
                  tabIndex={-1}
                  disableRipple
                  size="small"
                />
                <ListItemText primary={resource.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </MultiActionDialog>
  )
}
