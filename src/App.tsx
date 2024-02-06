import Grid2 from '@mui/material/Unstable_Grid2'
import { useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import 'react-quill/dist/quill.snow.css'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import DrawerAppBar from './Components/DrawerAppBar'
import LocalizedCookieConsent from './Components/LocalizedCookieConsent'
import ScrollTop from './Components/ScrollTop'
import Seo from './Components/Seo'
import { ROUTES, RouteInfo } from './data/RouteInfo'
import About from './pages/About'
import Contact from './pages/Contact'
import Credits from './pages/Credits'
import Home from './pages/Home'
import Homework from './pages/Homework'
import LatestNews from './pages/LatestNews'
import Lessons from './pages/Lessons'
import Login from './pages/Login'
import StudentsPage from './pages/StudentsPage'
import SubjectsPage from './pages/SubjectsPage'
import VideoChannel from './pages/VideoChannel'
import AnnouncementProvider from './store/AnnouncementProvider'
import FabPositionProvider from './store/FabPositionProvider'
import LocaleProvider from './store/LocaleProvider'
import SelectedVideoProvider from './store/SelectedVideoProvider'
import { UserProvider } from './store/UserProvider'
import CustomThemeProvider from './theme/CustomThemeProvider'
import { gaSendPageView } from './util/google-analytics'

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
                <FabPositionProvider>
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
                        <Route path="/students" element={<StudentsPage />} />
                        <Route path="/subjects" element={<SubjectsPage />} />
                        <Route path="/homework/:teacherId/:studentId" element={<Homework />} />
                      </Routes>
                    </Grid2>
                  </Grid2>
                  <ScrollTop />
                </FabPositionProvider>
              </AnnouncementProvider>
            </UserProvider>
          </LocaleProvider>
        </SelectedVideoProvider>
      </CustomThemeProvider>
    </HelmetProvider>
  )
}

export default App
