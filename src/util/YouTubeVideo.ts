export interface Thumbnail {
  url: string
  width: number
  height: number
}

export interface ThumbnailSizes {
  default: Thumbnail
  medium: Thumbnail
  high: Thumbnail
}

export interface VideoMetadata {
  publishedAt: string
  title: string
  description: string
  thumbnails: ThumbnailSizes
}

export default interface YouTubeVideo {
  videoId: string
  snippet: VideoMetadata
}
