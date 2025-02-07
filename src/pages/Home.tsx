import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardMedia,
  Container,
  DialogContent,
  DialogContentText,
  Fab,
  IconButton,
  ImageList,
  InputBase,
  Link,
  Paper,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import { DataSnapshot, onValue, ref, remove, set, Unsubscribe } from 'firebase/database'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImportantEventCard from '../Components/ImportantEventCard'
import IntroCard from '../Components/IntroCard'
import MultiActionDialog from '../Components/MultiActionDialog'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'
import VideosMasonry from '../Components/VideosMasonry'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import { useUser } from '../store/UserProvider'
import { withBaseURL } from '../util/string'
import { SupportedLocale } from '../util/SupportedLocale'
import { SUSANNA_USER_ID } from '../util/User'
import { scrollToTop } from '../util/window'
import YouTubeVideo from '../util/YouTubeVideo'

export interface HomeProps {}

interface HomeTexts {
  addVideo: string
  add: string
  cancel: string
  delete: string
  deleteVideo: string
  areYouSureDescription: string
}

const EN_US: HomeTexts = {
  add: 'Add',
  addVideo: 'Add a video',
  cancel: 'Cancel',
  delete: 'Delete',
  deleteVideo: 'Delete video',
  areYouSureDescription: 'Are you sure you want to delete this video?'
}

const RO_RO: HomeTexts = {
  add: 'Adaugă',
  addVideo: 'Adaugă un videoclip',
  cancel: 'Anulează',
  delete: 'Șterge',
  deleteVideo: 'Șterge videoclipul',
  areYouSureDescription: 'Ești sigur că vrei să ștergi acest videoclip?'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function Home({}: HomeProps) {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)
  const navigate = useNavigate()

  const theme = useTheme()
  const md = useMediaQuery(theme.breakpoints.up('md'))

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => {
    localeManager.registerComponentStrings(Home.name, TEXTS)
  }, [])
  const componentStrings = localeManager.componentStrings(Home.name)

  const { user } = useUser()

  // TODO: We have the same logic in the Video Channel. This dialog and the Are you sure dialog should be a separate component
  const [openAddVideoDialog, setOpenAddVideoDialog] = useState<boolean>(false)
  const fetchVideoFormRef = useRef<HTMLFormElement>(null)
  const [videoData, setVideoData] = useState<YouTubeVideo | null>(null)
  const [videoAlert, setVideoAlert] = useState<string | null>('No video loaded')
  const [videoAlertSeverity, setVideoAlertSeverity] = useState<
    'success' | 'info' | 'warning' | 'error'
  >('info')

  const [openAreYouSureDialog, setOpenAreYouSureDialog] = useState<boolean>(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const videosUnsubscriberRef = useRef<Unsubscribe>()

  const handleVideosFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const dbVideos = snapshot.val()
      if (!dbVideos) {
        setVideos([])
        return
      }

      setVideos(Object.values(dbVideos))
    },
    []
  )

  useEffect(() => {
    videosUnsubscriberRef.current?.()
    // Subscribe to changes in videos
    videosUnsubscriberRef.current = onValue(
      ref(database, `videos/showcase/teachers/${SUSANNA_USER_ID}`),
      (snapshot) => handleVideosFromDb(snapshot),
      (error) => {
        console.error(`Could not retrieve videos for teacher ${SUSANNA_USER_ID}: ${error}`)
      }
    )
    return () => {
      videosUnsubscriberRef.current?.()
    }
  }, [])

  const fetchVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const videoUrl = formData.get('youtube-video-url') as string | null
    if (!videoUrl) {
      setVideoAlert('No video URL provided')
      setVideoAlertSeverity('warning')
      return
    }

    let videoId = null
    try {
      videoId = new URL(videoUrl).searchParams.get('v')
    } catch (error) {
      setVideoAlert(`${error}`)
      setVideoAlertSeverity('error')
      return
    }

    if (!videoId) {
      setVideoAlert(
        'No video ID found in URL. The URL should be in the format: https://www.youtube.com/watch?v=VIDEO_ID'
      )
      setVideoAlertSeverity('warning')
      return
    }

    if (videoId) {
      try {
        const response = await fetch(
          // `http://127.0.0.1:5001/music-with-susanna/europe-west1/fetchYoutubeVideo?videoId=${videoId}`,
          `https://europe-west1-music-with-susanna.cloudfunctions.net/fetchYoutubeVideo?videoId=${videoId}`,
          {
            headers: {
              Authorization: `Bearer ${user?.accessToken}`
            }
          }
        )
        const data = await response.json()
        setVideoData(data)
        setVideoAlert(null)
      } catch (error) {
        console.error('Error fetching video:', error)
        setVideoData(null)
        setVideoAlert(`Could not fetch video: ${error}`)
        setVideoAlertSeverity('error')
      }
    }
  }

  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12}>
            <ImportantEventCard />
          </Grid2>
          <Grid2 xs={12}>
            <IntroCard />
          </Grid2>
          <Grid2
            xs={12}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column'
            }}>
            <br />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
              <Typography variant="h5" component="h2" sx={{ flexGrow: 1, textAlign: 'center' }}>
                {strings.studentsInRecital.toUpperCase()}
              </Typography>
              {user?.role === 'teacher' && (
                <IconButton aria-label="add" onClick={() => setOpenAddVideoDialog(true)}>
                  <AddIcon />
                </IconButton>
              )}
            </Box>
          </Grid2>
          <Grid2 xs={12}>
            <Grid2 xs={12}>
              <ImageList cols={md ? 2 : 1} gap={16}>
                {videos.map((props: any, i) => (
                  <Card key={`recital-video-${i}`} sx={{ position: 'relative' }}>
                    <CardMedia
                      component="iframe"
                      height="400"
                      src={`https://www.youtube.com/embed/${props.videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    {user?.role === 'teacher' && (
                      <Fab
                        aria-label="delete"
                        size="small"
                        sx={{ position: 'absolute', bottom: 10, right: 10 }}
                        onClick={() => {
                          setSelectedVideoId(props.videoId)
                          setOpenAreYouSureDialog(true)
                        }}>
                        <DeleteIcon />
                      </Fab>
                    )}
                  </Card>
                ))}
              </ImageList>
            </Grid2>
          </Grid2>

          <Grid2 xs={12} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <br />
            <Typography variant="h5" component="h2" sx={{ textAlign: 'center' }}>
              {strings.testimonials.toUpperCase()}
            </Typography>
          </Grid2>
          <Grid2 xs={12}>
            <TestimonialsMasonry showFeaturedTestimonials />
          </Grid2>
          <Grid2
            xs={12}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Button
              size="medium"
              variant="contained"
              onClick={() => {
                navigate('/contact')
                scrollToTop()
              }}>
              {strings.contactMe}
            </Button>
          </Grid2>
          <Grid2 xs={12}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                m: 'auto'
              }}>
              <Avatar
                alt="Susanna Johnson-Chelaru"
                src={withBaseURL('/static/img/youtube-thumbs/avatar-3.jpeg')}
                sx={{
                  width: 66,
                  height: 66
                }}
              />

              <Link
                underline="hover"
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/videos')
                  scrollToTop()
                }}>
                <Typography variant="h5" gutterBottom component="h2">
                  {strings.youtubeChildrensChannel.toUpperCase()}
                </Typography>
              </Link>
            </Stack>
          </Grid2>
          <Grid2 xs={12}>
            <VideosMasonry
              maxVideos={8}
              onVideoSelected={(videoId) => {
                selectedVideoManager.setSelectedVideo(videoId)
                navigate('/videos')
                scrollToTop()
              }}
            />
          </Grid2>
          <Grid2
            xs={12}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Button
              size="medium"
              variant="outlined"
              onClick={() => {
                navigate('/videos')
                scrollToTop()
              }}
              sx={{ mr: 2 }}>
              {strings.more}
            </Button>
            <Button
              size="medium"
              variant="contained"
              onClick={() => {
                navigate('/contact')
                scrollToTop()
              }}>
              {strings.contactMe}
            </Button>
          </Grid2>
        </Grid2>
      </Container>

      <MultiActionDialog
        open={openAddVideoDialog}
        onClose={() => setOpenAddVideoDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.addVideo}
        actions={[
          { label: componentStrings.cancel, onClick: () => setOpenAddVideoDialog(false) },
          {
            label: componentStrings.add,
            onClick: async () => {
              if (!videoData) {
                return
              }
              await set(
                ref(database, `videos/showcase/teachers/${SUSANNA_USER_ID}/${videoData?.videoId}`),
                videoData
              )
              setOpenAddVideoDialog(false)
            }
          }
        ]}
        maxWidth={false}
        PaperProps={{ sx: { width: 800 } }}>
        <DialogContent>
          <Paper
            component="form"
            ref={fetchVideoFormRef}
            onSubmit={(e) => {
              void fetchVideo(e)
            }}
            sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%' }}>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="YouTube video URL"
              inputProps={{ 'aria-label': 'youtube video url' }}
              name="youtube-video-url"
            />
            <IconButton
              type="button"
              sx={{ p: '10px' }}
              aria-label="search"
              onClick={() => {
                fetchVideoFormRef.current?.requestSubmit()
              }}>
              <SearchIcon />
            </IconButton>
          </Paper>
          <br />
          {videoAlert && <Alert severity={videoAlertSeverity}>{videoAlert}</Alert>}
          {videoData && (
            <Card>
              <CardMedia
                component="iframe"
                height="400"
                src={`https://www.youtube.com/embed/${videoData.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Card>
          )}
        </DialogContent>
      </MultiActionDialog>

      <MultiActionDialog
        open={openAreYouSureDialog}
        onClose={() => setOpenAreYouSureDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.deleteVideo}
        actions={[
          { label: componentStrings.cancel, onClick: () => setOpenAreYouSureDialog(false) },
          {
            label: componentStrings.delete,
            onClick: async () => {
              await remove(
                ref(database, `videos/showcase/teachers/${SUSANNA_USER_ID}/${selectedVideoId}`)
              )
              setOpenAreYouSureDialog(false)
            }
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.areYouSureDescription}
          </DialogContentText>
        </DialogContent>
      </MultiActionDialog>
    </>
  )
}
