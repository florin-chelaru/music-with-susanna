import { Box, Card, CardContent, CardMedia, Container, Link, Typography } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import React from 'react'
import PhotoCard from './PhotoCard'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import EmailIcon from '@mui/icons-material/Email'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import FacebookIcon from '@mui/icons-material/Facebook'
import YouTubeIcon from '@mui/icons-material/YouTube'
import { Masonry } from '@mui/lab'

export default function ContactCard() {
  return (
    <Card>
      <Grid2 container>
        <Grid2 xs={12} sm={6}>
          <CardMedia
            component="img"
            // TODO: Breakpoints
            image="/static/img/contact-large.jpeg"
            // TODO: Localize
            alt="Susanna Johnson-Chelaru"
            // For getting the image to stretch to the available space.
            // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
            sx={{
              flexShrink: 0,
              minHeight: '100%'
            }}
          />
        </Grid2>
        <Grid2
          xs={12}
          sm={6}
          sx={{
            display: 'flex',
            direction: 'vertical',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
          <CardContent>
            <Typography variant="h5">CONTACT ME</Typography>

            <Typography variant="body1" paragraph>
              Please send me a message or call me on{' '}
              <Link
                rel="noreferrer"
                target="_blank"
                // TODO: Localize text
                href="https://wa.me/40724261320?text=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
                sx={{ textDecoration: 'none' }}>
                WhatsApp
              </Link>
              {', '}
              or{' '}
              <Link
                rel="noreferrer"
                target="_blank"
                // TODO: Localize text
                href="mailto:susanna.alice.j@gmail.com?subject=Lec%C8%9Bii%20de%20vioar%C4%83%2Fviol%C4%83&body=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                send me an email{' '}
              </Link>
              to schedule a trial lesson or ask me a question.
            </Typography>

            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                // TODO: Localize text
                href="https://wa.me/40724261320?text=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <WhatsAppIcon fontSize="small" sx={{ mr: 1 }} /> 0724-261-320
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                // TODO: Localize text
                href="mailto:susanna.alice.j@gmail.com?subject=Lec%C8%9Bii%20de%20vioar%C4%83%2Fviol%C4%83&body=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <EmailIcon fontSize="small" sx={{ mr: 1 }} /> susanna.alice.j@gmail.com
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href="https://www.facebook.com/MusicwithMsJohnson"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <FacebookIcon fontSize="small" sx={{ mr: 1 }} /> MusicwithMsJohnson
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href="https://www.youtube.com/channel/UCrxcoyBWhGaf-xYNzutQzeg/videos"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <YouTubeIcon fontSize="small" sx={{ mr: 1 }} /> Music with Ms. Johnson
              </Link>
            </Typography>
          </CardContent>
        </Grid2>
      </Grid2>
    </Card>
  )
}
