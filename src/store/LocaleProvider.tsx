import React, { createContext, useMemo, useState } from 'react'
import { createTheme, ThemeProvider, useTheme } from '@mui/material'
import * as muiLocales from '@mui/material/locale'
import { SupportedLocale } from '../util/SupportedLocale'
import { EN_US, RO_RO } from './LocaleSettings'
import { useSearchParams } from 'react-router-dom'

export interface LocalizedData {
  [key: string]: string | React.ReactNode | any
}

/** An interface containing the terms used globally on the website. */
export interface GlobalLocalizedData extends LocalizedData {
  // Keep these ordered alphabetically:
  about: string
  channel: string
  contact: string
  contactMe: string
  credits: string
  home: string
  language: string
  lessons: string
  more: string
  musicWithMsJohnson: string
  news: string
  readMore: string
  signUp: string
  testimonials: string
  youtubeChildrensChannel: string
}

export interface LocaleHandler {
  readonly locale: string

  readonly globalStringList: GlobalLocalizedData

  changeLocale(locale: SupportedLocale): void

  registerComponentStrings(
    componentId: string,
    componentStrings: Map<SupportedLocale, LocalizedData>
  ): void

  componentStrings(componentId: string): LocalizedData

  formatLongDate(date: Date | string): string
}

class LocaleManager implements LocaleHandler {
  private locale_: SupportedLocale
  private readonly globalLocales: Map<SupportedLocale, GlobalLocalizedData>
  protected readonly componentLocales = new Map<SupportedLocale, Map<string, LocalizedData>>()

  constructor(
    globalLocales: Map<SupportedLocale, GlobalLocalizedData>,
    defaultLocale?: SupportedLocale
  ) {
    this.globalLocales = globalLocales
    // Initialize component locales
    for (const l of Object.values(SupportedLocale)) {
      this.componentLocales.set(l, new Map<string, LocalizedData>())
    }
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
    this.locale_ = defaultLocale ?? SupportedLocale.RO_RO
  }

  changeLocale(locale: SupportedLocale): void {
    this.locale_ = locale
    try {
      localStorage.setItem('locale', locale)
    } catch (e) {
      console.error(`Could not save the locale preferences for the user: ${(e as Error).message}`)
    }
  }

  get locale(): SupportedLocale {
    return this.locale_
  }

  get globalStringList(): GlobalLocalizedData {
    return this.globalLocales.get(this.locale_) as GlobalLocalizedData
  }

  registerComponentStrings(
    componentId: string,
    componentStrings: Map<SupportedLocale, LocalizedData>
  ) {
    componentStrings.forEach((localizedData, locale) => {
      this.componentLocales.get(locale)?.set(componentId, localizedData)
    })
  }

  componentStrings(componentId: string): LocalizedData {
    return this.componentLocales.get(this.locale_)?.get(componentId) ?? {}
  }

  formatLongDate(date: Date | string): string {
    if (typeof date === 'string') {
      date = new Date(Date.parse(date))
    }
    const intlLocale = `${this.locale_.slice(0, 2)}-${this.locale_.slice(2)}`

    return date.toLocaleDateString(intlLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

class LocaleManagerWrapper implements LocaleHandler {
  private readonly localeManager: LocaleManager
  private readonly setLocaleState: (locale: SupportedLocale) => void
  private readonly setSearchParams: (params: any) => void

  constructor(
    localeManager: LocaleManager,
    setLocaleState: (locale: SupportedLocale) => void,
    setSearchParams: (params: any) => void
  ) {
    this.localeManager = localeManager
    this.setLocaleState = setLocaleState
    this.setSearchParams = setSearchParams
  }

  get locale(): string {
    return this.localeManager.locale
  }

  get globalStringList(): GlobalLocalizedData {
    return this.localeManager.globalStringList
  }

  changeLocale(locale: SupportedLocale) {
    this.localeManager.changeLocale(locale)
    this.setLocaleState(locale)
    // this.setSearchParams({ hl: locale })
  }

  registerComponentStrings(
    componentId: string,
    componentStrings: Map<SupportedLocale, LocalizedData>
  ) {
    this.localeManager.registerComponentStrings(componentId, componentStrings)
  }

  componentStrings(componentId: string): LocalizedData {
    return this.localeManager.componentStrings(componentId)
  }

  formatLongDate(date: Date | string): string {
    return this.localeManager.formatLongDate(date)
  }
}

export const LocaleContext = createContext<LocaleHandler>(
  new LocaleManager(
    new Map<SupportedLocale, GlobalLocalizedData>([
      [SupportedLocale.EN_US, EN_US],
      [SupportedLocale.RO_RO, RO_RO]
    ])
  )
)

export interface LocaleProviderProps {
  defaultLocale?: SupportedLocale
  children: JSX.Element | JSX.Element[]
}

const LocaleProvider = ({ defaultLocale, children }: LocaleProviderProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [locale, setLocale] = useState<SupportedLocale | undefined>(
    defaultLocale ?? (searchParams.get('hl') as SupportedLocale | null) ?? undefined
  )

  const theme = useTheme()

  const themeWithLocale = useMemo(() => {
    return createTheme(theme, muiLocales[locale ?? SupportedLocale.RO_RO])
  }, [locale, theme])

  const localeManager = useMemo<LocaleManager>(
    () =>
      new LocaleManager(
        new Map<SupportedLocale, GlobalLocalizedData>([
          [SupportedLocale.EN_US, EN_US],
          [SupportedLocale.RO_RO, RO_RO]
        ]),
        locale
      ),
    []
  )

  const localeWrapper = useMemo(
    () => new LocaleManagerWrapper(localeManager, setLocale, setSearchParams),
    [locale]
  )

  return (
    <LocaleContext.Provider value={localeWrapper}>
      <ThemeProvider theme={themeWithLocale}>{children}</ThemeProvider>
    </LocaleContext.Provider>
  )
}
export default LocaleProvider
