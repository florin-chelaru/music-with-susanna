import { Box, ListItemButton, ListItemText, Typography, useTheme } from '@mui/material'
import { scrollToElement } from './util/window'

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
          <b>Contents</b>
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
