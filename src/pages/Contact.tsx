import React, { useEffect } from 'react'
import { Container } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import ContactCard from '../Components/ContactCard'

export interface ContactProps {}

export default function Contact({}: ContactProps) {
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <ContactCard />
        </Grid2>
      </Grid2>
    </Container>
  )
}
