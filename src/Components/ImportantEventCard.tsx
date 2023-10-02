import React, { useContext, useMemo } from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import { Card, CardContent, CardMedia, Link } from '@mui/material'
import Typography from '@mui/material/Typography'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { useNavigate } from 'react-router-dom'
import { withBaseURL } from '../util/string'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'

interface ImportantEventCardTexts extends LocalizedData {
  content: React.ReactNode
  mediaDescription: string
}

const EN_US: ImportantEventCardTexts = {
  content: (
    <>
      Listen to my recent{' '}
      <Link
        color="inherit"
        href="http://www.radioiasi.ro/emisiuni/povestea-unei-americance-care-sustine-cursuri-de-vioara-la-iasi-susanna-johnson-chelaru-muzica-prin-invatarea-unui-instrument-face-parte-din-umanitate-din-fiinta-umana-si-ne-hraneste-su/"
        rel="noreferrer"
        target="_blank">
        interview at Radio Iași
      </Link>
      , on <i>Weekend cu Prietenii with Horia Daraban</i> where I told the story of how I moved to
      Iași and talked about my teaching method.
    </>
  ),
  mediaDescription: 'Interview in Romanian with Susanna Johnson-Chelaru at Radio Iași'
}

const RO_RO: ImportantEventCardTexts = {
  content: (
    <>
      Ascultă{' '}
      <Link
        color="inherit"
        href="http://www.radioiasi.ro/emisiuni/povestea-unei-americance-care-sustine-cursuri-de-vioara-la-iasi-susanna-johnson-chelaru-muzica-prin-invatarea-unui-instrument-face-parte-din-umanitate-din-fiinta-umana-si-ne-hraneste-su/"
        rel="noreferrer"
        target="_blank">
        interviul meu de la Radio Iași
      </Link>
      , din emisiunea <i>Weekend cu Prietenii cu Horia Daraban</i>, unde am povestit ce m-a adus la
      Iași și am vorbit despre metoda pedagogică pe care o folosesc.
    </>
  ),
  mediaDescription: 'Interviu cu Susanna Johnson-Chelaru la Radio Iași'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function ImportantEventCard() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(ImportantEventCard.name, TEXTS), [])
  const componentStrings = localeManager.componentStrings(
    ImportantEventCard.name
  ) as ImportantEventCardTexts
  const navigate = useNavigate()

  return (
    <Card>
      <Grid2 container>
        <Grid2
          xs={4}
          sx={{
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
          <CardMedia
            component="img"
            // TODO: Use breakpoint images (smaller images for smaller screens)
            image={withBaseURL('/static/img/radio-iasi-logo.svg')}
            alt="Radio Iași"
            // For getting the image to stretch to the available space.
            // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
            sx={{
              flexShrink: 0,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </Grid2>
        <Grid2 xs={8}>
          <CardContent>
            <Typography gutterBottom variant="body2">
              {componentStrings.content}
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <audio
                style={{ width: '100%' }}
                controls
                src={withBaseURL('/static/audio/susanna-johnson-radio-iasi-interview.mpeg')}>
                <a href={withBaseURL('/static/audio/susanna-johnson-radio-iasi-interview.mpeg')}>
                  {componentStrings.mediaDescription}
                </a>
              </audio>
            </Box>
          </CardContent>
        </Grid2>
      </Grid2>
    </Card>
  )
}
