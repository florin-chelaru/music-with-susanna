import React from 'react'
import { Card, CardActions, CardMedia } from '@mui/material'
import Typography from '@mui/material/Typography'
import Fab from '@mui/material/Fab'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Grid2 from '@mui/material/Unstable_Grid2'

export interface VideoThumbnailCardProps {
  image: string
  title: string
  href: string
}

const VideoThumbnailCard = React.memo(({ image, title, href }: VideoThumbnailCardProps) => {
  return (
    <Card>
      <CardMedia component="img" image={image} />
      <CardActions sx={{ position: 'relative', p: 0 }}>
        <Grid2 container sx={{ width: '100%', p: 0, m: 0 }}>
          <Grid2 xs={9} xsOffset={3}>
            <Typography variant="body1" sx={{ fontSize: 14 }}>
              {title}
            </Typography>
          </Grid2>
        </Grid2>
        <Fab
          aria-label="play"
          color="error"
          size="small"
          sx={{ position: 'absolute', top: -20, left: 10 }}
          href={href}>
          <PlayArrowIcon />
        </Fab>
      </CardActions>
    </Card>
  )
})

export default VideoThumbnailCard
