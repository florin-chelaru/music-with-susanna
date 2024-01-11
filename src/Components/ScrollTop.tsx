import { KeyboardArrowUp } from '@mui/icons-material'
import { Box, Fab, Zoom } from '@mui/material'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import React, { useContext } from 'react'
import { FabPosition, FabPositionContext } from '../store/FabPositionProvider'
import { useUser } from '../store/UserProvider'

export default function ScrollTop() {
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 600
  })

  const scrollToTop = React.useCallback(() => {
    scrollTo({ top: 0 })
  }, [])

  const { user } = useUser()

  const fabPosition = useContext<FabPosition>(FabPositionContext).get(ScrollTop.name, user)

  return (
    <Zoom in={trigger}>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          zIndex: 1,
          ...fabPosition
        }}>
        <Fab onClick={scrollToTop} color="primary" size="small" aria-label="scroll back to top">
          <KeyboardArrowUp />
        </Fab>
      </Box>
    </Zoom>
  )
}
