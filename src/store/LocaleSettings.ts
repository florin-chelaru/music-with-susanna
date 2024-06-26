import LocaleInfo from '../util/LocaleInfo'
import { GlobalLocalizedData } from './LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  {
    locale: SupportedLocale.EN_US,
    label: 'English',
    icon: '/static/icons/ic_flag_en.svg'
  },
  {
    locale: SupportedLocale.RO_RO,
    label: 'Română',
    icon: '/static/icons/ic_flag_ro.svg'
  }
]

export const EN_US: GlobalLocalizedData = {
  about: 'CV',
  channel: 'Video Channel',
  contact: 'Contact',
  contactMe: 'Contact me',
  credits: 'Credits',
  home: 'Home',
  homework: 'Homework',
  language: 'Language',
  lessons: 'Music Lessons',
  login: 'Login',
  logout: 'Logout',
  more: 'More',
  musicWithMsJohnson: 'Violin with Susanna',
  news: 'Latest News',
  readMore: 'Read more',
  signUp: 'Sign up',
  students: 'Students',
  subjects: 'Subjects',
  testimonials: 'Testimonials',
  studentsInRecital: 'My students in recital',
  youtubeChildrensChannel: "Children's YouTube Channel"
}

export const RO_RO: GlobalLocalizedData = {
  about: 'CV',
  channel: 'Canal Video',
  contact: 'Contact',
  contactMe: 'Contactează-mă',
  credits: 'Credits',
  home: 'Acasă',
  homework: 'Teme pe Acasă',
  language: 'Limba',
  lessons: 'Lecții de Muzică',
  login: 'Conectează-te',
  logout: 'Deconectează-te',
  more: 'Mai mult',
  musicWithMsJohnson: 'Vioară cu Susanna',
  news: 'Ultimele Noutăți',
  readMore: 'Citește mai mult',
  signUp: 'Înscrie-te',
  students: 'Elevi',
  subjects: 'Materii',
  studentsInRecital: 'Elevii mei în recital',
  testimonials: 'Testimoniale',
  youtubeChildrensChannel: 'Canalul YouTube pentru Copii'
}
