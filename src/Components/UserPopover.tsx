import React, { useContext, useRef, useState } from 'react'
// material
import { alpha } from '@mui/material/styles'
import { Button, IconButton, ListItemIcon, ListItemText, MenuItem, Stack } from '@mui/material'
// components
import MenuPopover from './MenuPopover'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import PersonIcon from '@mui/icons-material/Person'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { scrollToTop } from '../util/window'
import { useUser } from '../store/UserProvider'
import { auth } from '../store/Firebase'
import { signOut } from 'firebase/auth'

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

  const { user, dispatch } = useUser()

  return (
    <>
      {!user.uid && (
        <IconButton
          ref={anchorRef}
          onClick={handleOpen}
          sx={{
            padding: 0,
            width: 44,
            height: 44,
            color: '#fff',
            ...(open && {
              bgcolor: (theme) =>
                alpha(theme.palette.primary.main, theme.palette.action.focusOpacity)
            })
          }}>
          <PersonIcon />
        </IconButton>
      )}
      {!!user.uid && !!user.firstName && (
        <Button sx={{ color: '#fff' }} onClick={handleOpen} ref={anchorRef}>
          {user.firstName}
        </Button>
      )}

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
          {!user.uid && (
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
          )}
          {!!user.uid && (
            <>
              <MenuItem
                onClick={() => {
                  handleClose()
                  navigate('/login')
                  scrollToTop()
                }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{user?.firstName ?? user.email}</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleClose()
                  // navigate('/login')
                  // scrollToTop()
                  void signOut(auth)
                }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </>
          )}
        </Stack>
      </MenuPopover>
    </>
  )
}
