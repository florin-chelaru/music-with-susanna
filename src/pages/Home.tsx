import React, { RefObject, useContext } from 'react'
import Toolbar from '@mui/material/Toolbar'
import { Avatar, Button, Chip, Container, Divider, Link, Stack } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import IntroCard from '../Components/IntroCard'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'
import VideosMasonry from '../Components/VideosMasonry'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import Typography from '@mui/material/Typography'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import { useNavigate } from 'react-router-dom'

export interface HomeProps {
  homeRef: RefObject<HTMLDivElement>
  testimonialsRef: RefObject<HTMLDivElement>
  youtubeChannelRef: RefObject<HTMLDivElement>
}

export default function Home({ homeRef, testimonialsRef, youtubeChannelRef }: HomeProps) {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)
  const navigate = useNavigate()
  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12} ref={homeRef}>
            <IntroCard />
          </Grid2>
          <Grid2 xs={12}>
            <Divider variant="middle" sx={{ m: 1 }}>
              <Chip label={strings.testimonials} />
            </Divider>
          </Grid2>
          <Grid2 xs={12} ref={testimonialsRef}>
            <TestimonialsMasonry showFeaturedTestimonials />
          </Grid2>
          <Grid2
            xs={12}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Button size="medium" variant="contained" onClick={() => navigate('/contact')}>
              {strings.signUp}
            </Button>
          </Grid2>
          <Grid2 xs={12} ref={youtubeChannelRef}>
            <Divider variant="middle" sx={{ m: 1 }}>
              <Chip label={strings.youtubeChildrensChannel} />
            </Divider>
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
                alt="Susanna Johnson"
                src="/static/img/youtube-thumbs/avatar-3.jpeg"
                sx={{
                  width: 66,
                  height: 66
                }}
              />
              <Typography
                variant="h5"
                gutterBottom
                component={Link}
                underline="hover"
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/videos')
                }}>
                {strings.musicWithMsJohnson}
              </Typography>
            </Stack>
          </Grid2>
          <Grid2 xs={12}>
            <VideosMasonry
              maxVideos={8}
              onVideoSelected={(videoId) => {
                console.log('navigating to /videos')
                selectedVideoManager.setSelectedVideo(videoId)
                navigate('/videos')
                // Using setTimeout to call scrollIntoView asynchronously
                setTimeout(() => {
                  scrollTo({ top: 0 })
                }, 0)
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
              onClick={() => navigate('/videos')}
              sx={{ mr: 2 }}>
              {strings.readMore}
            </Button>
            <Button size="medium" variant="contained" onClick={() => navigate('/contact')}>
              {strings.signUp}
            </Button>
          </Grid2>
        </Grid2>
      </Container>
    </>
  )
}
