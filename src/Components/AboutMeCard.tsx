import React, { useContext } from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import { Button, Card, CardActions, CardContent, CardMedia } from '@mui/material'
import Typography from '@mui/material/Typography'
import { LocaleContext, LocaleManager } from '../store/LocaleProvider'

export default function AboutMeCard() {
  const strings = useContext<LocaleManager>(LocaleContext).stringList
  return (
    <Card>
      <Grid2 container>
        <Grid2 xs={12} sm={6} md={4}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'center',
              height: '100%'
            }}>
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                {strings.aboutMe.toUpperCase()}
              </Typography>
              <Typography gutterBottom variant="subtitle2" component="div">
                Susanna Johnson, {strings.musicTeacher}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {strings.aboutMeTextShort}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">
                {strings.readMore}
              </Button>
            </CardActions>
          </Box>
        </Grid2>
        <Grid2
          xs={12}
          sm={6}
          md={8}
          // sx={{ position: 'relative' }}
        >
          {/* TODO: Use breakpoint images (smaller images for smaller screens) */}
          <CardMedia component="img" image="/static/img/img-01_4000x4000.jpeg" alt="green iguana" />
          {/*<Typography*/}
          {/*  sx={{*/}
          {/*    position: 'absolute',*/}
          {/*    top: '20px',*/}
          {/*    left: '20px',*/}
          {/*    color: 'black',*/}
          {/*    backgroundColor: 'white'*/}
          {/*  }}>*/}
          {/*  this text should overlay the image*/}
          {/*</Typography>*/}
        </Grid2>
      </Grid2>
    </Card>
  )
}
