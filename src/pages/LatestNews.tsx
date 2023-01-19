import React, { useContext } from 'react'
import Toolbar from '@mui/material/Toolbar'
import {
  Avatar,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  IconButton,
  Link,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import FacebookPostsMasonry from '../Components/FacebookPostsMasonry'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { FACEBOOK_AVATAR } from '../data/FacebookPosts'
import FacebookIcon from '@mui/icons-material/Facebook'
import { withBaseURL } from '../util/string'

export default function LatestNews() {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList
  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const xs = useMediaQuery(theme.breakpoints.up('xs'))
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Card>
            <Grid2 container>
              <Grid2
                xs={12}
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
                  image={withBaseURL('/static/img/facebook-cover-photo.jpeg')}
                  alt="Cover Photo"
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
            <CardContent sx={{ position: 'relative', p: 0 }}>
              <Avatar
                alt="Susanna Johnson-Chelaru"
                src={withBaseURL(FACEBOOK_AVATAR)}
                sx={{
                  width: 168,
                  height: 168,
                  position: 'absolute',
                  top: -84,
                  left: sm ? 30 : 'calc(50% - 84px)',
                  borderStyle: 'solid',
                  borderWidth: 5,
                  borderColor: theme.palette.background.paper
                }}
              />
              <Typography
                variant="h4"
                gutterBottom
                component={Link}
                underline="hover"
                color="inherit"
                rel="noreferrer"
                target="_blank"
                href="https://www.facebook.com/MusicwithMsJohnson"
                sx={{
                  position: 'absolute',
                  left: 208,
                  top: 15,
                  display: xs && !sm ? 'none' : 'block'
                }}>
                {strings.news}
              </Typography>
            </CardContent>
            <CardActions sx={{ pb: 2, pr: 2, pt: 2 }}>
              <IconButton
                aria-label="Share on Facebook"
                sx={{ marginLeft: 'auto' }}
                size="large"
                rel="noreferrer"
                target="_blank"
                href="https://www.facebook.com/MusicwithMsJohnson">
                <FacebookIcon fontSize="inherit" />
              </IconButton>
            </CardActions>
          </Card>
        </Grid2>
        <Grid2 xs={12}>
          <FacebookPostsMasonry />
        </Grid2>
      </Grid2>
    </Container>
  )
}
