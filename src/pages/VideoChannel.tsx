import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Card,
  CardMedia,
  Container,
  DialogContent,
  IconButton,
  InputBase,
  Paper,
  Typography
} from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import { DataSnapshot, onValue, ref, set, Unsubscribe } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import Announcement from '../Components/Announcement'
import FabCreate from '../Components/FabCreate'
import MultiActionDialog from '../Components/MultiActionDialog'
import VideosMasonry from '../Components/VideosMasonry'
import YOUTUBE_VIDEOS from '../data/YouTubeVideos'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { SUSANNA_USER_ID, UserRole } from '../util/User'
import YouTubeVideo from '../util/YouTubeVideo'

const INTRO = 'intro'

interface VideoChannelTexts {
  intro: string
  addVideo: string
  add: string
  cancel: string
}

const EN_US: VideoChannelTexts = {
  intro:
    'I originally started the channel during the pandemic to reach my students while schools were closed. ' +
    'Since then, it has evolved to become a source of musical games, songs, read-alouds and arrangements for ' +
    'students, parents and teachers. My future vision for the channel is to create arrangements of Romanian ' +
    'children’s songs and guides for parents of children studying violin and viola.',
  add: 'Add',
  addVideo: 'Add a video',
  cancel: 'Cancel'
}

const RO_RO: VideoChannelTexts = {
  intro:
    'Am creat acest canal video în perioada pandemiei, pentru a ajunge mai ușor la elevii mei în timp ce ' +
    'școlile erau închise. De atunci, a evoluat într-o sursă de jocuri muzicale, cântece, recitative și ' +
    'aranjamente pentru elevi, părinți și profesori. Viziunea mea este ca în viitor, canalul să devină un ' +
    'loc unde poți găsi cântece pentru copii în română, și ghiduri pentru părinții copiilor care învață ' +
    'vioară și violă.',
  add: 'Adaugă',
  addVideo: 'Adaugă un videoclip',
  cancel: 'Anulează'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function VideoChannel() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => {
    localeManager.registerComponentStrings(VideoChannel.name, TEXTS)
  }, [])
  const componentStrings = localeManager.componentStrings(VideoChannel.name)

  const [videos, setVideos] = useState<YouTubeVideo[]>(YOUTUBE_VIDEOS)
  const videosUnsubscriberRef = useRef<Unsubscribe>()

  const handleVideosFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const dbVideos = snapshot.val()
      if (!dbVideos) {
        return
      }

      setVideos(Object.values(dbVideos).concat(YOUTUBE_VIDEOS) as YouTubeVideo[])
    },
    []
  )

  useEffect(() => {
    videosUnsubscriberRef.current?.()
    // Subscribe to changes in homework
    videosUnsubscriberRef.current = onValue(
      ref(database, `videos/teachers/${SUSANNA_USER_ID}`),
      (snapshot) => handleVideosFromDb(snapshot),
      (error) => {
        console.error(`Could not retrieve videos for teacher ${SUSANNA_USER_ID}: ${error}`)
      }
    )
    return () => {
      videosUnsubscriberRef.current?.()
    }
  }, [])

  const { user } = useUser()

  const [openAddVideoDialog, setOpenAddVideoDialog] = useState<boolean>(false)
  const fetchVideoFormRef = useRef<HTMLFormElement>(null)
  const [videoData, setVideoData] = useState<YouTubeVideo | null>(null)
  const [videoAlert, setVideoAlert] = useState<string | null>('No video loaded')
  const [videoAlertSeverity, setVideoAlertSeverity] = useState<
    'success' | 'info' | 'warning' | 'error'
  >('info')

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
            <Card>
              {!announcementManager.hidden && <Announcement />}
              <CardMedia
                component="iframe"
                height="400"
                src={`https://www.youtube.com/embed/${selectedVideoManager.selectedVideoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Card>
          </Grid2>
          <Grid2 xs={12}>
            <Typography variant="body1">{componentStrings[INTRO]}</Typography>
          </Grid2>
          <Grid2 xs={12} sx={{ overflow: 'auto' }}>
            <VideosMasonry
              videos={videos}
              onVideoSelected={(videoId) => {
                selectedVideoManager.setSelectedVideo(videoId)
                // Using setTimeout to call scrollIntoView asynchronously
                setTimeout(() => {
                  scrollTo({ top: 0 })
                }, 0)
              }}
            />
          </Grid2>
        </Grid2>
      </Container>

      {user.role === UserRole.TEACHER && (
        <FabCreate
          onClick={() => {
            setOpenAddVideoDialog(true)
          }}
        />
      )}

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
                ref(database, `videos/teachers/${SUSANNA_USER_ID}/${videoData?.videoId}`),
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
    </>
  )
}
