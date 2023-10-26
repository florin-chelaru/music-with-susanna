import { Box, ListItemButton, ListItemText, Typography, useTheme } from '@mui/material'
import { scrollToElement } from './util/window'
import { SupportedLocale } from './util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from './store/LocaleProvider'
import { useContext, useMemo } from 'react'

interface TocTexts {
  contents: string
}

const EN_US: TocTexts = {
  contents: 'Contents'
}

const RO_RO: TocTexts = {
  contents: 'Cuprins'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface TocEntry {
  key: string
  ref: React.RefObject<HTMLDivElement | null>
  primaryLabel?: string
  secondaryLabel?: string
}

export interface TableOfContentsProps {
  entries?: TocEntry[]
}
export default function TableOfContents({ entries = [] }: TableOfContentsProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(TableOfContents.name, TEXTS), [])
  const componentStrings = localeManager.componentStrings(TableOfContents.name) as TocTexts
  const theme = useTheme()
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          [theme.breakpoints.up('sm')]: {
            position: 'fixed',
            top: 64,
            maxHeight: '100vh',
            overflowY: 'auto',
            pt: 3
          }
        }}>
        <Typography variant="overline" sx={{ pl: 2 }}>
          <b>{componentStrings.contents}</b>
        </Typography>
        {entries.map((entry: TocEntry, i) => (
          <ListItemButton
            key={entry.key}
            sx={{ py: 0, minHeight: 32 }}
            onClick={() => scrollToElement(entry.ref?.current, 64)}>
            <ListItemText
              primary={entry.primaryLabel}
              secondary={entry.secondaryLabel}
              primaryTypographyProps={{ fontWeight: 'medium' }}
            />
          </ListItemButton>
        ))}
      </Box>
    </Box>
  )
}
