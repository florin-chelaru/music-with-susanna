import React, { useContext } from 'react'
import { Avatar, Stack } from '@mui/material'
import Typography from '@mui/material/Typography'
import { Masonry } from '@mui/lab'
import Grid2 from '@mui/material/Unstable_Grid2'
import { LocaleContext, LocaleManager } from '../store/LocaleProvider'
import VideoThumbnailCard, { VideoThumbnailCardProps } from './VideoThumbnailCard'

export default function VideosMasonry() {
  const strings = useContext<LocaleManager>(LocaleContext).stringList
  const videoCardProps: VideoThumbnailCardProps[] = [
    {
      title: 'Funny Face: all verses!',
      image: '/static/img/youtube-thumbs/funny-face.webp',
      href: 'https://www.youtube.com/watch?v=JcpDpruZkr0&ab_channel=MusicwithMs.Johnson'
    },
    {
      title: "A fost odat' un om ciudat (+cat bloopers!)",
      image: '/static/img/youtube-thumbs/a-fost-odat-un-om-ciudat_anim.webp',
      href: 'https://www.youtube.com/watch?v=2d2D0xiuBSM&ab_channel=MusicwithMs.Johnson'
    },
    {
      title: 'Move-It: Waltz in A Flat',
      image: '/static/img/youtube-thumbs/move-it-waltz-in-a-flat.webp',
      href: 'https://www.youtube.com/watch?v=o-uqmZ5puw0&ab_channel=MusicwithMs.Johnson'
    },
    {
      title: 'Oac Oac (English)',
      image: '/static/img/youtube-thumbs/oac-oac_anim.webp',
      href: 'https://www.youtube.com/watch?v=hNqLF8niKto&ab_channel=MusicwithMs.Johnson'
    },
    {
      title: 'Packing for a Picnic with Bach',
      image: '/static/img/youtube-thumbs/picnic-with-bach.webp',
      href: 'https://www.youtube.com/watch?v=XQ-yVsm80Ec&ab_channel=MusicwithMs.Johnson'
    },
    {
      title: 'Vocal warm up: Basketball and Charlie over the Ocean',
      image: '/static/img/youtube-thumbs/vocal-warm-up.webp',
      href: 'https://www.youtube.com/watch?v=VQ59EtVr6UM&ab_channel=MusicwithMs.Johnson'
    }
  ]
  return (
    <>
      <Grid2 container>
        <Grid2 xs={12}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              m: 'auto'
            }}>
            <Avatar
              alt="Susanna Johnson"
              src="/static/img/youtube-thumbs/avatar-3.jpeg"
              sx={{
                width: 66,
                height: 66
              }}
            />
            <Typography variant="h5" gutterBottom component="div">
              {strings.musicWithMsJohnson}
            </Typography>
          </Stack>
        </Grid2>
        <Grid2 xs={12}>
          <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2} sx={{ m: 0, p: 0 }}>
            {videoCardProps.map((props, i) => (
              <VideoThumbnailCard key={i} {...props} />
            ))}
          </Masonry>
        </Grid2>
      </Grid2>
    </>
  )
}
