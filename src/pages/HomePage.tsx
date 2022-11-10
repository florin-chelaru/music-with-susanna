import React, { useContext } from 'react'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Button, Card, CardActions, CardContent, CardMedia, Container } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { LocaleContext, LocaleManager } from '../store/LocaleProvider'
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
            <TestimonialsMasonry />
          </Grid2>
        </Grid2>
      </Container>
    </>
  )
}
