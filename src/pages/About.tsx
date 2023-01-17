import React, { useContext, useMemo } from 'react'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { Masonry } from '@mui/lab'
import PhotoCard from '../Components/PhotoCard'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { ABOUT_TEXTS, AboutTexts } from '../data/Resume'
import { useNavigate } from 'react-router-dom'

export interface AboutProps {}

export default function About({}: AboutProps) {
  const theme = useTheme()
  const atLeastSm = useMediaQuery(theme.breakpoints.up('sm'))

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const strings = localeManager.globalStringList

  useMemo(() => localeManager.registerComponentStrings(About.name, ABOUT_TEXTS), [])

  const componentStrings = localeManager.componentStrings(About.name) as AboutTexts

  const navigate = useNavigate()

  const content = (
    <Grid2 container>
      <Grid2 xs={12} sm={4}>
        <PhotoCard image="/static/img/bio-photo.jpeg" alt="Susanna Johnson" />
      </Grid2>
      <Grid2 xs={12} sm={8}>
        <Typography variant="h5">SUSANNA JOHNSON-CHELARU</Typography>
        <Typography variant="subtitle2">{componentStrings.subtitle}</Typography>
        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
          <FormatQuoteIcon />
          {componentStrings.intro}
        </Typography>
        <Button size="small" variant="contained" onClick={() => navigate('/contact')}>
          {strings.contact}
        </Button>
      </Grid2>
      <Grid2 xs={12}>
        <Masonry columns={{ xs: 1, md: 2 }} spacing={2}>
          {componentStrings.resume.sections.map((section, i) => (
            <Box key={`section-${i}`}>
              <Typography variant="button" paragraph>
                {section.title}
              </Typography>
              <Grid2 container>
                {section.entries.map((entry, j) => (
                  <>
                    <Grid2 xs={3} key={`dates-${j}`}>
                      <Typography variant="subtitle2" align="right" sx={{ whiteSpace: 'pre-line' }}>
                        {entry.dates}
                      </Typography>
                    </Grid2>
                    <Grid2 xs={9} key={`content-${j}`}>
                      {entry.content}
                    </Grid2>
                  </>
                ))}
              </Grid2>
            </Box>
          ))}
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
