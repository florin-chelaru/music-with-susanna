import React, { useRef } from 'react'
import './App.css'
import DrawerAppBar, { NavItemInfo } from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'
import Home from './pages/Home'
import Grid2 from '@mui/material/Unstable_Grid2'
import CustomThemeProvider from './theme/CustomThemeProvider'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import ReviewsIcon from '@mui/icons-material/Reviews'
import YouTubeIcon from '@mui/icons-material/YouTube'
import SchoolIcon from '@mui/icons-material/School'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Lessons from './pages/Lessons'
import About from './pages/About'
import Contact from './pages/Contact'
import Testimonials from './pages/Testimonials'
import VideoChannel from './pages/VideoChannel'

function App() {
  const homeRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const youtubeChannelRef = useRef<HTMLDivElement>(null)
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
      key: 'testimonials',
      label: (strings) => strings.testimonials,
      icon: <ReviewsIcon />,
      path: '/testimonials'
    },
    {
      key: 'videos',
      label: (strings) => strings.channel,
      icon: <YouTubeIcon />,
      path: '/videos'
    },

    {
      key: 'contact',
      label: (strings) => strings.contact,
      icon: <ContactMailIcon />,
      path: '/contact'
    }
  ]

  return (
    <CustomThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <DrawerAppBar navItems={navItems} />
          <Grid2 container>
            <Grid2 xs={12}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Home
                      homeRef={homeRef}
                      testimonialsRef={testimonialsRef}
                      youtubeChannelRef={youtubeChannelRef}
                    />
                  }
                />
                <Route path="/lessons" element={<Lessons />} />
                <Route path="/about" element={<About />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/videos" element={<VideoChannel />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </Grid2>
          </Grid2>
        </BrowserRouter>
      </LocaleProvider>
    </CustomThemeProvider>
  )
}

export default App
