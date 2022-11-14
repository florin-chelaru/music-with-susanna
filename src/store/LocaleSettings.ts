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
  about: 'About Susanna',
  channel: 'Video Channel',
  contact: 'Contact',
  home: 'Home',
  language: 'Language',
  lessons: 'Music Lessons',
  musicWithMsJohnson: 'Music with Ms. Johnson',
  readMore: 'Read more',
  signUp: 'Sign up',
  testimonials: 'Testimonials',
  youtubeChildrensChannel: "Children's YouTube Channel"
}

export const RO_RO: GlobalLocalizedData = {
  about: 'Despre Susanna',
  channel: 'Canal Video',
  contact: 'Contact',
  home: 'Acasă',
  language: 'Limba',
  lessons: 'Lecții de Muzică',
  musicWithMsJohnson: 'Cântăm cu Ms. Johnson',
  readMore: 'Citește mai mult',
  signUp: 'Înscrie-te',
  testimonials: 'Testimoniale',
  youtubeChildrensChannel: 'Canal YouTube pentru Copii'
}
