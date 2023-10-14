import React, { useContext, useRef, useState } from 'react'
// material
import { alpha } from '@mui/material/styles'
import { IconButton, ListItemIcon, ListItemText, MenuItem, Stack } from '@mui/material'
// components
import MenuPopover from './MenuPopover'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import PersonIcon from '@mui/icons-material/Person'
import LoginIcon from '@mui/icons-material/Login'
import { useNavigate } from 'react-router-dom'
import { scrollToTop } from '../util/window'

interface UserPopoverProps {}

export default function UserPopover({}: UserPopoverProps) {
  const anchorRef = useRef(null)
  const [open, setOpen] = useState(false)

  const localeManager = useContext<LocaleHandler>(LocaleContext)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const navigate = useNavigate()

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
        <PersonIcon />
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
          <MenuItem
            onClick={() => {
              handleClose()
              navigate('/login')
              scrollToTop()
            }}>
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Login</ListItemText>
          </MenuItem>
        </Stack>
      </MenuPopover>
    </>
  )
}
