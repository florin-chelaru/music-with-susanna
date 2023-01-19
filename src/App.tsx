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
import YouTubeIcon from '@mui/icons-material/YouTube'
import FacebookIcon from '@mui/icons-material/Facebook'
import SchoolIcon from '@mui/icons-material/School'
import AttributionIcon from '@mui/icons-material/Attribution'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Lessons from './pages/Lessons'
import About from './pages/About'
import Contact from './pages/Contact'
import VideoChannel from './pages/VideoChannel'
import SelectedVideoProvider from './store/SelectedVideoProvider'
import LatestNews from './pages/LatestNews'
import ScrollTop from './Components/ScrollTop'
import Credits from './pages/Credits'

function App() {
  const homeRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const youtubeChannelRef = useRef<HTMLDivElement>(null)

  const baseURL = process.env.PUBLIC_URL

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
    // {
    //   key: 'testimonials',
    //   label: (strings) => strings.testimonials,
    //   icon: <ReviewsIcon />,
    //   path: '/testimonials'
    // },
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
    }
  ]
  // navItems.forEach(i=>i.path = )

  return (
    <CustomThemeProvider>
      <SelectedVideoProvider>
        <BrowserRouter basename={baseURL}>
          <LocaleProvider>
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
                  {/*<Route path="/testimonials" element={<Testimonials />} />*/}
                  <Route path="/videos" element={<VideoChannel />} />
                  <Route path="/news" element={<LatestNews />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/credits" element={<Credits />} />
                </Routes>
              </Grid2>
            </Grid2>
            <ScrollTop />
          </LocaleProvider>
        </BrowserRouter>
      </SelectedVideoProvider>
    </CustomThemeProvider>
  )
}

export default App
