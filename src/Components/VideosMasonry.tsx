import { ImageList, useMediaQuery, useTheme } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useState } from 'react'
import InfiniteScroll from 'react-infinite-scroller'
import YOUTUBE_VIDEOS from '../data/YouTubeVideos'
import VideoThumbnailCard, { VideoThumbnailCardProps } from './VideoThumbnailCard'

export interface VideoMasonryProps {
  onVideoSelected?: (video: string) => void
  onVideoDelete?: (video: string) => void
  maxVideos?: number
  videos?: any[]
  cols?: number
}

export default function VideosMasonry({
  onVideoSelected,
  onVideoDelete,
  maxVideos,
  videos = YOUTUBE_VIDEOS,
  cols
}: VideoMasonryProps) {
  const videoCardProps: VideoThumbnailCardProps[] = videos
    .map((v) => ({
      image: v.snippet.thumbnails.high.url,
      title: v.snippet.title,
      videoId: v.videoId
    }))
    .slice(0, maxVideos ?? videos.length)

  const theme = useTheme()
  const md = useMediaQuery(theme.breakpoints.up('md'))
  cols = cols ?? (md ? 3 : 2)

  const itemsPerPage = 8
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [records, setRecords] = useState(itemsPerPage)
  const loadMore = () => {
    setInitialLoad(false)
    if (records >= videos.length) {
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
            <ImageList cols={cols} gap={16}>
              {videoCardProps.slice(0, records).map((props, i) => (
                <VideoThumbnailCard
                  key={`thumbnail-${i}`}
                  onSelected={onVideoSelected}
                  onDelete={onVideoDelete}
                  {...props}
                />
              ))}
            </ImageList>
          </InfiniteScroll>
        </Grid2>
      </Grid2>
    </>
  )
}
