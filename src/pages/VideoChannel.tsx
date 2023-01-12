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
              I originally started the channel during the pandemic to reach my students while
              schools were closed. Since then, it has evolved to become a source of musical games,
              songs, read-alouds and arrangements for students, parents and teachers. My future
              vision for the channel is to create arrangements of Romanian children’s songs and
              guides for parents of children studying violin and viola.
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
