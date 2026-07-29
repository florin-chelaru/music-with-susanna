import AttachFileIcon from '@mui/icons-material/AttachFile'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  DialogContent,
  LinearProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import MultiActionDialog from './MultiActionDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { UploadConfirmData } from '../util/resources'
import { useYouTubeMetadata } from '../util/youtube'

interface ResourceUploadDialogTexts {
  addResource: string
  cancel: string
  upload: string
  type: string
  title: string
  titlePlaceholder: string
  tags: string
  tagsPlaceholder: string
  youtubeUrl: string
  youtubeUrlPlaceholder: string
  chooseFile: string
  noFileChosen: string
}

const EN_US: ResourceUploadDialogTexts = {
  addResource: 'Add Resource',
  cancel: 'Cancel',
  upload: 'Upload',
  type: 'Type',
  title: 'Title',
  titlePlaceholder: 'Resource title',
  tags: 'Tags',
  tagsPlaceholder: 'Add tags…',
  youtubeUrl: 'YouTube URL',
  youtubeUrlPlaceholder: 'https://www.youtube.com/watch?v=…',
  chooseFile: 'Choose file',
  noFileChosen: 'No file chosen'
}

const RO_RO: ResourceUploadDialogTexts = {
  addResource: 'Adaugă Resursă',
  cancel: 'Anulează',
  upload: 'Încarcă',
  type: 'Tip',
  title: 'Titlu',
  titlePlaceholder: 'Titlul resursei',
  tags: 'Etichete',
  tagsPlaceholder: 'Adaugă etichete…',
  youtubeUrl: 'URL YouTube',
  youtubeUrlPlaceholder: 'https://www.youtube.com/watch?v=…',
  chooseFile: 'Alege fișier',
  noFileChosen: 'Niciun fișier ales'
}

const RESOURCE_UPLOAD_DIALOG_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const FILE_ACCEPT = 'application/pdf,audio/*,image/*'

export type { UploadConfirmData }

export interface ResourceUploadDialogProps {
  open: boolean
  onClose: () => void
  existingTags: string[]
  onConfirm?: (data: UploadConfirmData) => void
}

export default function ResourceUploadDialog({
  open,
  onClose,
  existingTags,
  onConfirm
}: ResourceUploadDialogProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        ResourceUploadDialog.name,
        RESOURCE_UPLOAD_DIALOG_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    ResourceUploadDialog.name
  ) as ResourceUploadDialogTexts

  const { user } = useUser()

  const [mode, setMode] = useState<'file' | 'youtube'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: youtubeData, loading: youtubeLoading } = useYouTubeMetadata(
    mode === 'youtube' ? url : '',
    user?.accessToken
  )

  useEffect(() => {
    if (youtubeData) setTitle(youtubeData.snippet.title)
  }, [youtubeData])

  const handleModeChange = (_: React.MouseEvent, next: 'file' | 'youtube' | null) => {
    if (next) {
      setMode(next)
      setFile(null)
      setUrl('')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null
    setFile(picked)
    if (picked && !title) {
      setTitle(picked.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleClose = () => {
    setMode('file')
    setFile(null)
    setUrl('')
    setTitle('')
    setTags([])
    onClose()
  }

  const handleConfirm = () => {
    const tagsRecord: Record<string, string> = Object.fromEntries(
      tags.map((t) => [t.toLowerCase().replace(/\s+/g, '-'), t])
    )
    if (mode === 'youtube') {
      onConfirm?.({ mode: 'youtube', url, title, tags: tagsRecord })
    } else if (file) {
      onConfirm?.({ mode: 'file', file, title, tags: tagsRecord })
    } else {
      return
    }
    handleClose()
  }

  return (
    <MultiActionDialog
      open={open}
      onClose={handleClose}
      title={strings.addResource}
      fullWidth
      maxWidth="sm"
      actions={[
        { label: strings.cancel, onClick: handleClose },
        {
          label: strings.upload,
          onClick: handleConfirm
        }
      ]}>
      <DialogContent>
        <Stack spacing={2.5}>
          {/* Primary mode selector */}
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {strings.type}
            </Typography>
            <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small">
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

          {/* File picker or URL field */}
          {mode === 'youtube' ? (
            <TextField
              label={strings.youtubeUrl}
              placeholder={strings.youtubeUrlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              size="small"
            />
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInputRef.current?.click()}>
                {strings.chooseFile}
              </Button>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {file ? file.name : strings.noFileChosen}
              </Typography>
            </Stack>
          )}

          {/* YouTube preview */}
          {mode === 'youtube' && (youtubeLoading || youtubeData) && (
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

          {/* Title */}
          <TextField
            label={strings.title}
            placeholder={strings.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
          />

          {/* Tags */}
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
