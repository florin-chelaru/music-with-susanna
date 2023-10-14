import React, { useEffect } from 'react'
import './App.css'
import DrawerAppBar, { NavItemInfo } from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'
import Home from './pages/Home'
import Grid2 from '@mui/material/Unstable_Grid2'
import CustomThemeProvider from './theme/CustomThemeProvider'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import YouTubeIcon from '@mui/icons-material/YouTube'
import FacebookIcon from '@mui/icons-material/Facebook'
import SchoolIcon from '@mui/icons-material/School'
import AttributionIcon from '@mui/icons-material/Attribution'
import { Route, Routes, useLocation } from 'react-router-dom'
import Lessons from './pages/Lessons'
import About from './pages/About'
import Contact from './pages/Contact'
import VideoChannel from './pages/VideoChannel'
import SelectedVideoProvider from './store/SelectedVideoProvider'
import LatestNews from './pages/LatestNews'
import ScrollTop from './Components/ScrollTop'
import Credits from './pages/Credits'
import Seo from './Components/Seo'
import LocalizedCookieConsent from './Components/LocalizedCookieConsent'
import { gaSendPageView } from './util/google-analytics'
import AnnouncementProvider from './store/AnnouncementProvider'
import Login from './pages/Login'
import PersonIcon from '@mui/icons-material/Person'
import { HelmetProvider } from 'react-helmet-async'
import { UserProvider } from './store/UserProvider'

function App() {
  const navItems: NavItemInfo[] = [
    {
      key: 'home',
      label: (strings) => strings.home,
      icon: <HomeIcon />,
      path: '/'
    },
    {
      key: 'lessons',
      label: (strings) => strings.lessons,
      icon: <SchoolIcon />,
      path: '/lessons'
    },
    {
      key: 'about',
      label: (strings) => strings.about,
      icon: <InfoIcon />,
      path: '/about'
    },
    {
      key: 'videos',
      label: (strings) => strings.channel,
      icon: <YouTubeIcon />,
      path: '/videos'
    },
    {
      key: 'news',
      label: (strings) => strings.news,
      icon: <FacebookIcon />,
      path: '/news'
    },
    {
      key: 'contact',
      label: (strings) => strings.contact,
      icon: <ContactMailIcon />,
      path: '/contact'
    },
    {
      key: 'credits',
      label: (strings) => strings.credits,
      icon: <AttributionIcon />,
      path: '/credits'
    },
    {
      key: 'login',
      label: (strings) => strings.login,
      icon: <PersonIcon />,
      path: '/login',
      hidden: true
    }
  ]

  // Track route changes and send to Google Analytics
  const location = useLocation()
  useEffect(() => gaSendPageView(), [location])

  return (
    <HelmetProvider>
      <CustomThemeProvider>
        <SelectedVideoProvider>
          <LocaleProvider>
            <UserProvider>
              <AnnouncementProvider>
                <Seo />
                <LocalizedCookieConsent />
                <DrawerAppBar navItems={navItems} />
                <Grid2 container>
                  <Grid2 xs={12}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/lessons" element={<Lessons />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/videos" element={<VideoChannel />} />
                      <Route path="/news" element={<LatestNews />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/credits" element={<Credits />} />
                      <Route path="/login" element={<Login />} />
                    </Routes>
                  </Grid2>
                </Grid2>
                <ScrollTop />
              </AnnouncementProvider>
            </UserProvider>
          </LocaleProvider>
        </SelectedVideoProvider>
      </CustomThemeProvider>
    </HelmetProvider>
  )
}

export default App
