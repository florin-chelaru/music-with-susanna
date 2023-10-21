import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { Unsubscribe, onValue, ref, remove, set } from 'firebase/database'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TransitionGroup } from 'react-transition-group'
import EditorCard from '../Components/EditorCard'
import ExpandMoreButton from '../Components/ExpandMoreButton'
import FabCreate from '../Components/FabCreate'
import { database } from '../store/Firebase'
import { useUser } from '../store/UserProvider'
import HomeworkInfo, {
  HomeworkStatus,
  generateHomeworkTemplate,
  removeUndefinedKeys
} from '../util/HomeworkInfo'
import { dateStringToPrettyDate } from '../util/date'
import { scrollToElement } from '../util/window'

interface HomeworkCardProps {
  homework: HomeworkInfo
  onEdit?(): void
  onDelete?(): void
  defaultExpanded?: boolean
}

const HomeworkCard = React.memo(
  ({ homework, onEdit, onDelete, defaultExpanded = false }: HomeworkCardProps) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded)
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
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: homework.content ?? '' }}
              />
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
          <MenuItem
            onClick={() => {
              handleClose()
              onEdit?.()
            }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose()
              onDelete?.()
            }}>
            <ListItemIcon>
              <DeleteForeverIcon fontSize="small" />
            </ListItemIcon>
            Trash
          </MenuItem>
        </Menu>
      </>
    )
  }
)

export interface HomeworkProps {}

export default function Homework({}: HomeworkProps) {
  const theme = useTheme()
  const { teacherId, studentId } = useParams()
  const homework = useRef<Map<string, HomeworkInfo>>(new Map())
  const [homeworkChanged, setHomeworkChanged] = useState<number>(0)
  const { user, dispatch } = useUser()
  const navigate = useNavigate()
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const [dialogTitle, setDialogTitle] = useState<string>('')
  const [dialogContent, setDialogContent] = useState<string>('')
  const [dialogYesButtonText, setDialogYesButtonText] = useState<string>('Yes')
  const [dialogNoButtonText, setDialogNoButtonText] = useState<string>('No')
  const dialogYesActionRef = useRef<() => void>(() => {})

  const homeworkUnsubscriberRef = useRef<Unsubscribe>()
  const [sectionRefs, setSectionRefs] = useState<Map<string, React.RefObject<HTMLDivElement>>>(
    new Map()
  )
  const homeworkDraftsToSave = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (user.loading) {
      return
    }
    homeworkUnsubscriberRef.current?.()
    if (!user.uid) {
      navigate('/login')
      return
    }

    homeworkUnsubscriberRef.current = onValue(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}`),
      (snapshot) => {
        const dbHomework = snapshot.val()
        if (dbHomework) {
          // const hwMap: Map<string, HomeworkInfo> = new Map()
          const hwMap = homework.current

          const updatedSectionRefs = new Map()
          for (const id in dbHomework) {
            const hw = dbHomework[id]
            hw.id = id
            if (hw.deletedAt) {
              continue
            }

            const localHw = hwMap.get(id)
            if (!localHw) {
              hwMap.set(id, hw)
            } else {
              if (
                !localHw.updatedAt ||
                (hw.updatedAt &&
                  new Date(localHw.updatedAt).getTime() < new Date(hw.updatedAt).getTime())
              ) {
                localHw.content = hw.content
                localHw.editContent = hw.editContent
                localHw.status = hw.status
                localHw.updatedAt = hw.updatedAt
                localHw.deletedAt = hw.deletedAt
                localHw.title = hw.title
              }
            }

            if (!sectionRefs.has(id)) {
              updatedSectionRefs.set(id, React.createRef())
            } else {
              updatedSectionRefs.set(id, sectionRefs.get(id))
            }
          }
          setHomeworkChanged(homeworkChanged + 1)
          setSectionRefs(updatedSectionRefs)
        } else {
          console.log('no homework found on the database. clearing map')
          homework.current = new Map()
          setHomeworkChanged(homeworkChanged + 1)
        }
      },
      (error) => {
        console.error(
          `Clearing map: could not retrieve homework for teacher ${teacherId} and student ${studentId}: ${error}`
        )
        setHomeworkChanged(homeworkChanged + 1)
      }
    )

    const saveAtInterval = setInterval(() => {
      const draftsToSave = homeworkDraftsToSave.current
      homeworkDraftsToSave.current = new Set()

      for (const id of draftsToSave) {
        const hw = homework.current.get(id)
        if (hw && hw.status !== HomeworkStatus.PUBLISHED && draftsToSave.has(hw.id)) {
          void saveHomeworkDraft(hw)
        }
      }
    }, 3000)

    return () => {
      clearInterval(saveAtInterval)
      homeworkUnsubscriberRef.current?.()
    }
  }, [user, teacherId, studentId])

  const saveHomeworkDraft = async (hw: HomeworkInfo) => {
    hw.updatedAt = new Date().toISOString()
    await set(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
      removeUndefinedKeys(hw)
    )
  }

  function convertToPlain(str: string) {
    // Create a new div element
    const tempDivElement = document.createElement('div')

    // Set the HTML content with the given value
    tempDivElement.innerHTML = str

    // Retrieve the text property of the element
    return tempDivElement.textContent ?? tempDivElement.innerText ?? ''
  }

  const publishHomework = async (hw: HomeworkInfo) => {
    const content = hw.editContent ?? ''
    hw.updatedAt = new Date().toISOString()
    hw.content = content
    hw.editContent = ''
    const titleRegex = /^<h1>(.*?)<\/h1>/
    const titleMatch = content.match(titleRegex)
    if (titleMatch) {
      hw.title = convertToPlain(titleMatch[1])
      hw.content = content.replace(titleRegex, '')
    } else {
      hw.title = 'Untitled'
    }

    hw.status = HomeworkStatus.PUBLISHED
    await set(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
      removeUndefinedKeys(hw)
    )
  }

  const createNewHomework = async () => {
    const hw = generateHomeworkTemplate()
    homework.current.set(hw.id, hw)
    setHomeworkChanged(homeworkChanged + 1)
    await saveHomeworkDraft(hw)
  }

  const deleteHomework = async (hw: HomeworkInfo) => {
    hw.updatedAt = new Date().toISOString()
    hw.deletedAt = new Date().toISOString()
    homework.current.delete(hw.id)
    setHomeworkChanged(homeworkChanged + 1)
    await set(
      ref(database, `deleted/homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
      removeUndefinedKeys(hw)
    )
    await remove(ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`))
  }

  const turnToDraft = async (hw: HomeworkInfo) => {
    hw.updatedAt = new Date().toISOString()
    const content = hw.content ?? ''
    const title = `<h1>${hw.title ?? ''}</h1>`
    hw.editContent = title + content
    hw.content = ''
    hw.title = ''
    hw.status = HomeworkStatus.EDITING
    setHomeworkChanged(homeworkChanged + 1)
    await set(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
      removeUndefinedKeys(hw)
    )
  }

  // sort descending
  const hwList = Array.from(homework.current.values())
  hwList.sort(
    (h1, h2) => new Date(h2.createdAt ?? 0).getTime() - new Date(h1.createdAt ?? 0).getTime()
  )

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
        {hwList.map((hw: HomeworkInfo, i) => (
          <ListItemButton
            key={`item-${hw.id}`}
            sx={{ py: 0, minHeight: 32 }}
            onClick={() => scrollToElement(sectionRefs.get(hw?.id ?? '')?.current, 64)}>
            <ListItemText
              primary={hw.title}
              secondary={dateStringToPrettyDate(hw.createdAt)}
              primaryTypographyProps={{ fontWeight: 'medium' }}
            />
          </ListItemButton>
        ))}
      </Box>
    </Box>
  )

  const dialog = (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description">
      <DialogTitle id="alert-dialog-title">{dialogTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{dialogContent}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>{dialogNoButtonText}</Button>
        <Button
          onClick={() => {
            setOpenDialog(false)
            dialogYesActionRef.current()
          }}
          autoFocus>
          {dialogYesButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  )

  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
            {toc}
          </Grid2>
          <Grid2 xs={12} sm={9} md={10}>
            <TransitionGroup>
              {hwList.map((hw: HomeworkInfo, i) => (
                <Collapse key={`hw-${hw.id}-${hw.createdAt}`}>
                  <Grid2
                    xs={12}
                    id={`section-${i}`}
                    data-cy={`section-item`}
                    ref={sectionRefs.get(hw?.id ?? '')}>
                    {hw.status === HomeworkStatus.PUBLISHED && (
                      <HomeworkCard
                        homework={hw}
                        onDelete={() => {
                          setDialogTitle('Are you sure?')
                          setDialogContent('Are you sure you want to delete the homework?')
                          dialogYesActionRef.current = () => {
                            void deleteHomework(hw)
                          }
                          setOpenDialog(true)
                        }}
                        onEdit={() => {
                          void turnToDraft(hw)
                        }}
                        defaultExpanded={!i}
                      />
                    )}
                    {hw.status !== HomeworkStatus.PUBLISHED && (
                      <EditorCard
                        value={hw.editContent}
                        onValueChange={(v) => {
                          hw.editContent = v
                          homeworkDraftsToSave.current.add(hw.id)
                        }}
                        onPublish={() => {
                          void publishHomework(hw)
                        }}
                        onSave={() => {
                          void saveHomeworkDraft(hw)
                        }}
                        onDiscard={() => {
                          setDialogTitle('Are you sure?')
                          setDialogContent('Are you sure you want to delete the homework?')
                          dialogYesActionRef.current = () => {
                            void deleteHomework(hw)
                          }
                          setOpenDialog(true)
                        }}
                      />
                    )}
                  </Grid2>
                </Collapse>
              ))}
            </TransitionGroup>
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
      <FabCreate
        onClick={() => {
          void createNewHomework()
        }}
      />
      {dialog}
    </>
  )
}
