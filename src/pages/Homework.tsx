import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../store/UserProvider'
import { Unsubscribe, onValue, ref } from 'firebase/database'
import HomeworkInfo from '../util/HomeworkInfo'
import { database } from '../store/Firebase'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Collapse,
  Container,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import EditorCard from '../Components/EditorCard'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandMoreButton from '../Components/ExpandMoreButton'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

interface HomeworkCardProps {
  homework: HomeworkInfo
}

const HomeworkCard = React.memo(({ homework }: HomeworkCardProps) => {
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  const maxTextLength = 10 //150
  const needsExpansion = homework.content.length > maxTextLength

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <Card>
        <CardHeader
          title={homework.title}
          subheader={homework.createdAt}
          action={
            <IconButton aria-label="settings" onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
          }
          sx={{ pb: 0 }}
        />
        <Collapse in={expanded} timeout="auto" collapsedSize={100}>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: homework.content }} />
          </CardContent>
        </Collapse>
        {needsExpansion && (
          <CardActions disableSpacing>
            <ExpandMoreButton
              expand={expanded}
              onClick={handleExpandClick}
              aria-expanded={expanded}
              aria-label="show more">
              <ExpandMoreIcon />
            </ExpandMoreButton>
          </CardActions>
        )}
      </Card>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <DeleteForeverIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <VisibilityOffIcon fontSize="small" />
          </ListItemIcon>
          Turn to draft
        </MenuItem>
      </Menu>
    </>
  )
})

export interface HomeworkProps {}

export default function Homework({}: HomeworkProps) {
  const { teacherId, studentId } = useParams()
  const [homework, setHomework] = useState<HomeworkInfo[]>([])
  const { user, dispatch } = useUser()
  const navigate = useNavigate()

  const homeworkUnsubscriberRef = useRef<Unsubscribe>()

  useEffect(() => {
    if (user.loading) {
      return
    }
    if (homeworkUnsubscriberRef.current) {
      homeworkUnsubscriberRef.current()
    }
    if (!user.uid) {
      navigate('/login')
      return
    }

    homeworkUnsubscriberRef.current = onValue(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}`),
      (snapshot) => {
        const homeworkById = snapshot.val()
        if (homeworkById) {
          setHomework(Object.values(homeworkById))
        } else {
          setHomework([])
        }
      },
      (error) => {
        console.error(
          `Could not retrieve homework for teacher ${teacherId} and student ${studentId}: ${error}`
        )
        setHomework([])
      }
    )
  }, [user, teacherId, studentId])

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Grid2 xs={12}>
            <EditorCard />
          </Grid2>
          {homework.map((h: HomeworkInfo, i) => (
            <Grid2 xs={12} key={`hw-${i}`}>
              <HomeworkCard homework={h} key={`hw-${i}`} />
            </Grid2>
          ))}
        </Grid2>
      </Grid2>
    </Container>
  )
}
