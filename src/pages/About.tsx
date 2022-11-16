import React from 'react'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Container,
  Link,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import EmailIcon from '@mui/icons-material/Email'
import FacebookIcon from '@mui/icons-material/Facebook'
import YouTubeIcon from '@mui/icons-material/YouTube'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { GREY } from '../theme/palette'
import { Masonry } from '@mui/lab'
import PhotoCard from '../Components/PhotoCard'

export interface AboutProps {}

export default function About({}: AboutProps) {
  const theme = useTheme()
  const atLeastSm = useMediaQuery(theme.breakpoints.up('sm'))
  const content = (
    <Grid2 container>
      <Grid2 xs={12} sm={4}>
        <PhotoCard image="/static/img/bio-photo.jpeg" alt="Susanna Johnson" />
      </Grid2>
      <Grid2 xs={12} sm={8}>
        <Typography variant="h5">SUSANNA JOHNSON</Typography>
        <Typography variant="subtitle2">Viola • Violin • Music Teacher</Typography>
        <Typography variant="body1" paragraph>
          <FormatQuoteIcon />
          {/* TODO: Change to first-person quote */}
          I&apos;m a Senior Software Engineer with a Ph.D. in Computer Science from the University
          of Maryland and industry experience at Google, Microsoft, Facebook and MIT. My past work
          ranges from Cloud/distributed systems, designing scalable software for big data analysis,
          to high end UX-driven tools for data visialization, and mobile apps.
        </Typography>
        <Typography variant="body1" paragraph>
          At present, I am a Tech Lead Manager at Google, on the Cloud Monitoring Team.
        </Typography>
        <Typography variant="h6">Contact</Typography>
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
            // TODO: Localize text
            href="https://wa.me/40724261320?text=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              textDecoration: 'none'
            }}>
            <WhatsAppIcon fontSize="small" sx={{ mr: 1 }} /> Message me on WhatsApp
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
      </Grid2>
      {/* TODO: Localize text */}
      <Grid2 xs={12}>
        <Masonry columns={{ xs: 1, md: 2 }} spacing={2}>
          <Box>
            <Typography variant="button" paragraph>
              EDUCATION
            </Typography>
            <Grid2 container>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  2018—2021
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="body2">
                  <b>Post-Bacc Initial License:</b> Music Education K-12
                </Typography>
                <Typography variant="overline">Gordon College, Boston</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  2015—2016
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="body2">
                  <b>Graduate Diploma:</b> Viola Performance
                </Typography>
                <Typography variant="overline">Boston Conservatory</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  2013—2015
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="body2">
                  <b>Master of Music:</b> Viola Performance
                </Typography>
                <Typography variant="overline">University of Maryland, College Park</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  2009—2013
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="body2">
                  <b>Bachelor of Music:</b> Viola Performance
                </Typography>
                <Typography variant="overline">Indiana University, Bloomington</Typography>
              </Grid2>
            </Grid2>
          </Box>
          <Box>
            <Typography variant="button" paragraph>
              TEACHING EXPERIENCE
            </Typography>
            <Grid2 container>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  Sep 2016 – Jun 2021
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="overline">
                  <b>Bridge Boston Charter School</b>
                  <br />
                  El Sistema Music Program, Roxbury, MA
                </Typography>
                <Typography variant="body2">
                  <b>Master Teacher:</b>
                </Typography>
                <Typography variant="body2" paragraph>
                  Kindergarten general music, 1st and 2nd grade violin & cello ensemble and 1st and
                  2nd grade general music
                </Typography>
                <Typography variant="body2">
                  <b>Assistant Teacher:</b>
                </Typography>
                <Typography variant="body2" paragraph>
                  String orchestra, viola, violin and cello sectionals, 3rd through 8th grade
                </Typography>
                <Typography variant="body2">
                  <b>Violin and Viola Teaching Artist:</b>
                </Typography>
                <Typography variant="body2">3rd through 8th grade</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  Aug 2015 – Oct 2018
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="overline">
                  <b>South Shore Conservatory</b> Hingham, MA
                </Typography>
                <Typography variant="body2">Suzuki Violin Teacher</Typography>
                <Typography variant="body2">Traditional Violin and Viola Teacher</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  Sep 2013 – May 2015
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="overline">
                  <b>University of Maryland, College Park</b>
                </Typography>
                <Typography variant="body2">
                  Graduate Assistant: Orchestra Ensemble Assistant
                </Typography>
                <Typography variant="body2">
                  University of Maryland Repertoire Orchestra Section Coach
                </Typography>
                <Typography variant="body2">Viola Technique Class Instructor</Typography>
              </Grid2>
              <Grid2 xs={3}>
                <Typography variant="subtitle2" align="right">
                  May 2014, Aug 2013
                </Typography>
              </Grid2>
              <Grid2 xs={9}>
                <Typography variant="overline">
                  <b>MusAid, El Salvador Project</b>
                  <br />
                  El Salvador Sistema, San Salvador
                </Typography>
                <Typography variant="body2">
                  Viola Instructor: masterclasses, group classes and private instruction
                </Typography>
                <Typography variant="body2">Viola Pedagogy Instructor</Typography>
              </Grid2>
            </Grid2>
          </Box>
        </Masonry>
      </Grid2>
    </Grid2>
  )
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          {atLeastSm ? (
            <Card>
              <CardContent>{content}</CardContent>
            </Card>
          ) : (
            content
          )}
        </Grid2>
      </Grid2>
    </Container>
  )
}
