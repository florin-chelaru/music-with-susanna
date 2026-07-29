import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ClearIcon from '@mui/icons-material/Clear'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import SearchIcon from '@mui/icons-material/Search'
import YouTubeIcon from '@mui/icons-material/YouTube'
import { Chip, IconButton, InputAdornment, Stack, TextField } from '@mui/material'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { ResourceType } from '../util/resources'

interface ResourceTagFilterTexts {
  searchPlaceholder: string
  all: string
  typePdf: string
  typeAudio: string
  typeImage: string
  typeYoutube: string
}

const EN_US: ResourceTagFilterTexts = {
  searchPlaceholder: 'Search resources…',
  all: 'All',
  typePdf: 'PDF',
  typeAudio: 'Audio',
  typeImage: 'Image',
  typeYoutube: 'YouTube'
}

const RO_RO: ResourceTagFilterTexts = {
  searchPlaceholder: 'Caută resurse…',
  all: 'Toate',
  typePdf: 'PDF',
  typeAudio: 'Audio',
  typeImage: 'Imagine',
  typeYoutube: 'YouTube'
}

const RESOURCE_TAG_FILTER_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface ResourceTagFilterProps {
  tags: Array<{ slug: string; label: string }>
  searchQuery: string
  selectedTags: Set<string>
  selectedTypes?: Set<ResourceType>
  onSearchChange: (query: string) => void
  onTagToggle: (slug: string) => void
  onTypeToggle?: (type: ResourceType) => void
}

export default function ResourceTagFilter({
  tags,
  searchQuery,
  selectedTags,
  selectedTypes,
  onSearchChange,
  onTagToggle,
  onTypeToggle
}: ResourceTagFilterProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () => localeManager.registerComponentStrings(ResourceTagFilter.name, RESOURCE_TAG_FILTER_TEXTS),
    []
  )
  const strings = localeManager.componentStrings(ResourceTagFilter.name) as ResourceTagFilterTexts

  const allSelected = selectedTags.size === 0 && (selectedTypes?.size ?? 0) === 0

  const handleAllClick = () => {
    selectedTags.forEach((slug) => onTagToggle(slug))
    selectedTypes?.forEach((type) => onTypeToggle?.(type))
  }

  const typeChips = [
    {
      type: ResourceType.YOUTUBE,
      label: strings.typeYoutube,
      icon: <YouTubeIcon fontSize="small" />
    },
    { type: ResourceType.PDF, label: strings.typePdf, icon: <PictureAsPdfIcon fontSize="small" /> },
    { type: ResourceType.IMAGE, label: strings.typeImage, icon: <ImageIcon fontSize="small" /> },
    {
      type: ResourceType.AUDIO,
      label: strings.typeAudio,
      icon: <AudiotrackIcon fontSize="small" />
    }
  ]

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        placeholder={strings.searchPlaceholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onSearchChange('')} edge="end">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null
        }}
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <Chip
          label={strings.all}
          size="small"
          color={allSelected ? 'primary' : 'default'}
          variant={allSelected ? 'filled' : 'outlined'}
          onClick={handleAllClick}
        />
        {typeChips.map(({ type, label, icon }) => {
          const selected = selectedTypes?.has(type) ?? false
          return (
            <Chip
              key={type}
              icon={icon}
              label={label}
              size="small"
              color={selected ? 'secondary' : 'default'}
              variant="filled"
              onClick={() => onTypeToggle?.(type)}
            />
          )
        })}
        {tags.map(({ slug, label }) => {
          const selected = selectedTags.has(slug)
          return (
            <Chip
              key={slug}
              label={label}
              size="small"
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onTagToggle(slug)}
            />
          )
        })}
      </Stack>
    </Stack>
  )
}
