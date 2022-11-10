import React, { createContext, useEffect, useState } from 'react'
import LocalizedStrings, { LocalizedStringsMethods } from 'react-localization'
import { createTheme, ThemeProvider, useTheme } from '@mui/material'
import * as muiLocales from '@mui/material/locale'
import LocaleInfo from '../util/LocaleInfo'

// When using TypeScript 4.x and above. See: https://mui.com/material-ui/about-the-lab/

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  {
    locale: 'enUS',
    label: 'English',
    icon: '/static/icons/ic_flag_en.svg'
  },
  {
    locale: 'roRO',
    label: 'Română',
    icon: '/static/icons/ic_flag_ro.svg'
  }
]

export type SupportedLocale = 'enUS' | 'roRO'

export interface Testimonial {
  title: string
  subtitle?: string
  content?: string
  image?: string
  rating?: number
  ratingUrl?: string
}

/** An interface containing all terms used on the website. */
export interface LocalizedStringList {
  // Keep these ordered alphabetically:
  aboutMe: string
  aboutMeTextShort: string
  contact: string
  home: string
  language: string
  musicTeacher: string
  musicWithMsJohnson: string
  readMore: string
  testimonialList: Testimonial[]
  testimonials: string
}

const TESTIMONIALS_EN_US: Testimonial[] = [
  {
    title: 'Ariel Roth',
    subtitle: 'Parent of Savi, age nine',
    content:
      'Ms. Susanna, as she was known in our house, was our son\'s first violin teacher - and she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who could tailor her teaching to his attentional needs and to what he would find interesting. Susanna was firm when she needed to be, but engaged with him on the subjects that he was interested in, like Star Wars and Harry Potter, even making up a "Darth Vader" song for him to play on the violin as a way of motivating him.\n' +
      '\n' +
      'As a parent, we loved Susanna because she kept us informed of what was happening in the lessons and took time at the end of each lesson to show us what she taught him and what he needed to practice and how so that we could help him develop his skills.\n' +
      '\n' +
      'The payoff to working with Susanna was huge. In his school recital at the end of the year, Savi was the best string player in the bunch and his joy in playing the violin is clear. He just got back from a month at sleep away camp and the first thing he did when he got home was reach for his violin and play Song with the Wind.\n' +
      '\n' +
      "I would recommend Susanna without hesitation! If Savi's future teacher's are half as good, I'll consider myself truly fortunate.",
    rating: 5
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-letter-square-bw-large.jpeg'
  },
  {
    title: 'Hari',
    subtitle: 'Parent',
    content:
      'Susanna has been teaching my daughter viola for 2 years. She is a fantastic teacher and my daughter is thriving under her tutelage. She knows exactly the pace at which to teach and what pieces to use, and her teaching of technique is very good. The most important endorsement I can make is that my daughter is so eager to go to her weekly lessons!',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Rawi S.',
    subtitle: 'Student',
    content:
      'Susanna is a very thoughtful and innovative instructor. I have learned a lot from her and am now able to play the viola piece within months after so many years of struggling with other instructors. The sadness that struck me as the months I have spent learning from her drew to a close derives from the fact that she has been one of my best instructors ever! It is sad to see her move to Boston but my loss is your gain. Highly recommended.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Gracie',
    subtitle: 'Student',
    image: '/static/img/gracie-letter-bw-small.webp'
  },
  {
    title: 'Mariana',
    subtitle: 'Parent of middle school/high school student',
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 4,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Andreea Teleche',
    subtitle: 'Parent of Tudor, age seven',
    // TODO
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 5,
    image: '/static/img/tudor-large.jpeg'
  },
  {
    title: 'Joanna',
    subtitle: 'Parent of five year old student',
    content:
      'Susanna is an amazinging patient instructor with my wiggly five year old. Children have short attention spans, but Susanna is able to refocus my daughters attention to keep her engaged in the lesson. So happy to have been able to give my daughter a positive introduction to music.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-small.webp'
  }
]

const EN_US: LocalizedStringList = {
  aboutMe: 'About Me',
  aboutMeTextShort:
    'Susanna has a Master’s degree in viola performance at the University of Maryland and a Bachelor of Music in viola performance at the Indiana University Jacobs School of Music. Susanna studied for a year at Boston Conservatory, as part of the Graduate Performer’s Diploma program.',
  contact: 'Contact',
  home: 'Home',
  language: 'Language',
  musicTeacher: 'violin & viola teacher',
  musicWithMsJohnson: 'Music with Ms. Johnson',
  readMore: 'Read more',
  testimonialList: TESTIMONIALS_EN_US,
  testimonials: 'Testimonials'
}

const RO_RO: LocalizedStringList = {
  aboutMe: 'Despre Mine',
  // TODO: Translate to RO
  aboutMeTextShort:
    'Susanna has a Master’s degree in viola performance at the University of Maryland and a Bachelor of Music in viola performance at the Indiana University Jacobs School of Music. Susanna studied for a year at Boston Conservatory, as part of the Graduate Performer’s Diploma program.',
  contact: 'Contact',
  home: 'Acasă',
  language: 'Limba',
  musicTeacher: 'profesoară de vioară și violă',
  musicWithMsJohnson: 'Cântăm cu Ms. Johnson',
  readMore: 'Citește mai mult',
  // TODO: Translate to RO
  testimonialList: TESTIMONIALS_EN_US,
  testimonials: 'Testimoniale'
}

export interface LocaleCollection extends LocalizedStringList, LocalizedStringsMethods {}

export interface LocaleManager {
  changeLocale(locale: SupportedLocale): void

  readonly locale: string

  readonly stringList: LocalizedStringList
}

const LOCALES: LocaleCollection = new LocalizedStrings({
  enUS: EN_US,
  roRO: RO_RO
})

export const LocaleContext = createContext<LocaleManager>({
  changeLocale(locale: SupportedLocale) {
    LOCALES.setLanguage(locale)
  },
  get locale(): string {
    return LOCALES.getLanguage()
  },
  get stringList(): LocalizedStringList {
    return LOCALES
  }
})

export interface LocaleProviderProps {
  defaultLocale?: SupportedLocale
  children: JSX.Element | JSX.Element[]
}

const LocaleProvider = ({ defaultLocale, children }: LocaleProviderProps) => {
  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale ?? 'enUS')

  const theme = useTheme()

  const themeWithLocale = React.useMemo(
    () => createTheme(theme, muiLocales[locale]),
    [locale, theme]
  )

  const localeManager: LocaleManager = {
    changeLocale(locale: SupportedLocale) {
      if (LOCALES.getAvailableLanguages().includes(locale)) {
        LOCALES.setLanguage(locale)
        try {
          localStorage.setItem('locale', locale)
        } catch (e) {
          console.error(
            `Could not save the locale preferences for the user: ${(e as Error).message}`
          )
        }
        setLocale(locale)
      }
    },

    get locale(): SupportedLocale {
      return LOCALES.getLanguage() as SupportedLocale
    },

    get stringList(): LocalizedStringList {
      return LOCALES
    }
  }

  useEffect(() => {
    if (!defaultLocale) {
      try {
        defaultLocale = (localStorage.getItem('locale') as SupportedLocale) ?? undefined
      } catch (e) {
        console.error(
          `Could not load locale preferences from localStorage, using default. Details: ${
            (e as Error).message
          }`
        )
      }
    }
    if (defaultLocale && defaultLocale !== locale) {
      localeManager.changeLocale(defaultLocale)
    }
  }, [])

  return (
    <LocaleContext.Provider value={localeManager}>
      <ThemeProvider theme={themeWithLocale}>{children}</ThemeProvider>
    </LocaleContext.Provider>
  )
}
export default LocaleProvider
