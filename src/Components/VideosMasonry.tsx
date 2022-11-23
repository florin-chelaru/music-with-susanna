import React from 'react'
import { Masonry } from '@mui/lab'
import Grid2 from '@mui/material/Unstable_Grid2'
import VideoThumbnailCard, { VideoThumbnailCardProps } from './VideoThumbnailCard'

export interface VideoMasonryProps {
  onVideoSelected?: (video: string) => void
}

export default function VideosMasonry({ onVideoSelected }: VideoMasonryProps) {
  const videoCardProps: VideoThumbnailCardProps[] = [
    {
      title: 'Funny Face: all verses!',
      image: '/static/img/youtube-thumbs/funny-face.webp',
      videoId: 'JcpDpruZkr0'
    },
    {
      title: "A fost odat' un om ciudat (+cat bloopers!)",
      image: '/static/img/youtube-thumbs/a-fost-odat-un-om-ciudat_anim.webp',
      videoId: '2d2D0xiuBSM'
    },
    {
      title: 'Move-It: Waltz in A Flat',
      image: '/static/img/youtube-thumbs/move-it-waltz-in-a-flat.webp',
      videoId: 'o-uqmZ5puw0'
    },
    {
      title: 'Oac Oac (English)',
      image: '/static/img/youtube-thumbs/oac-oac_anim.webp',
      videoId: 'hNqLF8niKto'
    },
    {
      title: 'Packing for a Picnic with Bach',
      image: '/static/img/youtube-thumbs/picnic-with-bach.webp',
      videoId: 'XQ-yVsm80Ec'
    },
    {
      title: 'Vocal warm up: Basketball and Charlie over the Ocean',
      image: '/static/img/youtube-thumbs/vocal-warm-up.webp',
      videoId: 'VQ59EtVr6UM'
    }
  ]
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
