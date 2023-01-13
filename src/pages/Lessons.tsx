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
      <Grid2
        xs={12}
        md={6}
        // For getting the image to stretch to the available space.
        // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
        sx={{
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
        <CardMedia
          component="img"
          // TODO: Breakpoints
          image={
            md
              ? '/static/img/lessons/teaching-violin-01.jpeg'
              : '/static/img/lessons/teaching-violin-02.jpeg'
          }
          // TODO: Localize
          alt="Private violin lesson"
          // For getting the image to stretch to the available space.
          // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
          sx={{
            flexShrink: 0,
            minWidth: '100%',
            minHeight: '100%'
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
        TEACHING PHILOSOPHY
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
                image="/static/img/lessons/dylan-trophy.jpeg"
                alt="Dylan age six, just earned his 30-day practice trophy"
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                THE SUZUKI METHOD
              </Typography>
              {sm && (
                <PhotoCard
                  image="/static/img/lessons/dylan-trophy.jpeg"
                  // TODO: Localize
                  alt="Dylan age six, just earned his 30-day practice trophy"
                  caption="Dylan age six, just earned his 30-day practice trophy"
                  sx={{
                    float: { xs: 'none', sm: 'right' },
                    maxWidth: { xs: 'none', sm: 400 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                The Suzuki Method has a long established history of success of more than fifty years
                originating from Japan, and spreading to the United States, to Europe and worldwide.
                Suzuki teachers believe every child can learn music. Founder of the method, Shinichi
                Suzuki, described the method as the “mother-tongue approach”. As an officially
                trained Suzuki teacher (Suzuki Violin Levels 1 & 2 Certification in 2012 and 2014),
                Susanna follows the mother-tongue approach that imitates natural native language
                acquisition. In the Suzuki Method, children start learning music at a very young age
                (as young as 3 years old). As part of the mother-tongue approach of music learning,
                Susanna implements listening, repetition and review, and delayed note-reading (as
                children learn to read after they speak the language). Another very important aspect
                of the Suzuki Method when children are very young is parental participation. Parents
                sit in on lessons, participate in the activities with the child during the lesson
                and assist the children with practice at home. This is no burden as every lesson is
                joyful, and full of games and activities that ease the learning. At the same time,
                Susanna believes in holding every child to a high standard and promoting motivation
                through achievement. Susanna uses a combination of the Suzuki Method repertoire and
                repertoire collected throughout her 15+ years of teaching experience in schools and
                music programs that give students a sense of accomplishment and achievement after
                every lesson. The trick is small and deliberate steps.
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
                image="/static/img/lessons/teaching-group-violin-01.jpeg"
                alt="Susanna teaching a group class at the El Sistema program in Sibiu, Romania"
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                EL SISTEMA
              </Typography>
              {md && (
                <PhotoCard
                  image="/static/img/lessons/teaching-group-violin-01.jpeg"
                  // TODO: Localize
                  alt="Susanna teaching a group class at the El Sistema program in Sibiu, Romania"
                  caption="Susanna teaching a group class at the El Sistema program in Sibiu, Romania"
                  sx={{
                    float: { xs: 'none', sm: 'right' },
                    maxWidth: { xs: 'none', sm: 500 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                Susanna has worked in various El Sistema music programs since 2012, in the United
                States, El Salvador, Sweden and Romania, teaching group violin and string ensemble
                classes. El Sistema is a music education philosophy that originated in Venezuela in
                1975. The main philosophy behind El Sistema is that every child should have access
                to quality music education, and El Sistema programs are designed so that children
                learn together in a group setting. Susanna has adopted many of the principles and
                values from El Sistema music programs into her teaching. She believes that
                disadvantaged children should have access to quality music education. These music
                education programs should be local, convenient and very high quality. She also truly
                believes in and has seen the power and magic in group learning. Specifically,
                Susanna strives to teach group music classes the El Sistema way: with joyful and
                supportive group learning, using activities made for and made better when done in a
                group and making sure that children are able to participate in the group ensembles
                from the very beginning of their instrumental learning. El Sistema programs focus on
                intensive and joyful music making as a vehicle for social development. As such, when
                teaching group music, Susanna focuses on peer learning and using music as a tool for
                developing community and positive relationships in the group. One final very
                important aspect of El Sistema is the importance of performing in the community and
                performing often. Students in an El Sistema program should be performing within
                their first month of learning their instrument. Performing and sharing music with
                the community should be one of the main goals of an El Sistema program. Susanna
                believes that students should have as many opportunities to perform as possible,
                whether they are more informal or more formal. Frequent performances remove
                performance jitters and refocus the students on the joy of learning to play an
                instrument: through sharing it!
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
                image="/static/img/lessons/teaching-group-violin-02.jpeg"
                // TODO: Localize
                alt="Susanna teaching a group class at the Bridge Boston Charter School"
              />
            )}
            <CardContent>
              <Typography variant="h6" paragraph>
                FIRST STEPS IN MUSIC
              </Typography>
              {md && (
                <PhotoCard
                  image="/static/img/lessons/teaching-group-violin-02.jpeg"
                  // TODO: Localize
                  alt="Susanna teaching a group class at the Bridge Boston Charter School"
                  caption="Susanna teaching a group class at the Bridge Boston Charter School"
                  sx={{
                    float: { xs: 'none', md: 'right' },
                    maxWidth: { xs: 'none', md: 500 }
                  }}
                />
              )}
              <Typography variant="body1" paragraph>
                Since 2016, Susanna has been using John Feierabend’s First Steps in Music method
                from the United States to teach general music to preschool, kindergarten and
                elementary students at Bridge Boston Charter School. In the summer of 2019, Susanna
                received special training in the method at Gordon College as part of her Music
                Education License degree that she received in 2021. Feierabend’s music learning
                philosophy says that students should learn to be “tuneful”, “beatful” and “artful”.
                Tuneful children learn to hear tunes in their heads and coordinate their vocal
                muscles to sing these tunes. Beatful children feel the pulse in the music and how
                the pulse is organized in groups of 2s and 3s. Artful children are moved by music in
                the many ways music can elicit a feelingful response. The goal of a teacher of this
                method is that children who learn in this way grow to be tuneful, beatful and artful
                adults. This means that they will have the ability to participate in music that is
                interwoven throughout their lives. Tuneful adults can sing happy birthday to friends
                and family, sing lullabies to their children and sing ceremonial songs at important
                events and holidays. Beatful adults can rock to the beat while they sing that
                lullaby, dance at weddings and clap to the beat at sporting events. Artful adults
                are moved by music, seek out artful events and enjoy being moved by music. Susanna
                believes that music education is valuable to all children as it gives them the
                ability to benefit from what music has to offer. Whether or not they seek to become
                professionals in the field of music, they will be enriched by their understanding
                and their ability to share in the language of music for the rest of their lives.
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
