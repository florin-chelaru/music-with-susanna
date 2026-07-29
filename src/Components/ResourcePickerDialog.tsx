import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Button,
  DialogContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack
} from '@mui/material'
import { useContext, useMemo, useState } from 'react'
import MultiActionDialog from './MultiActionDialog'
import ResourceTagFilter from './ResourceTagFilter'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, ResourceType } from '../util/resources'

interface ResourcePickerDialogTexts {
  insertFromLibrary: string
  close: string
  insert: string
  noResults: string
}

const EN_US: ResourcePickerDialogTexts = {
  insertFromLibrary: 'Insert from Library',
  close: 'Close',
  insert: 'Insert',
  noResults: 'No resources match your search.'
}

const RO_RO: ResourcePickerDialogTexts = {
  insertFromLibrary: 'Inserează din Bibliotecă',
  close: 'Închide',
  insert: 'Inserează',
  noResults: 'Nicio resursă nu corespunde căutării.'
}

const RESOURCE_PICKER_DIALOG_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

function typeIcon(type: ResourceType) {
  switch (type) {
    case ResourceType.PDF:
      return <PictureAsPdfIcon color="error" fontSize="small" />
    case ResourceType.AUDIO:
      return <AudiotrackIcon color="primary" fontSize="small" />
    case ResourceType.IMAGE:
      return <ImageIcon color="success" fontSize="small" />
    case ResourceType.YOUTUBE:
      return <YouTubeIcon sx={{ color: '#FF0000' }} fontSize="small" />
  }
}

export interface ResourcePickerDialogProps {
  open: boolean
  resources: Resource[]
  onClose: () => void
  onInsert: (resource: Resource) => void
}

export default function ResourcePickerDialog({
  open,
  resources,
  onClose,
  onInsert
}: ResourcePickerDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        ResourcePickerDialog.name,
        RESOURCE_PICKER_DIALOG_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    ResourcePickerDialog.name
  ) as ResourcePickerDialogTexts

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ slug: string; label: string }> = []
    for (const r of resources) {
      for (const [slug, label] of Object.entries(r.tags)) {
        if (!seen.has(slug)) {
          seen.add(slug)
          result.push({ slug, label })
        }
      }
    }
    return result
  }, [resources])

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const visibleResources = resources.filter((r) => {
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
      return false
    return true
  })

  const handleClose = () => {
    setSearchQuery('')
    setSelectedTags(new Set())
    onClose()
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={handleClose}
      title={strings.insertFromLibrary}
      fullWidth
      maxWidth="sm"
      actions={[{ label: strings.close, onClick: handleClose }]}>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={1.5}>
          <ResourceTagFilter
            tags={allTags}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onSearchChange={setSearchQuery}
            onTagToggle={handleTagToggle}
          />
          <Divider />
          <List dense disablePadding>
            {visibleResources.length === 0 ? (
              <ListItem>
                <ListItemText secondary={strings.noResults} />
              </ListItem>
            ) : (
              visibleResources.map((resource) => (
                <ListItem
                  key={resource.id}
                  secondaryAction={
                    <Button size="small" variant="outlined" onClick={() => onInsert(resource)}>
                      {strings.insert}
                    </Button>
                  }>
                  <ListItemIcon sx={{ minWidth: 36 }}>{typeIcon(resource.type)}</ListItemIcon>
                  <ListItemText
                    primary={resource.title}
                    secondary={Object.values(resource.tags).join(', ') || undefined}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Stack>
      </DialogContent>
    </MultiActionDialog>
  )
}
