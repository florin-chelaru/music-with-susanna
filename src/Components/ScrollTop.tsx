import React from 'react'
import { Box, Zoom, Fab } from '@mui/material'
import { KeyboardArrowUp } from '@mui/icons-material'
import useScrollTrigger from '@mui/material/useScrollTrigger'

const ScrollTop = () => {
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 100
  })

  const scrollToTop = React.useCallback(() => {
    scrollTo({ top: 0 })
  }, [])

  return (
    <Zoom in={trigger}>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1
        }}>
        <Fab onClick={scrollToTop} color="primary" size="small" aria-label="scroll back to top">
          <KeyboardArrowUp />
        </Fab>
      </Box>
    </Zoom>
  )
}

export default ScrollTop
