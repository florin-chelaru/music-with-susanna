import React from 'react'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import YouTubeIcon from '@mui/icons-material/YouTube'
import FacebookIcon from '@mui/icons-material/Facebook'
import SchoolIcon from '@mui/icons-material/School'
import AttributionIcon from '@mui/icons-material/Attribution'
import PersonIcon from '@mui/icons-material/Person'
import { GlobalLocalizedData, LocaleContext, LocaleHandler } from '../store/LocaleProvider'

export interface RouteInfo {
  key: string
  label: (strings: GlobalLocalizedData) => string
  icon: React.ReactNode
  path: string
  hiddenFromAppBar?: boolean
}

export const ROUTES: RouteInfo[] = [
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
    hiddenFromAppBar: true
  },
  {
    key: 'login',
    label: (strings) => strings.login,
    icon: <PersonIcon />,
    path: '/login',
    hiddenFromAppBar: true
  },
  {
    key: 'students',
    label: (strings) => strings.students,
    icon: <PersonIcon />, // TODO
    path: '/students',
    hiddenFromAppBar: true
  },
  {
    key: 'subjects',
    label: (strings) => strings.subjects,
    icon: <PersonIcon />, // TODO
    path: '/subjects',
    hiddenFromAppBar: true
  },
  {
    key: 'homework',
    label: (strings) => strings.homework,
    icon: <PersonIcon />, // TODO
    path: '/homework',
    hiddenFromAppBar: true
  }
]
