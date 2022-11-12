import React, { useRef } from 'react'
import './App.css'
import DrawerAppBar, { NavItemInfo } from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'
import HomePage from './pages/HomePage'
import Grid2 from '@mui/material/Unstable_Grid2'
import CustomThemeProvider from './theme/CustomThemeProvider'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import ReviewsIcon from '@mui/icons-material/Reviews'
import YouTubeIcon from '@mui/icons-material/YouTube'
import { scrollToElement } from './util/window'

function App() {
  const homeRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const youtubeChannelRef = useRef<HTMLDivElement>(null)
  const navItems: NavItemInfo[] = [
    {
      key: 'home',
      label: (strings) => strings.home,
      icon: <HomeIcon />,
      onClick: () => homeRef.current && scrollToElement(homeRef.current)
    },
    {
      key: 'about',
      label: (strings) => strings.musicLessons,
      icon: <InfoIcon />
    },
    {
      key: 'testimonials',
      label: (strings) => strings.testimonials,
      icon: <ReviewsIcon />,
      onClick: () => testimonialsRef.current && scrollToElement(testimonialsRef.current)
    },
    {
      key: 'youtube',
      label: () => 'YouTube',
      icon: <YouTubeIcon />,
      onClick: () => youtubeChannelRef.current && scrollToElement(youtubeChannelRef.current)
    },

    {
      key: 'contact',
      label: (strings) => strings.contact,
      icon: <ContactMailIcon />
    }
  ]

  return (
    <CustomThemeProvider>
      <LocaleProvider>
        <DrawerAppBar navItems={navItems} />
        <Grid2 container display="flex" alignItems="center" height="100%">
          <Grid2 xs={12}>
            <HomePage
              homeRef={homeRef}
              testimonialsRef={testimonialsRef}
              youtubeChannelRef={youtubeChannelRef}
            />
          </Grid2>
        </Grid2>
      </LocaleProvider>
    </CustomThemeProvider>
  )
}

export default App
