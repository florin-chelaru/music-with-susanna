import React from 'react'
import { Card, CardActions, CardMedia, Link } from '@mui/material'
import Typography from '@mui/material/Typography'
import Fab from '@mui/material/Fab'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Grid2 from '@mui/material/Unstable_Grid2'

export interface VideoThumbnailCardProps {
  image: string
  title: string
  videoId: string
  onSelected?: (href: string) => void
}

const VideoThumbnailCard = React.memo(
  ({ image, title, videoId, onSelected }: VideoThumbnailCardProps) => {
    return (
      <Card>
        <CardMedia component="img" image={image} />
        <CardActions sx={{ position: 'relative', p: 0 }}>
          <Grid2 container sx={{ width: '100%', p: 0, m: 0 }}>
            <Grid2 xs={9} xsOffset={3}>
              <Typography variant="body1" sx={{ fontSize: 14 }}>
                <Link
                  href="#"
                  color="inherit"
                  underline="hover"
                  onClick={(e) => {
                    e.preventDefault()
                    onSelected?.(videoId)
                  }}>
                  {title}
                </Link>
              </Typography>
            </Grid2>
          </Grid2>
          <Fab
            aria-label="play"
            color="error"
            size="small"
            sx={{ position: 'absolute', top: -20, left: 10 }}
            onClick={() => onSelected?.(videoId)}>
            <PlayArrowIcon />
          </Fab>
        </CardActions>
      </Card>
    )
  }
)

export default VideoThumbnailCard
