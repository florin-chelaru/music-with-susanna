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
  credits: 'Credits',
  home: 'Home',
  language: 'Language',
  lessons: 'The Music Lessons',
  musicWithMsJohnson: 'Music with Ms. Johnson',
  news: 'Latest News',
  readMore: 'Read more',
  signUp: 'Sign up',
  testimonials: 'Testimonials',
  youtubeChildrensChannel: "Children's YouTube Channel"
}

export const RO_RO: GlobalLocalizedData = {
  about: 'CV',
  channel: 'Canal Video',
  contact: 'Contact',
  credits: 'Credits',
  home: 'Acasă',
  language: 'Limba',
  lessons: 'Lecțiile de Muzică',
  musicWithMsJohnson: 'Cântăm cu Ms. Johnson',
  news: 'Ultimele Noutăți',
  readMore: 'Citește mai mult',
  signUp: 'Înscrie-te',
  testimonials: 'Testimoniale',
  youtubeChildrensChannel: 'Canal YouTube pentru Copii'
}
