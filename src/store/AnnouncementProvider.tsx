import React, { createContext, useMemo, useState } from 'react'

export const SHOW_ANNOUNCEMENT: boolean = false // switch to true to show the announcement by default
export const HIDE_ANNOUNCEMENT_COOKIE = 'hideAnnouncement01'

export interface AnnouncementHandler {
  readonly hidden: boolean

  hide(): void
}

class AnnouncementManager implements AnnouncementHandler {
  private hidden_: boolean

  constructor() {
    let hidden = false

    try {
      hidden = !SHOW_ANNOUNCEMENT || localStorage.getItem(HIDE_ANNOUNCEMENT_COOKIE) === 'true'
    } catch (e) {
      console.error(
        `Could not load announcement preferences from localStorage. Details: ${
          (e as Error).message
        }`
      )
    }
    this.hidden_ = hidden
  }

  hide(): void {
    this.hidden_ = true
    try {
      localStorage.setItem(HIDE_ANNOUNCEMENT_COOKIE, 'true')
    } catch (e) {
      console.error(
        `Could not save the announcement preferences for the user: ${(e as Error).message}`
      )
    }
  }

  get hidden(): boolean {
    return this.hidden_
  }
}

class AnnouncementManagerWrapper implements AnnouncementHandler {
  private readonly announcementManager: AnnouncementManager
  private readonly hideAnnouncement: () => void

  constructor(announcementManager: AnnouncementManager, hideAnnouncement: () => void) {
    this.announcementManager = announcementManager
    this.hideAnnouncement = hideAnnouncement
  }

  get hidden(): boolean {
    return this.announcementManager.hidden
  }

  hide() {
    this.announcementManager.hide()
    this.hideAnnouncement()
  }
}

export const AnnouncementContext = createContext<AnnouncementHandler>(new AnnouncementManager())

export interface AnnouncementProviderProps {
  children: JSX.Element | JSX.Element[]
}

const AnnouncementProvider = ({ children }: AnnouncementProviderProps) => {
  const [hidden, setHidden] = useState<boolean | undefined>(!SHOW_ANNOUNCEMENT)

  const announcementManager = useMemo<AnnouncementManager>(() => new AnnouncementManager(), [])

  const announcementWrapper = useMemo(
    () => new AnnouncementManagerWrapper(announcementManager, () => setHidden(true)),
    [hidden]
  )

  return (
    <AnnouncementContext.Provider value={announcementWrapper}>
      {children}
    </AnnouncementContext.Provider>
  )
}
export default AnnouncementProvider
