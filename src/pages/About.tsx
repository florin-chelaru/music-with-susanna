import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { Masonry } from '@mui/lab'
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
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Announcement from '../Components/Announcement'
import PhotoCard from '../Components/PhotoCard'
import { ABOUT_TEXTS, AboutTexts } from '../data/Resume'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { withBaseURL } from '../util/string'
import { scrollToTop } from '../util/window'
import './About.css'
import { useMediaPrint } from '../hooks/useMediaPrint'

export interface AboutProps {}

export default function About({}: AboutProps) {
  const theme = useTheme()
  const atLeastSm = useMediaQuery(theme.breakpoints.up('sm'))

  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const strings = localeManager.globalStringList

  useMemo(() => localeManager.registerComponentStrings(About.name, ABOUT_TEXTS), [])

  const componentStrings = localeManager.componentStrings(About.name) as AboutTexts

  const navigate = useNavigate()
  const mediaPrint = useMediaPrint()

  const content = (
    <Grid2 container>
      <Grid2 xs={12} sm={4}>
        <PhotoCard
          image={withBaseURL('/static/img/bio-photo.jpeg')}
          alt="Susanna Johnson-Chelaru"
        />
      </Grid2>
      <Grid2 xs={12} sm={8}>
        <Typography variant="h5">SUSANNA JOHNSON-CHELARU</Typography>
        <Typography variant="subtitle2">{componentStrings.subtitle}</Typography>
        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
          <FormatQuoteIcon />
          {componentStrings.intro}
        </Typography>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            navigate('/contact')
            scrollToTop()
          }}
          className="no-print">
          {strings.contact}
        </Button>
      </Grid2>
      <Grid2 xs={12} spacing={2}>
        <Masonry columns={{ xs: 1, md: mediaPrint ? 1 : 2 }} defaultSpacing={2} spacing={2}>
          {componentStrings.resume.sections.map((section, i) => (
            <Box key={`section-${i}`}>
              <Typography variant="button" paragraph>
                {section.title}
              </Typography>
              <Grid2 container>
                {section.entries.map((entry, j) => (
                  <React.Fragment key={`entry-${j}`}>
                    <Grid2 xs={3}>
                      <Typography variant="subtitle2" align="right" sx={{ whiteSpace: 'pre-line' }}>
                        {entry.dates}
                      </Typography>
                    </Grid2>
                    <Grid2 xs={9}>{entry.content}</Grid2>
                  </React.Fragment>
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
              {!announcementManager.hidden && <Announcement />}
              <CardContent>{content}</CardContent>
            </Card>
          ) : (
            <>
              {!announcementManager.hidden && <Announcement />}
              {content}
            </>
          )}
          {mediaPrint && <Box className="print-container">{content}</Box>}
        </Grid2>
      </Grid2>
    </Container>
  )
}
