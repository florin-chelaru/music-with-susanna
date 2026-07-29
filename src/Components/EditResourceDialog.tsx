import { Autocomplete, Chip, DialogContent, Stack, TextField, Typography } from '@mui/material'
import { useContext, useEffect, useMemo, useState } from 'react'
import MultiActionDialog from './MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource } from '../util/resources'

interface EditResourceDialogTexts {
  editResource: string
  cancel: string
  save: string
  title: string
  titlePlaceholder: string
  tags: string
  tagsPlaceholder: string
}

const EN_US: EditResourceDialogTexts = {
  editResource: 'Edit Resource',
  cancel: 'Cancel',
  save: 'Save',
  title: 'Title',
  titlePlaceholder: 'Resource title',
  tags: 'Tags',
  tagsPlaceholder: 'Add tags…'
}

const RO_RO: EditResourceDialogTexts = {
  editResource: 'Editează Resursă',
  cancel: 'Anulează',
  save: 'Salvează',
  title: 'Titlu',
  titlePlaceholder: 'Titlul resursei',
  tags: 'Etichete',
  tagsPlaceholder: 'Adaugă etichete…'
}

const EDIT_RESOURCE_DIALOG_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface EditResourceDialogProps {
  open: boolean
  resource: Resource | null
  existingTags: string[]
  onClose: () => void
  onConfirm: (patch: { title: string; tags: Record<string, string> }) => void
}

export default function EditResourceDialog({
  open,
  resource,
  existingTags,
  onClose,
  onConfirm
}: EditResourceDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(EditResourceDialog.name, EDIT_RESOURCE_DIALOG_TEXTS),
    []
  )
  const strings = localeManager.componentStrings(EditResourceDialog.name) as EditResourceDialogTexts

  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (open && resource) {
      setTitle(resource.title)
      setTags(Object.values(resource.tags))
    }
  }, [open])

  const handleConfirm = () => {
    const tagsRecord: Record<string, string> = Object.fromEntries(
      tags.map((t) => [t.toLowerCase().replace(/\s+/g, '-'), t])
    )
    onConfirm({ title, tags: tagsRecord })
    onClose()
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={strings.editResource}
      fullWidth
      maxWidth="sm"
      actions={[
        { label: strings.cancel, onClick: onClose },
        { label: strings.save, onClick: handleConfirm, autoFocus: true }
      ]}>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label={strings.title}
            placeholder={strings.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
          />
          <Autocomplete
            multiple
            freeSolo
            options={existingTags}
            value={tags}
            onChange={(_, v) => setTags(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index })
                return <Chip key={key} label={option} size="small" {...tagProps} />
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={strings.tags}
                placeholder={tags.length === 0 ? strings.tagsPlaceholder : undefined}
                size="small"
              />
            )}
          />
        </Stack>
      </DialogContent>
    </MultiActionDialog>
  )
}
