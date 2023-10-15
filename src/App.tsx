import React, { useEffect } from 'react'
import DrawerAppBar from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'
import Home from './pages/Home'
import Grid2 from '@mui/material/Unstable_Grid2'
import CustomThemeProvider from './theme/CustomThemeProvider'
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
import { ROUTES, RouteInfo } from './data/RouteInfo'
import UserPage from './pages/UserPage'
import 'react-quill/dist/quill.snow.css'
import './App.css'

function App() {
  const navItems: RouteInfo[] = ROUTES

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
                      <Route path="/user" element={<UserPage />} />
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
