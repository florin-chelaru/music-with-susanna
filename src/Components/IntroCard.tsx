import React, { useContext, useMemo } from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import { Button, Card, CardActions, CardContent, CardMedia, Link } from '@mui/material'
import Typography from '@mui/material/Typography'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { useNavigate } from 'react-router-dom'
import { withBaseURL } from '../util/string'
import { scrollToTop } from '../util/window'
import Announcement from './Announcement'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'

interface IntroTexts extends LocalizedData {
  title: string
  subtitle: string
  shortDescription: React.ReactNode
}

const EN_US: IntroTexts = {
  title: 'Music Lessons',
  subtitle:
    'Teach your child to play violin and viola, using established Japanese-American pedagogical methods!',
  shortDescription: (
    <>
      The{' '}
      <Link
        color="inherit"
        href="https://suzukiassociation.org/about/suzuki-method/"
        rel="noreferrer"
        target="_blank">
        Suzuki
      </Link>{' '}
      method, used by Susanna Johnson-Chelaru, is a music curriculum and teaching philosophy dating
      from the mid-20th century, created by Japanese violinist and pedagogue{' '}
      <Link
        color="inherit"
        href="https://suzukiassociation.org/about/suzuki-method/shinichi-suzuki/"
        rel="noreferrer"
        target="_blank">
        Shinichi Suzuki
      </Link>{' '}
      (1898–1998). The method aims to create an environment for learning music which parallels the
      linguistic environment of acquiring a native language.
      <br />
      <br />
      Susanna teaches violin and viola lessons in Iași,{' '}
      <Link
        href="https://maps.app.goo.gl/p2ah2YXouU2M7b8e8"
        color="inherit"
        rel="noreferrer"
        target="_blank">
        Valea Lupului (jud Iași)
      </Link>{' '}
      and in{' '}
      <Link
        href="https://maps.app.goo.gl/E6kAfDrQNgMPVDwk7"
        color="inherit"
        rel="noreferrer"
        target="_blank">
        Piața Unirii, Iași
      </Link>
      .
    </>
  )
}

const RO_RO: IntroTexts = {
  title: 'Lecții de muzică',
  subtitle:
    'Învață-l pe copilul tău să cânte la vioară sau la violă, folosind metode pedagogice consacrate din Statele Unite ale ' +
    'Americii și Japonia!',
  shortDescription: (
    <>
      Metoda{' '}
      <Link
        color="inherit"
        href="https://suzukiassociation.org/about/suzuki-method/"
        rel="noreferrer"
        target="_blank">
        Suzuki
      </Link>
      , folosită de Susanna Johnson-Chelaru, constă dintr-o curiculă muzicală și filosofie a
      predării folosite în America și Japonia încă de la jumătatea secolului 20, creată de faimosul
      violonist și pedagog{' '}
      <Link
        href="https://suzukiassociation.org/about/suzuki-method/shinichi-suzuki/"
        color="inherit"
        rel="noreferrer"
        target="_blank">
        Shinichi Suzuki
      </Link>{' '}
      (1898–1998). Metoda urmărește să creeze un mediu de învățare a muzicii asemenea mediului
      lingvistic de dobândire a limbii materne.
      <br />
      <br />
      Susanna oferă lecții de vioară și violă în{' '}
      <Link
        href="https://maps.app.goo.gl/p2ah2YXouU2M7b8e8"
        color="inherit"
        rel="noreferrer"
        target="_blank">
        Valea Lupului (jud Iași)
      </Link>{' '}
      și în{' '}
      <Link
        href="https://maps.app.goo.gl/E6kAfDrQNgMPVDwk7"
        color="inherit"
        rel="noreferrer"
        target="_blank">
        Piața Unirii, Iași
      </Link>
      .
    </>
  )
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function IntroCard() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(IntroCard.name, TEXTS), [])
  const componentStrings = localeManager.componentStrings(IntroCard.name) as IntroTexts
  const navigate = useNavigate()

  return (
    <Card>
      {!announcementManager.hidden && <Announcement />}
      <Grid2 container>
        <Grid2 xs={12} sm={8} md={4}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'center',
              height: '100%'
            }}>
            <CardContent>
              <Typography gutterBottom variant="h5" component="h1">
                {componentStrings.title.toUpperCase()}
              </Typography>
              <Typography gutterBottom variant="subtitle2" component="div">
                {componentStrings.subtitle}
              </Typography>
              <br />
              <Typography variant="body2" color="text.secondary">
                {componentStrings.shortDescription}
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => {
                  navigate('/lessons')
                  scrollToTop()
                }}>
                {strings.more}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  navigate('/contact')
                  scrollToTop()
                }}>
                {strings.contactMe}
              </Button>
            </CardActions>
          </Box>
        </Grid2>
        <Grid2
          xs={12}
          sm={4}
          md={8}
          // For getting the image to stretch to the available space.
          // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
          sx={{
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
          <CardMedia
            component="img"
            // TODO: Use breakpoint images (smaller images for smaller screens)
            image={withBaseURL('/static/img/img-01_4000x4000.jpeg')}
            alt="Susanna Johnson-Chelaru"
            // For getting the image to stretch to the available space.
            // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
            sx={{
              flexShrink: 0,
              minWidth: '100%',
              minHeight: '100%'
            }}
          />
        </Grid2>
      </Grid2>
    </Card>
  )
}
