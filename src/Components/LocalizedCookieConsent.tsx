import React, { useContext, useEffect, useMemo } from 'react'
import CookieConsent, {
  Cookies,
  getCookieConsentValue,
  resetCookieConsentValue
} from 'react-cookie-consent'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { initGA } from '../util/google-analytics'

interface CookieConsentTexts {
  consentNotification: string
  buttonText: string
  declineButtonText: string
}

const EN_US: CookieConsentTexts = {
  consentNotification: 'This site uses cookies from Google Analytics to analyze traffic.',
  buttonText: 'I understand',
  declineButtonText: 'I decline'
}

const RO_RO: CookieConsentTexts = {
  consentNotification:
    'Această pagină folosește module cookie implementate de Google prin intermediul produsului Google Analytics pentru analiza traficului.',
  buttonText: 'Sunt de acord',
  declineButtonText: 'Nu sunt de acord'
}

const COOKIE_CONSENT_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function LocalizedCookieConsent() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(
    () => localeManager.registerComponentStrings(LocalizedCookieConsent.name, COOKIE_CONSENT_TEXTS),
    []
  )

  const componentStrings = localeManager.componentStrings(
    LocalizedCookieConsent.name
  ) as CookieConsentTexts

  const handleAcceptCookie = () => {
    if (process.env.REACT_APP_GOOGLE_ANALYTICS_ID) {
      initGA(process.env.REACT_APP_GOOGLE_ANALYTICS_ID)
    }
  }
  const handleDeclineCookie = () => {
    //remove google analytics cookies
    Cookies.remove('_ga')
    Cookies.remove('_gat')
    Cookies.remove('_gid')
    if (process.env.REACT_APP_GOOGLE_ANALYTICS_ID) {
      const gaMeasurementId = process.env.REACT_APP_GOOGLE_ANALYTICS_ID
      const customCookie = `_ga_${gaMeasurementId.substring(2)}` // format is 'G-...'
      Cookies.remove(customCookie)
    }
  }

  useEffect(() => {
    const isConsent = getCookieConsentValue()
    if (isConsent === 'true') {
      handleAcceptCookie()
    } else {
      resetCookieConsentValue()
    }
  }, [])

  return (
    <CookieConsent
      onAccept={handleAcceptCookie}
      onDecline={handleDeclineCookie}
      enableDeclineButton
      buttonText={componentStrings.buttonText}
      declineButtonText={componentStrings.declineButtonText}>
      {componentStrings.consentNotification}
    </CookieConsent>
  )
}
