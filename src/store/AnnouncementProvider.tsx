import { onValue, ref, set } from 'firebase/database'
import React, { createContext, useEffect, useMemo, useState } from 'react'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import { database } from './Firebase'
import { useUser } from './UserProvider'

export const HIDE_ANNOUNCEMENT_COOKIE = 'hideAnnouncement01'

export interface AnnouncementLocaleData {
  title: string
  body: string
}

export interface AnnouncementData {
  visible: boolean
  [SupportedLocale.EN_US]: AnnouncementLocaleData
  [SupportedLocale.RO_RO]: AnnouncementLocaleData
}

export interface AnnouncementHandler {
  readonly hidden: boolean
  readonly loading: boolean
  readonly data: AnnouncementData | null

  hide(): void
  update(data: AnnouncementData): Promise<void>
}

function userDismissed(): boolean {
  try {
    return localStorage.getItem(HIDE_ANNOUNCEMENT_COOKIE) === 'true'
  } catch {
    return false
  }
}

function persistDismiss(): void {
  try {
    localStorage.setItem(HIDE_ANNOUNCEMENT_COOKIE, 'true')
  } catch (e) {
    console.error(`Could not save announcement preference: ${(e as Error).message}`)
  }
}

export const AnnouncementContext = createContext<AnnouncementHandler>({
  hidden: true,
  loading: true,
  data: null,
  hide: () => undefined,
  update: () => Promise.resolve()
})

export interface AnnouncementProviderProps {
  children: JSX.Element | JSX.Element[]
}

const AnnouncementProvider = ({ children }: AnnouncementProviderProps) => {
  const { user } = useUser()
  const [data, setData] = useState<AnnouncementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(userDismissed)

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'announcement'), (snap) => {
      setData(snap.val() as AnnouncementData | null)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const isTeacher = user?.role === UserRole.TEACHER

  const hidden = useMemo(() => {
    if (isTeacher) return false
    if (loading) return true
    if (!data?.visible) return true
    return dismissed
  }, [isTeacher, loading, data, dismissed])

  const handler = useMemo<AnnouncementHandler>(
    () => ({
      hidden,
      loading,
      data,
      hide() {
        setDismissed(true)
        persistDismiss()
      },
      async update(newData: AnnouncementData) {
        await set(ref(database, 'announcement'), newData)
      }
    }),
    [hidden, loading, data]
  )

  return <AnnouncementContext.Provider value={handler}>{children}</AnnouncementContext.Provider>
}

export default AnnouncementProvider
