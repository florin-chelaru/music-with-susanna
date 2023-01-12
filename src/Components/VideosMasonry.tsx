import React, { useState } from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import VideoThumbnailCard, { VideoThumbnailCardProps } from './VideoThumbnailCard'
import YOUTUBE_VIDEOS from '../data/YouTubeVideos'
import InfiniteScroll from 'react-infinite-scroller'
import { ImageList, useMediaQuery, useTheme } from '@mui/material'

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

  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const md = useMediaQuery(theme.breakpoints.up('md'))

  const itemsPerPage = 6
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [records, setRecords] = useState(itemsPerPage)
  const loadMore = () => {
    setInitialLoad(false)
    console.log(`loading more. records: ${records}`)
    if (records >= YOUTUBE_VIDEOS.length) {
      setHasMore(false)
    } else {
      setRecords(records + itemsPerPage)
    }
  }

  return (
    <>
      <Grid2 container>
        <Grid2 xs={12}>
          <InfiniteScroll
            initialLoad={initialLoad}
            pageStart={0}
            loadMore={loadMore}
            hasMore={hasMore}
            loader={<h4 className="loader">Loading...</h4>}
            useWindow={true}>
            <ImageList cols={md ? 3 : sm ? 2 : 1} gap={16}>
              {videoCardProps.slice(0, records).map((props, i) => (
                <VideoThumbnailCard key={i} onSelected={onVideoSelected} {...props} />
              ))}
            </ImageList>
          </InfiniteScroll>
        </Grid2>
      </Grid2>
    </>
  )
}
