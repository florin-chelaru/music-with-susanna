import React, { useContext } from 'react'
import { Card, CardMedia, Collapse, Container, Divider, Typography } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import VideosMasonry from '../Components/VideosMasonry'
import { SelectedVideoContext, SelectedVideoManager } from '../store/SelectedVideoProvider'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandMoreButton from '../Components/ExpandMoreButton'

export default function VideoChannel() {
  const selectedVideoManager = useContext<SelectedVideoManager>(SelectedVideoContext)
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12}>
            <Card>
              <CardMedia
                component="iframe"
                height="400"
                src={`https://www.youtube.com/embed/${selectedVideoManager.selectedVideoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Card>
          </Grid2>
          <Grid2 xs={12}>
            <Typography variant="body1">
              Text about how the available materials for children in Romanian are not that great,
              and you wanted to do something better. Lorem ipsum dolor sit amet. Quo vero
              consequatur et error magnam qui perspiciatis inventore ad inventore repellat ut
              galisum necessitatibus et maxime rerum qui corrupti beatae. Ut ducimus placeat aut
              iste ipsum aut aliquam eaque qui nostrum soluta est quis voluptas et corrupti
              voluptates ea deleniti aliquid.
            </Typography>
          </Grid2>
          <Grid2 xs={12}>
            <Collapse in={expanded} timeout="auto" collapsedSize={480}>
              <VideosMasonry
                onVideoSelected={(videoId) => {
                  selectedVideoManager.setSelectedVideo(videoId)
                  // Using setTimeout to call scrollIntoView asynchronously
                  setTimeout(() => {
                    scrollTo({ top: 0 })
                  }, 0)
                }}
              />
            </Collapse>
          </Grid2>

          <Grid2 xs={12}>
            <Divider variant="middle" sx={{ m: 1 }}>
              <ExpandMoreButton
                color="primary"
                expand={expanded}
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more">
                <ExpandMoreIcon />
              </ExpandMoreButton>
            </Divider>
          </Grid2>
        </Grid2>
      </Container>
    </>
  )
}
