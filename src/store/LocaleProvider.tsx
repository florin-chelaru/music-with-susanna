import React, { createContext, useEffect, useState } from 'react'
import LocalizedStrings, { LocalizedStringsMethods } from 'react-localization'
import { createTheme, ThemeProvider, useTheme } from '@mui/material'
import * as muiLocales from '@mui/material/locale'
import LocaleInfo from '../util/LocaleInfo'

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

/** An interface containing all terms used on the website. */
export interface LocalizedStringList {
  // Keep these ordered alphabetically:
  aboutMe: string
  contact: string
  home: string
  language: string
  musicWithMsJohnson: string
}

const EN_US: LocalizedStringList = {
  aboutMe: 'About Me',
  contact: 'Contact',
  home: 'Home',
  language: 'Language',
  musicWithMsJohnson: 'Music with Ms. Johnson'
}

const RO_RO: LocalizedStringList = {
  aboutMe: 'Despre Mine',
  contact: 'Contact',
  home: 'Acasă',
  language: 'Limba',
  musicWithMsJohnson: 'Cântăm cu Ms. Johnson'
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
