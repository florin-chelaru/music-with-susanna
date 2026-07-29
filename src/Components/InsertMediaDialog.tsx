import AttachFileIcon from '@mui/icons-material/AttachFile'
import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  DialogContent,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, ResourceType, UploadConfirmData } from '../util/resources'
import { useYouTubeMetadata } from '../util/youtube'
import MultiActionDialog from './MultiActionDialog'
import ResourceTagFilter from './ResourceTagFilter'

interface InsertMediaDialogTexts {
  title: string
  tabLibrary: string
  tabUpload: string
  close: string
  insert: string
  noResults: string
  sortBy: string
  sortName: string
  sortDateNewest: string
  sortDateOldest: string
  upload: string
  type: string
  resourceTitle: string
  resourceTitlePlaceholder: string
  tags: string
  tagsPlaceholder: string
  youtubeUrl: string
  youtubeUrlPlaceholder: string
  chooseFile: string
  noFileChosen: string
}

const EN_US: InsertMediaDialogTexts = {
  title: 'Insert Media',
  tabLibrary: 'Library',
  tabUpload: 'New Resource',
  close: 'Close',
  insert: 'Insert',
  noResults: 'No resources match your search.',
  sortBy: 'Sort',
  sortName: 'Name',
  sortDateNewest: 'Newest first',
  sortDateOldest: 'Oldest first',
  upload: 'Upload',
  type: 'Type',
  resourceTitle: 'Title',
  resourceTitlePlaceholder: 'Resource title',
  tags: 'Tags',
  tagsPlaceholder: 'Add tags…',
  youtubeUrl: 'YouTube URL',
  youtubeUrlPlaceholder: 'https://www.youtube.com/watch?v=…',
  chooseFile: 'Choose file',
  noFileChosen: 'No file chosen'
}

const RO_RO: InsertMediaDialogTexts = {
  title: 'Inserează Media',
  tabLibrary: 'Bibliotecă',
  tabUpload: 'Resursă Nouă',
  close: 'Închide',
  insert: 'Inserează',
  noResults: 'Nicio resursă nu corespunde căutării.',
  sortBy: 'Sortare',
  sortName: 'Nume',
  sortDateNewest: 'Recente',
  sortDateOldest: 'Vechi',
  upload: 'Încarcă',
  type: 'Tip',
  resourceTitle: 'Titlu',
  resourceTitlePlaceholder: 'Titlul resursei',
  tags: 'Etichete',
  tagsPlaceholder: 'Adaugă etichete…',
  youtubeUrl: 'URL YouTube',
  youtubeUrlPlaceholder: 'https://www.youtube.com/watch?v=…',
  chooseFile: 'Alege fișier',
  noFileChosen: 'Niciun fișier ales'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

type SortOption = 'name' | 'date-desc' | 'date-asc'

const FILE_ACCEPT = 'application/pdf,audio/*,image/*'

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

export interface InsertMediaDialogProps {
  open: boolean
  resources: Resource[]
  onClose: () => void
  onInsert: (resource: Resource) => void
  onUpload: (data: UploadConfirmData) => void
}

export default function InsertMediaDialog({
  open,
  resources,
  onClose,
  onInsert,
  onUpload
}: InsertMediaDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(InsertMediaDialog.name, TEXTS), [])
  const strings = localeManager.componentStrings(InsertMediaDialog.name) as InsertMediaDialogTexts

  const [tab, setTab] = useState(0)

  // Library tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  // Upload tab state
  const [uploadMode, setUploadMode] = useState<'file' | 'youtube'>('file')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const uploadFileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useUser()
  const { data: youtubeData, loading: youtubeLoading } = useYouTubeMetadata(
    uploadMode === 'youtube' ? uploadUrl : '',
    user?.accessToken
  )

  useEffect(() => {
    if (youtubeData) setUploadTitle(youtubeData.snippet.title)
  }, [youtubeData])

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

  const visibleResources = useMemo(() => {
    const filtered = resources.filter((r) => {
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
        return false
      return true
    })
    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      if (sortBy === 'date-desc')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [resources, searchQuery, selectedTags, sortBy])

  const resetUploadForm = () => {
    setUploadMode('file')
    setUploadFile(null)
    setUploadUrl('')
    setUploadTitle('')
    setUploadTags([])
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedTags(new Set())
    setTab(0)
    resetUploadForm()
    onClose()
  }

  const handleUploadModeChange = (_: React.MouseEvent, next: 'file' | 'youtube' | null) => {
    if (next) {
      setUploadMode(next)
      setUploadFile(null)
      setUploadUrl('')
    }
  }

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null
    setUploadFile(picked)
    if (picked && !uploadTitle) setUploadTitle(picked.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = () => {
    const tagsRecord: Record<string, string> = Object.fromEntries(
      uploadTags.map((t) => [t.toLowerCase().replace(/\s+/g, '-'), t])
    )
    let data: UploadConfirmData
    if (uploadMode === 'youtube') {
      data = { mode: 'youtube', url: uploadUrl, title: uploadTitle, tags: tagsRecord }
    } else if (uploadFile) {
      data = { mode: 'file', file: uploadFile, title: uploadTitle, tags: tagsRecord }
    } else {
      return
    }
    onUpload(data)
    handleClose()
  }

  const actions =
    tab === 0
      ? [{ label: strings.close, onClick: handleClose }]
      : [
          {
            label: strings.close,
            onClick: () => {
              resetUploadForm()
              setTab(0)
            }
          },
          { label: strings.upload, onClick: handleUpload }
        ]

  return (
    <MultiActionDialog
      open={open}
      onClose={handleClose}
      title={strings.title}
      fullWidth
      maxWidth="sm"
      actions={actions}>
      <DialogContent sx={{ pt: 0 }}>
        <Tabs value={tab} onChange={(_event, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={strings.tabLibrary} />
          <Tab label={strings.tabUpload} />
        </Tabs>

        {tab === 0 && (
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" component="span">
                {strings.sortBy}
              </Typography>
              <Select
                size="small"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                sx={{ fontSize: '0.8125rem' }}>
                <MenuItem value="name">{strings.sortName}</MenuItem>
                <MenuItem value="date-desc">{strings.sortDateNewest}</MenuItem>
                <MenuItem value="date-asc">{strings.sortDateOldest}</MenuItem>
              </Select>
            </Box>
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
                    divider
                    alignItems="flex-start"
                    secondaryAction={
                      <Button size="small" variant="outlined" onClick={() => onInsert(resource)}>
                        {strings.insert}
                      </Button>
                    }>
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      {typeIcon(resource.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={resource.title}
                      secondaryTypographyProps={{ component: 'div' } as any}
                      secondary={
                        <>
                          <Typography variant="caption" component="span" color="text.secondary">
                            {resource.createdAt
                              ? localeManager.formatLongDate(resource.createdAt, {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : '—'}
                          </Typography>
                          {Object.entries(resource.tags).length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {Object.entries(resource.tags).map(([slug, label]) => (
                                <Chip key={slug} size="small" label={label} />
                              ))}
                            </Box>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2.5}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {strings.type}
              </Typography>
              <ToggleButtonGroup
                value={uploadMode}
                exclusive
                onChange={handleUploadModeChange}
                size="small">
                <ToggleButton value="file" aria-label="Upload file">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <UploadFileIcon fontSize="small" />
                    <Typography variant="body2">{strings.chooseFile}</Typography>
                  </Stack>
                </ToggleButton>
                <ToggleButton value="youtube" aria-label="YouTube">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <YouTubeIcon fontSize="small" />
                    <Typography variant="body2">YouTube</Typography>
                  </Stack>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {uploadMode === 'youtube' ? (
              <TextField
                label={strings.youtubeUrl}
                placeholder={strings.youtubeUrlPlaceholder}
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                fullWidth
                size="small"
              />
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  style={{ display: 'none' }}
                  onChange={handleUploadFileChange}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFileIcon />}
                  onClick={() => uploadFileInputRef.current?.click()}>
                  {strings.chooseFile}
                </Button>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                  {uploadFile ? uploadFile.name : strings.noFileChosen}
                </Typography>
              </Stack>
            )}

            {uploadMode === 'youtube' && (youtubeLoading || youtubeData) && (
              <Box
                sx={{
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                {youtubeLoading && <LinearProgress />}
                {youtubeData && (
                  <>
                    <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                      <Box
                        component="iframe"
                        src={`https://www.youtube.com/embed/${youtubeData.videoId}`}
                        title={youtubeData.snippet.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 0
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ px: 1.5, py: 1 }}>
                      {youtubeData.snippet.title}
                    </Typography>
                  </>
                )}
              </Box>
            )}

            <TextField
              label={strings.resourceTitle}
              placeholder={strings.resourceTitlePlaceholder}
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              fullWidth
              size="small"
            />

            <Autocomplete
              multiple
              freeSolo
              options={allTags.map((t) => t.label)}
              value={uploadTags}
              onChange={(_, v) => setUploadTags(v)}
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
                  placeholder={uploadTags.length === 0 ? strings.tagsPlaceholder : undefined}
                  size="small"
                />
              )}
            />
          </Stack>
        )}
      </DialogContent>
    </MultiActionDialog>
  )
}
