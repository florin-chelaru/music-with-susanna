import React, { createContext } from 'react'

const DEFAULT_VIDEO_ID = '2d2D0xiuBSM' // A fost odat' un om ciudat

export class SelectedVideoManager {
  private selectedVideoId_: string
  private readonly setSelectedVideoId_?: (videoId: string) => void

  setSelectedVideo(videoId: string) {
    this.selectedVideoId_ = videoId
    this.setSelectedVideoId_?.(videoId)
  }

  get selectedVideoId(): string {
    return this.selectedVideoId_
  }

  constructor(defaultVideoId: string, setSelectedVideoId?: (videoId: string) => void) {
    this.setSelectedVideoId_ = setSelectedVideoId
    this.selectedVideoId_ = defaultVideoId
  }
}

export const SelectedVideoContext = createContext<SelectedVideoManager>(
  new SelectedVideoManager(DEFAULT_VIDEO_ID)
)

export interface SelectedVideoProviderProps {
  defaultVideoId?: string
  children: JSX.Element | JSX.Element[]
}

export default function SelectedVideoProvider({
  defaultVideoId,
  children
}: SelectedVideoProviderProps) {
  const [selectedVideoId, setSelectedVideoId] = React.useState<string>(
    defaultVideoId ?? DEFAULT_VIDEO_ID
  )
  return (
    <SelectedVideoContext.Provider
      value={new SelectedVideoManager(selectedVideoId, setSelectedVideoId)}>
      {children}
    </SelectedVideoContext.Provider>
  )
}
