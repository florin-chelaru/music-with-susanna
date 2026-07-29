import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Collapse,
  Stack,
  Typography
} from '@mui/material'
import { useContext, useMemo } from 'react'
import ExpandMoreButton from './ExpandMoreButton'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, ResourceType } from '../util/resources'

interface ResourceCardTexts {
  edit: string
  delete: string
  details: string
  openInNewTab: string
  remove: string
}

const EN_US: ResourceCardTexts = {
  edit: 'Edit',
  delete: 'Delete',
  details: 'Details',
  openInNewTab: 'Open in new tab',
  remove: 'Remove from student'
}

const RO_RO: ResourceCardTexts = {
  edit: 'Editează',
  delete: 'Șterge',
  details: 'Detalii',
  openInNewTab: 'Deschide în tab nou',
  remove: 'Elimină de la student'
}

const RESOURCE_CARD_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

function typeIcon(type: ResourceType) {
  switch (type) {
    case ResourceType.PDF:
      return <PictureAsPdfIcon color="error" />
    case ResourceType.AUDIO:
      return <AudiotrackIcon color="primary" />
    case ResourceType.IMAGE:
      return <ImageIcon color="success" />
    case ResourceType.YOUTUBE:
      return <YouTubeIcon sx={{ color: '#FF0000' }} />
  }
}

function toYouTubeEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    let videoId: string | null = null
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1)
    } else if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v')
      } else if (urlObj.pathname.startsWith('/embed/')) {
        return url
      }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  } catch {
    return null
  }
}

function ResourcePreview({ resource }: { resource: Resource }) {
  if (!resource.url) return null

  switch (resource.type) {
    case ResourceType.AUDIO:
      return (
        <Box component="audio" controls sx={{ width: '100%', mt: 1.5, display: 'block' }}>
          <source src={resource.url} />
        </Box>
      )
    case ResourceType.PDF:
      return (
        <Box
          component="object"
          data={resource.url}
          type="application/pdf"
          sx={{ width: '100%', height: 500, mt: 1.5, display: 'block' }}>
          <Typography variant="body2" color="text.secondary">
            <a href={resource.url} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </Typography>
        </Box>
      )
    case ResourceType.IMAGE:
      return (
        <Box
          component="img"
          src={resource.url}
          alt={resource.title}
          sx={{ width: '100%', mt: 1.5, display: 'block', borderRadius: 1 }}
        />
      )
    case ResourceType.YOUTUBE: {
      const embedUrl = toYouTubeEmbedUrl(resource.url)
      if (!embedUrl) return null
      return (
        <Box
          component="iframe"
          src={embedUrl}
          title={resource.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sx={{ width: '100%', height: 360, mt: 1.5, display: 'block', border: 'none' }}
        />
      )
    }
  }
}

export interface ResourceCardProps {
  resource: Resource
  /** When true, shows edit/delete/details actions. When false, shows only open-in-new-tab. */
  editable?: boolean
  /** When set, shows a remove button (used in the per-student teacher view). */
  onRemove?: (resource: Resource) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onEdit?: (resource: Resource) => void
  onDelete?: (resource: Resource) => void
  /** When provided, shows a Details button in editable mode. Omit to hide it. */
  onDetails?: (resource: Resource) => void
}

export default function ResourceCard({
  resource,
  editable = false,
  onRemove,
  expanded,
  onExpandedChange,
  onEdit,
  onDelete,
  onDetails
}: ResourceCardProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(ResourceCard.name, RESOURCE_CARD_TEXTS), [])
  const strings = localeManager.componentStrings(ResourceCard.name) as ResourceCardTexts

  const tags = Object.values(resource.tags)
  const hasPreview = Boolean(resource.url)

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Stack sx={{ pt: 0.25, flexShrink: 0 }}>{typeIcon(resource.type)}</Stack>
          <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
                {resource.title}
              </Typography>
              {resource.createdAt && (
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {localeManager.formatLongDate(resource.createdAt, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              )}
            </Stack>
            {tags.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardContent>

      {hasPreview && (
        <Collapse in={expanded} timeout="auto">
          <CardContent sx={{ pt: 0 }}>
            <ResourcePreview resource={resource} />
          </CardContent>
        </Collapse>
      )}

      <CardActions sx={{ pt: 0 }}>
        {editable ? (
          <>
            <Button size="small" onClick={() => onEdit?.(resource)}>
              {strings.edit}
            </Button>
            <Button size="small" onClick={() => onDelete?.(resource)}>
              {strings.delete}
            </Button>
            {onDetails && (
              <Button size="small" onClick={() => onDetails(resource)}>
                {strings.details}
              </Button>
            )}
          </>
        ) : onRemove ? (
          <Button size="small" onClick={() => onRemove(resource)}>
            {strings.remove}
          </Button>
        ) : (
          resource.url && (
            <Button size="small" component="a" href={resource.url} target="_blank" rel="noreferrer">
              {strings.openInNewTab}
            </Button>
          )
        )}
        {hasPreview && (
          <Box sx={{ ml: 'auto' }}>
            <ExpandMoreButton
              expand={expanded}
              onClick={() => onExpandedChange(!expanded)}
              aria-expanded={expanded}
              aria-label="show preview">
              <ExpandMoreIcon />
            </ExpandMoreButton>
          </Box>
        )}
      </CardActions>
    </Card>
  )
}
