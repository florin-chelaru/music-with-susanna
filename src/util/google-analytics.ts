import ReactGA from 'react-ga4'
import { getCookieConsentValue } from 'react-cookie-consent'

export const initGA = (id: string) => {
  if (process.env.NODE_ENV === 'production') {
    ReactGA.initialize(id)
  }
}

export function gaSendPageView() {
  if (process.env.NODE_ENV === 'production') {
    const isConsent = getCookieConsentValue()
    if (isConsent === 'true') {
      ReactGA.ga('send', 'pageview')
    }
  }
}
