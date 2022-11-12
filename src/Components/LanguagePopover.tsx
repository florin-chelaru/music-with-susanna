import React, { useContext, useRef, useState } from 'react'
// material
import { alpha } from '@mui/material/styles'
import { Box, IconButton, MenuItem, Stack } from '@mui/material'
// components
import MenuPopover from './MenuPopover'
import LocaleInfo from '../util/LocaleInfo'
import LanguageIcon from '@mui/icons-material/Language'
import { LocaleHandler, LocaleContext } from '../store/LocaleProvider'

// ----------------------------------------------------------------------

interface LanguagePopoverProps {
  languages: LocaleInfo[]
  onChange?: (language: LocaleInfo) => void
}

export default function LanguagePopover({ languages, onChange }: LanguagePopoverProps) {
  const anchorRef = useRef(null)
  const [open, setOpen] = useState(false)

  const languageHandler = useContext<LocaleHandler>(LocaleContext)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          padding: 0,
          width: 44,
          height: 44,
          ...(open && {
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity)
          })
        }}>
        <LanguageIcon sx={{ color: '#fff' }} />
      </IconButton>

      <MenuPopover
        open={open}
        onClose={handleClose}
        anchorEl={anchorRef.current}
        sx={{
          mt: 1.5,
          ml: 0.75,
          width: 180,
          '& .MuiMenuItem-root': { px: 1, typography: 'body2', borderRadius: 0.75 }
        }}>
        <Stack spacing={0.75}>
          {languages.map((lang) => (
            <MenuItem
              key={lang.locale}
              selected={lang.locale === languageHandler.locale}
              onClick={() => {
                onChange?.(lang)
                handleClose()
              }}>
              <Box component="img" alt={lang.label} src={lang.icon} sx={{ width: 28, mr: 2 }} />

              {lang.label}
            </MenuItem>
          ))}
        </Stack>
      </MenuPopover>
    </>
  )
}
