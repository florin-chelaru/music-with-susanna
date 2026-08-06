import React from 'react'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import YouTubeIcon from '@mui/icons-material/YouTube'
import FacebookIcon from '@mui/icons-material/Facebook'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import SchoolIcon from '@mui/icons-material/School'
import AttributionIcon from '@mui/icons-material/Attribution'
import PersonIcon from '@mui/icons-material/Person'
import { GlobalLocalizedData } from '../store/LocaleProvider'

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
  },
  {
    key: 'resources',
    label: (strings) => strings.resources,
    icon: <LibraryBooksIcon />,
    path: '/resources',
    hiddenFromAppBar: true
  },
  {
    key: 'student-resources',
    label: (strings) => strings.resources,
    icon: <PersonIcon />, // TODO
    path: '/resources/student/:studentId',
    hiddenFromAppBar: true
  },
  {
    key: 'teacher-resources-student-view',
    label: (strings) => strings.resources,
    icon: <PersonIcon />, // TODO
    path: '/resources/teacher/:teacherId',
    hiddenFromAppBar: true
  },
  {
    key: 'resource-details',
    label: (strings) => strings.resources,
    icon: <LibraryBooksIcon />,
    path: '/resources/:resourceId',
    hiddenFromAppBar: true
  },
  {
    key: 'scheduling',
    label: (strings) => strings.scheduling,
    icon: <PersonIcon />,
    path: '/scheduling',
    hiddenFromAppBar: true
  },
  {
    key: 'scheduling-semester',
    label: (strings) => strings.scheduling,
    icon: <PersonIcon />,
    path: '/scheduling/semesters/:semesterId',
    hiddenFromAppBar: true
  },
  {
    key: 'scheduling-round',
    label: (strings) => strings.scheduling,
    icon: <PersonIcon />,
    path: '/scheduling/semesters/:semesterId/rounds/:roundId',
    hiddenFromAppBar: true
  },
  {
    key: 'schedule',
    label: (strings) => strings.mySchedule,
    icon: <PersonIcon />,
    path: '/schedule',
    hiddenFromAppBar: true
  },
  {
    key: 'schedule-availability',
    label: (strings) => strings.mySchedule,
    icon: <PersonIcon />,
    path: '/schedule/rounds/:teacherId/:semesterId/:roundId',
    hiddenFromAppBar: true
  }
]
