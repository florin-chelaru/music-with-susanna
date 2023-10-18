import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Collapse,
  Container,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { Unsubscribe, onValue, ref, set } from 'firebase/database'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EditorCard from '../Components/EditorCard'
import ExpandMoreButton from '../Components/ExpandMoreButton'
import { database } from '../store/Firebase'
import { useUser } from '../store/UserProvider'
import HomeworkInfo, { HomeworkStatus, generateHomeworkTemplate } from '../util/HomeworkInfo'
import { dateStringToPrettyDate } from '../util/date'
import { scrollToElement } from '../util/window'

interface HomeworkCardProps {
  homework: HomeworkInfo
}

const HomeworkCard = React.memo(({ homework }: HomeworkCardProps) => {
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  const maxTextLength = 150
  const needsExpansion = (homework.content?.length ?? 0) > maxTextLength

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
          subheader={dateStringToPrettyDate(homework.createdAt)}
          action={
            <IconButton aria-label="settings" onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
          }
          sx={{ pb: 0 }}
        />
        <Collapse in={expanded} timeout="auto" collapsedSize={100}>
          <CardContent sx={{ paddingTop: 0 }}>
            <div dangerouslySetInnerHTML={{ __html: homework.content ?? '' }} />
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
  const theme = useTheme()
  const { teacherId, studentId } = useParams()
  const [homework, setHomework] = useState<HomeworkInfo[]>([])
  const { user, dispatch } = useUser()
  const navigate = useNavigate()

  const homeworkUnsubscriberRef = useRef<Unsubscribe>()
  const homeworkDraft = useRef<HomeworkInfo>(generateHomeworkTemplate())
  const [sectionRefs, setSectionRefs] = useState<Map<string, React.RefObject<HTMLDivElement>>>(
    new Map()
  )

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
          const homeworkItems: HomeworkInfo[] = []
          const newSectionRefs = new Map()
          for (const homeworkId in homeworkById) {
            const item = homeworkById[homeworkId]
            item.id = homeworkId
            homeworkItems.push(item)
            if (!sectionRefs.has(homeworkId)) {
              // sectionRefs.set(homeworkId, React.createRef())
              newSectionRefs.set(homeworkId, React.createRef())
            } else {
              newSectionRefs.set(homeworkId, sectionRefs.get(homeworkId))
            }
          }
          // sort descending
          homeworkItems.sort(
            (h1, h2) =>
              new Date(h2.createdAt ?? 0).getTime() - new Date(h1.createdAt ?? 0).getTime()
          )
          setHomework(homeworkItems)
          setSectionRefs(newSectionRefs)
          // React.createRef()
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

  const saveHomework = async () => {
    console.log(`saving homework ${JSON.stringify(homeworkDraft.current)}...`)
    const hw = homeworkDraft.current
    const content = hw.editContent ?? ''
    hw.updatedAt = new Date().toISOString()
    hw.content = content

    const titleRegex = /^<h1>(.*?)<\/h1>/
    const titleMatch = content.match(titleRegex)
    if (titleMatch) {
      hw.title = titleMatch[1]
      hw.content = content.replace(titleRegex, '')
    } else {
      hw.title = 'Untitled'
    }

    hw.status = HomeworkStatus.PUBLISHED

    await set(ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`), hw)
    console.log('done')
  }

  const toc = (
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
        {homework.map((h: HomeworkInfo, i) => (
          <ListItemButton
            key={`item-${h.id}`}
            sx={{ py: 0, minHeight: 32, color: 'rgba(255,255,255,.8)' }}
            onClick={() => scrollToElement(sectionRefs.get(h?.id ?? '')?.current, 64)}
            data-cy={`nav-item`}>
            <ListItemText
              primary={h.title}
              secondary={dateStringToPrettyDate(h.createdAt)}
              primaryTypographyProps={{ fontWeight: 'medium' }}
            />
          </ListItemButton>
        ))}
      </Box>
    </Box>
  )

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
          {toc}
        </Grid2>
        <Grid2 xs={12} sm={9} md={10}>
          <Grid2 xs={12}>
            <EditorCard
              value={homeworkDraft.current.editContent}
              onValueChange={(v) => {
                console.log(v)
                homeworkDraft.current.editContent = v
              }}
              onSave={() => {
                void saveHomework()
              }}
            />
          </Grid2>
          {homework.map((h: HomeworkInfo, i) => (
            <Grid2
              xs={12}
              key={`hw-${i}`}
              id={`section-${i}`}
              data-cy={`section-item`}
              ref={sectionRefs.get(h?.id ?? '')}>
              <HomeworkCard homework={h} key={`hw-${i}`} />
            </Grid2>
          ))}
        </Grid2>
        <Grid2
          xs={12}
          sm={3}
          md={2}
          rowSpacing={0}
          sx={{ padding: 0 }}
          display={{ xs: 'none', sm: 'block' }}>
          {toc}
        </Grid2>
      </Grid2>
    </Container>
  )
}
