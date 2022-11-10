import React from 'react'
import Toolbar from '@mui/material/Toolbar'
import { Container, Divider } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import AboutMeCard from '../Components/AboutMeCard'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'

export default function HomePage() {
  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12}>
            <AboutMeCard />
          </Grid2>
          <Grid2 xs={12}>
            <Divider variant="middle" sx={{ m: 1 }} />
          </Grid2>
          <Grid2 xs={12}>
            <TestimonialsMasonry />
          </Grid2>
        </Grid2>
      </Container>
    </>
  )
}
