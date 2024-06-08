import React, { useContext } from 'react'
import Toolbar from '@mui/material/Toolbar'
import {
  Avatar,
  Button,
  Card,
  CardMedia,
  Container,
  ImageList,
  Link,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import IntroCard from '../Components/IntroCard'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'
import VideosMasonry from '../Components/VideosMasonry'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import Typography from '@mui/material/Typography'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import { useNavigate } from 'react-router-dom'
import { withBaseURL } from '../util/string'
import { scrollToTop } from '../util/window'
import ImportantEventCard from '../Components/ImportantEventCard'
import RECITAL_VIDEOS from '../data/RecitalVideos'

export interface HomeProps {}

export default function Home({}: HomeProps) {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)
  const navigate = useNavigate()

  const theme = useTheme()
  const md = useMediaQuery(theme.breakpoints.up('md'))

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

          <Grid2 xs={12} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <br />
            <Typography variant="h5" component="h2" sx={{ textAlign: 'center' }}>
              {strings.studentsInRecital.toUpperCase()}
            </Typography>
          </Grid2>
          <Grid2 xs={12}>
            <Grid2 xs={12}>
              <ImageList cols={md ? 2 : 1} gap={16}>
                {RECITAL_VIDEOS.map((props: any, i) => (
                  <Card key={`recital-video-${i}`}>
                    <CardMedia
                      component="iframe"
                      height="400"
                      src={`https://www.youtube.com/embed/${props.videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
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
    </>
  )
}
