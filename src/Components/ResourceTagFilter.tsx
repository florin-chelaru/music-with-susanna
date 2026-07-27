import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import { Chip, IconButton, InputAdornment, Stack, TextField } from '@mui/material'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'

interface ResourceTagFilterTexts {
  searchPlaceholder: string
  all: string
}

const EN_US: ResourceTagFilterTexts = {
  searchPlaceholder: 'Search resources…',
  all: 'All'
}

const RO_RO: ResourceTagFilterTexts = {
  searchPlaceholder: 'Caută resurse…',
  all: 'Toate'
}

const RESOURCE_TAG_FILTER_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface ResourceTagFilterProps {
  tags: Array<{ slug: string; label: string }>
  searchQuery: string
  selectedTags: Set<string>
  onSearchChange: (query: string) => void
  onTagToggle: (slug: string) => void
}

export default function ResourceTagFilter({
  tags,
  searchQuery,
  selectedTags,
  onSearchChange,
  onTagToggle
}: ResourceTagFilterProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () => localeManager.registerComponentStrings(ResourceTagFilter.name, RESOURCE_TAG_FILTER_TEXTS),
    []
  )
  const strings = localeManager.componentStrings(ResourceTagFilter.name) as ResourceTagFilterTexts

  const allSelected = selectedTags.size === 0

  const handleAllClick = () => {
    selectedTags.forEach((slug) => onTagToggle(slug))
  }

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
