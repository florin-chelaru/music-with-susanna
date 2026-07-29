import { useEffect, useState } from 'react'
import YouTubeVideo from './YouTubeVideo'

const FETCH_YOUTUBE_VIDEO_ENDPOINT =
  'https://europe-west1-music-with-susanna.cloudfunctions.net/fetchYoutubeVideo'

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.slice(7).split('?')[0] || null
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
  } catch (_) {}
  return null
}

export function toYouTubeEmbedUrl(url: string): string {
  const videoId = extractYouTubeVideoId(url)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

export async function fetchYouTubeVideo(
  videoId: string,
  accessToken?: string
): Promise<YouTubeVideo> {
  const response = await fetch(`${FETCH_YOUTUBE_VIDEO_ENDPOINT}?videoId=${videoId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as YouTubeVideo
}

export function useYouTubeMetadata(
  url: string,
  accessToken?: string
): { data: YouTubeVideo | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<YouTubeVideo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    const timeout = setTimeout(() => {
      void fetchYouTubeVideo(videoId, accessToken).then(
        (result) => {
          if (!cancelled) {
            setData(result)
            setLoading(false)
          }
        },
        (err: unknown) => {
          if (!cancelled) {
            setError(String(err))
            setData(null)
            setLoading(false)
          }
        }
      )
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [url, accessToken])

  return { data, loading, error }
}
