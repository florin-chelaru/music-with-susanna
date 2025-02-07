import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Card,
  CardMedia,
  Container,
  DialogContent,
  DialogContentText,
  IconButton,
  InputBase,
  Paper,
  Typography
} from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import { DataSnapshot, onValue, ref, remove, set, Unsubscribe } from 'firebase/database'
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
  delete: string
  deleteVideo: string
  areYouSureDescription: string
}

const EN_US: VideoChannelTexts = {
  intro:
    'I originally started the channel during the pandemic to reach my students while schools were closed. ' +
    'Since then, it has evolved to become a source of musical games, songs, read-alouds and arrangements for ' +
    'students, parents and teachers. My future vision for the channel is to create arrangements of Romanian ' +
    'children’s songs and guides for parents of children studying violin and viola.',
  add: 'Add',
  addVideo: 'Add a video',
  cancel: 'Cancel',
  delete: 'Delete',
  deleteVideo: 'Delete video',
  areYouSureDescription: 'Are you sure you want to delete this video?'
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
  cancel: 'Anulează',
  delete: 'Șterge',
  deleteVideo: 'Șterge videoclipul',
  areYouSureDescription: 'Ești sigur că vrei să ștergi acest videoclip?'
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

  const currentVideos = useRef<YouTubeVideo[]>(YOUTUBE_VIDEOS)
  const [videos, setVideos] = useState<YouTubeVideo[]>(YOUTUBE_VIDEOS)
  const [deletedVideos, setDeletedVideos] = useState<Set<string>>(new Set<string>())
  const videosUnsubscriberRef = useRef<Unsubscribe>()
  const deletedVideosUnsubscriberRef = useRef<Unsubscribe>()

  const handleVideosFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const dbVideos = snapshot.val()
      if (!dbVideos) {
        return
      }

      const uniqueVideoIds = new Set<string>()
      const filteredVideos = (
        Object.values(dbVideos).concat(YOUTUBE_VIDEOS) as YouTubeVideo[]
      ).filter((v) => {
        if (uniqueVideoIds.has(v.videoId)) {
          return false
        }
        uniqueVideoIds.add(v.videoId)
        return !deletedVideos.has(v.videoId)
      })

      currentVideos.current = filteredVideos
      setVideos(filteredVideos)
    },
    []
  )

  const handleDeletedVideosFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const deletedVideosDb = snapshot.val()
      if (!deletedVideosDb) {
        return
      }

      const deletedVideosSet = new Set<string>(Object.keys(deletedVideosDb))
      setDeletedVideos(deletedVideosSet)

      const uniqueVideoIds = new Set<string>()
      const filteredVideos = currentVideos.current.filter((v) => {
        if (uniqueVideoIds.has(v.videoId)) {
          return false
        }
        uniqueVideoIds.add(v.videoId)
        return !deletedVideosSet.has(v.videoId)
      })

      currentVideos.current = filteredVideos
      setVideos(filteredVideos)
    },
    [videos]
  )

  useEffect(() => {
    videosUnsubscriberRef.current?.()
    // Subscribe to changes in videos
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

  useEffect(() => {
    deletedVideosUnsubscriberRef.current?.()
    deletedVideosUnsubscriberRef.current = onValue(
      ref(database, `deleted/videos/teachers/${SUSANNA_USER_ID}`),
      (snapshot) => handleDeletedVideosFromDb(snapshot),
      (error) => {
        console.error(`Could not retrieve deleted videos for teacher ${SUSANNA_USER_ID}: ${error}`)
      }
    )
    return () => {
      deletedVideosUnsubscriberRef.current?.()
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

  const [openAreYouSureDialog, setOpenAreYouSureDialog] = useState<boolean>(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

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
              onVideoDelete={
                user?.role !== 'teacher'
                  ? undefined
                  : (videoId) => {
                      setSelectedVideoId(videoId)
                      setOpenAreYouSureDialog(true)
                    }
              }
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
              await remove(
                ref(database, `deleted/videos/teachers/${SUSANNA_USER_ID}/${videoData?.videoId}`)
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
              await set(
                ref(database, `deleted/videos/teachers/${SUSANNA_USER_ID}/${selectedVideoId}`),
                ''
              )
              await remove(ref(database, `videos/teachers/${SUSANNA_USER_ID}/${selectedVideoId}`))
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
