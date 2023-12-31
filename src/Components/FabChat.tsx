import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { Box, Fab, FabProps, Zoom } from '@mui/material'
import { useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { FabPosition, FabPositionContext } from '../store/FabPositionProvider'
import { useUser } from '../store/UserProvider'
import { UserRole } from '../util/User'

interface FabChatProps extends FabProps {}

const pathsWithoutChat = ['/students']

const FabChat = (props: FabChatProps) => {
  const location = useLocation()
  const { user } = useUser()

  const fabPosition = useContext<FabPosition>(FabPositionContext).get(FabChat.name, user)

  const hide =
    user.role === UserRole.TEACHER ||
    pathsWithoutChat.find((path) => location.pathname.startsWith(path))

  return (
    <Zoom in>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          // bottom: 32,
          // right: 32,
          zIndex: 1,
          display: hide ? 'none' : 'block',
          ...fabPosition
        }}>
        <Fab color="success" aria-label="message me" {...props}>
          <ChatBubbleOutlineIcon />
        </Fab>
      </Box>
    </Zoom>
  )
}

export default FabChat
