import React, { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { Alert, AlertTitle, Link } from '@mui/material'
import { scrollToTop } from '../util/window'
import Grid2 from '@mui/material/Unstable_Grid2'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'

export const userHidAnnouncement: () => boolean = () => {
  try {
    return localStorage.getItem('hideAnnouncement') === 'true'
  } catch (e) {
    console.error(
      `Could not load hideAnnouncement preferences from localStorage. Details: ${
        (e as Error).message
      }`
    )
    return false
  }
}

interface AnnouncementTexts extends LocalizedData {
  alert?: (hide: () => void, navigate?: NavigateFunction) => React.ReactNode
}

const EN_US: AnnouncementTexts = {
  alert: (hide: () => void, navigate?: NavigateFunction) => (
    <Alert severity="info" sx={{ borderRadius: 0 }} onClose={hide}>
      <AlertTitle>NOW ACCEPTING STUDENTS FOR SCHOOL YEAR 2023-2024</AlertTitle>
      <Link
        color="inherit"
        href=""
        onClick={(e) => {
          e.preventDefault()
          navigate?.('/contact')
          scrollToTop()
        }}
        rel="noreferrer"
        target="_blank">
        Click here
      </Link>{' '}
      to contact me and schedule a trial lesson.
    </Alert>
  )
}

const RO_RO: AnnouncementTexts = {
  alert: (hide: () => void, navigate?: NavigateFunction) => (
    <Alert severity="info" sx={{ borderRadius: 0 }} onClose={hide}>
      <AlertTitle>ACUM PRIMESC ÎNSCRIERI PENTRU ANUL ȘCOLAR 2023-2024</AlertTitle>
      <Link
        color="inherit"
        href=""
        onClick={(e) => {
          e.preventDefault()
          navigate?.('/contact')
          scrollToTop()
        }}
        rel="noreferrer"
        target="_blank">
        Contactează-mă
      </Link>{' '}
      pentru a programa o lecție de probă.
    </Alert>
  )
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function Announcement() {
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(Announcement.name, TEXTS), [])
  const navigate = useNavigate()

  const componentStrings = localeManager.componentStrings(Announcement.name) as AnnouncementTexts

  return (
    <Grid2 container>
      {componentStrings.alert && (
        <Grid2 xs={12}>{componentStrings.alert(() => announcementManager.hide(), navigate)}</Grid2>
      )}
    </Grid2>
  )
}
