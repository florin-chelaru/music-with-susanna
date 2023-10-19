import React from 'react'
import { Box, Zoom, Fab, FabProps } from '@mui/material'
import { KeyboardArrowUp } from '@mui/icons-material'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import AddIcon from '@mui/icons-material/Add'

interface FabCreateProps extends FabProps {}

const FabCreate = (props: FabCreateProps) => {
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 100
  })

  return (
    <Zoom in={!trigger}>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1
        }}>
        <Fab color="secondary" aria-label="create new" {...props}>
          <AddIcon />
        </Fab>
      </Box>
    </Zoom>
  )
}

export default FabCreate
