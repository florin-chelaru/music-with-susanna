import React from 'react'
import { Card, CardContent, Container } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import TestimonialsMasonry from '../Components/TestimonialsMasonry'

export interface TestimonialsProps {}

export default function Testimonials({}: TestimonialsProps) {
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <TestimonialsMasonry />
        </Grid2>
      </Grid2>
    </Container>
  )
}
