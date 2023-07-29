import React, { useContext, useMemo } from 'react'
import { Card, CardMedia, Container, Typography } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import VideosMasonry from '../Components/VideosMasonry'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import Announcement from '../Components/Announcement'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'

const INTRO = 'intro'

export default function VideoChannel() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)

  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => {
    localeManager.registerComponentStrings(
      VideoChannel.name,
      new Map<SupportedLocale, LocalizedData>([
        [
          SupportedLocale.EN_US,
          {
            [INTRO]:
              'I originally started the channel during the pandemic to reach my students while schools were closed. ' +
              'Since then, it has evolved to become a source of musical games, songs, read-alouds and arrangements for ' +
              'students, parents and teachers. My future vision for the channel is to create arrangements of Romanian ' +
              'children’s songs and guides for parents of children studying violin and viola.'
          }
        ],
        [
          SupportedLocale.RO_RO,
          {
            [INTRO]:
              'Am creat acest canal video în perioada pandemiei, pentru a ajunge mai ușor la elevii mei în timp ce ' +
              'școlile erau închise. De atunci, a evoluat într-o sursă de jocuri muzicale, cântece, recitative și ' +
              'aranjamente pentru elevi, părinți și profesori. Viziunea mea este ca în viitor, canalul să devină un ' +
              'loc unde poți găsi cântece pentru copii în română, și ghiduri pentru părinții copiilor care învață ' +
              'vioară și violă.'
          }
        ]
      ])
    )
  }, [])

  const componentStrings = localeManager.componentStrings(VideoChannel.name)

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
    </>
  )
}
