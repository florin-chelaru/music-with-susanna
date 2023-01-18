import React, { useContext, useMemo } from 'react'
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import PhotoCard from '../Components/PhotoCard'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { useNavigate } from 'react-router-dom'
import { LESSONS_TEXTS, LessonsTexts } from '../data/LessonsTexts'
import { withBaseURL } from '../util/string'

export interface LessonsProps {}

export default function Lessons({}: LessonsProps) {
  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const md = useMediaQuery(theme.breakpoints.up('md'))
  const xs = useMediaQuery(theme.breakpoints.up('xs'))

  const navigate = useNavigate()
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const strings = localeManager.globalStringList

  useMemo(() => localeManager.registerComponentStrings(Lessons.name, LESSONS_TEXTS), [])

  const componentStrings = localeManager.componentStrings(Lessons.name) as LessonsTexts

  const intro = (
    <Grid2 container>
      <Grid2 xs={12} md={6} sx={{ display: 'flex' }}>
        <CardMedia
          component="img"
          // TODO: Breakpoints
          image={withBaseURL(
            md
              ? '/static/img/lessons/teaching-violin-01.jpeg'
              : '/static/img/lessons/teaching-violin-02.jpeg'
          )}
          alt="Private violin lesson"
          sx={{
            minWidth: '100%',
            minHeight: '100%',
            objectPosition: 'left'
          }}
        />
      </Grid2>
      <Grid2 xs={12} sm={12} md={6}>
        <CardContent>{componentStrings.intro}</CardContent>
        <CardActions sx={{ justifyContent: 'center' }}>
          <Button size="small" variant="contained" onClick={() => navigate('/contact')}>
            {strings.signUp}
          </Button>
        </CardActions>
      </Grid2>
    </Grid2>
  )

  const philosophy = (
    <>
      <Typography variant="h5" paragraph>
        {componentStrings.philosophyTitle}
      </Typography>
      <Typography variant="body1" paragraph>
        {componentStrings.philosophy}
      </Typography>
      <Card>
        <Grid2 container>
          <Grid2 xs={12}>
            {xs && !sm && (
              <CardMedia
                component="img"
                image={withBaseURL('/static/img/lessons/dylan-trophy.jpeg')}
                alt={componentStrings.suzukiPhotoCaption}
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                {componentStrings.suzukiTitle}
              </Typography>
              {sm && (
                <PhotoCard
                  image={withBaseURL('/static/img/lessons/dylan-trophy.jpeg')}
                  alt={componentStrings.suzukiPhotoCaption}
                  caption={componentStrings.suzukiPhotoCaption}
                  sx={{
                    float: { xs: 'none', sm: 'right' },
                    maxWidth: { xs: 'none', sm: 400 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                {componentStrings.suzuki}
              </Typography>
            </CardContent>
          </Grid2>
        </Grid2>
      </Card>
      <Card sx={{ mt: 2 }}>
        <Grid2 container>
          <Grid2 xs={12}>
            {xs && !md && (
              <CardMedia
                component="img"
                image={withBaseURL('/static/img/lessons/teaching-group-violin-01.jpeg')}
                alt={componentStrings.elSistemaPhotoCaption}
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                {componentStrings.elSistemaTitle}
              </Typography>
              {md && (
                <PhotoCard
                  image={withBaseURL('/static/img/lessons/teaching-group-violin-01.jpeg')}
                  alt={componentStrings.elSistemaPhotoCaption}
                  caption={componentStrings.elSistemaPhotoCaption}
                  sx={{
                    float: { xs: 'none', sm: 'right' },
                    maxWidth: { xs: 'none', sm: 500 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                {componentStrings.elSistema}
              </Typography>
            </CardContent>
          </Grid2>
        </Grid2>
      </Card>
      <Card sx={{ mt: 2 }}>
        <Grid2 container>
          <Grid2 xs={12}>
            {xs && !md && (
              <CardMedia
                component="img"
                image={withBaseURL('/static/img/lessons/teaching-group-violin-02.jpeg')}
                alt={componentStrings.firstStepsPhotoCaption}
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                {componentStrings.firstStepsTitle}
              </Typography>
              {md && (
                <PhotoCard
                  image={withBaseURL('/static/img/lessons/teaching-group-violin-02.jpeg')}
                  alt={componentStrings.firstStepsPhotoCaption}
                  caption={componentStrings.firstStepsPhotoCaption}
                  sx={{
                    float: { xs: 'none', md: 'right' },
                    maxWidth: { xs: 'none', md: 500 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                {componentStrings.firstSteps}
              </Typography>
            </CardContent>
          </Grid2>
        </Grid2>
      </Card>
    </>
  )

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Card>{intro}</Card>
        </Grid2>
        <Grid2 xs={12}>{philosophy}</Grid2>
      </Grid2>
    </Container>
  )
}
