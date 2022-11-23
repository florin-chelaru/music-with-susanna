import React from 'react'
import { Masonry } from '@mui/lab'
import Grid2 from '@mui/material/Unstable_Grid2'
import VideoThumbnailCard, { VideoThumbnailCardProps } from './VideoThumbnailCard'
import YOUTUBE_VIDEOS from '../data/YouTubeVideos'

export interface VideoMasonryProps {
  onVideoSelected?: (video: string) => void
  maxVideos?: number
}

export default function VideosMasonry({ onVideoSelected, maxVideos }: VideoMasonryProps) {
  const videoCardProps: VideoThumbnailCardProps[] = YOUTUBE_VIDEOS.map((v) => ({
    image: v.snippet.thumbnails.high.url,
    title: v.snippet.title,
    videoId: v.videoId
  })).slice(0, maxVideos ?? YOUTUBE_VIDEOS.length)

  return (
    <>
      <Grid2 container>
        <Grid2 xs={12}>
          <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2} sx={{ m: 0, p: 0 }}>
            {videoCardProps.map((props, i) => (
              <VideoThumbnailCard key={i} onSelected={onVideoSelected} {...props} />
            ))}
          </Masonry>
        </Grid2>
      </Grid2>
    </>
  )
}
