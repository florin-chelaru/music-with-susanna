import React, { RefObject, useContext } from 'react'
import Toolbar from '@mui/material/Toolbar'
import { Chip, Container, Divider } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import AboutMeCard from '../Components/AboutMeCard'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'
import VideosMasonry from '../Components/VideosMasonry'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'

export interface HomePageProps {
  homeRef: RefObject<HTMLDivElement>
  testimonialsRef: RefObject<HTMLDivElement>
  youtubeChannelRef: RefObject<HTMLDivElement>
}

export default function HomePage({ homeRef, testimonialsRef, youtubeChannelRef }: HomePageProps) {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12} ref={homeRef}>
            <AboutMeCard />
          </Grid2>
          <Grid2 xs={12}>
            <Divider variant="middle" sx={{ m: 1 }}>
              <Chip label={strings.testimonials} />
            </Divider>
          </Grid2>
          <Grid2 xs={12} ref={testimonialsRef}>
            <TestimonialsMasonry />
          </Grid2>
          <Grid2 xs={12} ref={youtubeChannelRef}>
            <Divider variant="middle" sx={{ m: 1 }}>
              <Chip label={strings.youtubeChildrensChannel} />
            </Divider>
          </Grid2>
          <Grid2 xs={12}>
            <VideosMasonry />
          </Grid2>
        </Grid2>
      </Container>
    </>
  )
}
