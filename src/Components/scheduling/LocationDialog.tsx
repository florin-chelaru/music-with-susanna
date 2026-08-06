import { Box, DialogContent, TextField } from '@mui/material'
import { useContext, useMemo, useRef, useState } from 'react'
import MultiActionDialog from '../MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { Location } from '../../util/scheduling'

interface LocationDialogTexts {
  title: string
  editTitle: string
  name: string
  address: string
  cancel: string
  save: string
}

const EN_US: LocationDialogTexts = {
  title: 'Add Location',
  editTitle: 'Edit Location',
  name: 'Name',
  address: 'Address (optional)',
  cancel: 'Cancel',
  save: 'Save'
}

const RO_RO: LocationDialogTexts = {
  title: 'Adaugă locație',
  editTitle: 'Editează locație',
  name: 'Nume',
  address: 'Adresă (opțional)',
  cancel: 'Anulează',
  save: 'Salvează'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface LocationDialogProps {
  open: boolean
  initial?: Pick<Location, 'name' | 'address'>
  onClose: () => void
  onSave: (data: Pick<Location, 'name' | 'address'>) => void
}

export default function LocationDialog({ open, initial, onClose, onSave }: LocationDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(LocationDialog.name, TEXTS), [])
  const t = localeManager.componentStrings(LocationDialog.name) as LocationDialogTexts

  const formRef = useRef<HTMLFormElement>(null)
  const [nameError, setNameError] = useState(false)

  function handleSave() {
    formRef.current?.requestSubmit()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = (data.get('name') as string).trim()
    if (!name) {
      setNameError(true)
      return
    }
    setNameError(false)
    const address = (data.get('address') as string).trim() || undefined
    onSave({ name, address })
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={onClose}
      title={initial ? t.editTitle : t.title}
      actions={[
        { label: t.cancel, onClick: onClose },
        { label: t.save, onClick: handleSave }
      ]}>
      <DialogContent>
        <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
          <TextField
            name="name"
            label={t.name}
            defaultValue={initial?.name ?? ''}
            required
            fullWidth
            error={nameError}
            margin="normal"
            autoFocus
          />
          <TextField
            name="address"
            label={t.address}
            defaultValue={initial?.address ?? ''}
            fullWidth
            margin="normal"
          />
        </Box>
      </DialogContent>
    </MultiActionDialog>
  )
}
