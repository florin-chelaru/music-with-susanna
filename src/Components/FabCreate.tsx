import AddIcon from '@mui/icons-material/Add'
import { Box, Fab, FabProps, Zoom } from '@mui/material'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import { useContext } from 'react'
import { FabPosition, FabPositionContext } from '../store/FabPositionProvider'
import { useUser } from '../store/UserProvider'

interface FabCreateProps extends FabProps {}

export default function FabCreate(props: FabCreateProps) {
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 100
  })

  const { user } = useUser()

  const fabPosition = useContext<FabPosition>(FabPositionContext).get(FabCreate.name, user)

  return (
    <Zoom in={!trigger}>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          zIndex: 1,
          ...fabPosition
        }}>
        <Fab color="secondary" aria-label="create new" {...props}>
          <AddIcon />
        </Fab>
      </Box>
    </Zoom>
  )
}
