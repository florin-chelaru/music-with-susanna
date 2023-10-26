import React, { useContext, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'

interface SeoFields {
  title: string
  description: string
}

const EN_US: SeoFields = {
  title: 'Music Lessons with Susanna',
  description:
    'Music lessons for children in Iași with Susanna Johnson-Chelaru. Sign up for violin or viola lessons and find out ' +
    "more about Susanna's background."
}

const RO_RO: SeoFields = {
  title: 'Lecții de Vioară cu Susanna',
  description:
    'Lecții de muzică pentru copii în Iași cu Susanna Johnson-Chelaru. Înscrie-te la lecțiile de vioară și violă ' +
    'și citește mai multe despre Susanna și experiența sa pedagogică.'
}

const SEO_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.RO_RO, RO_RO],
  [SupportedLocale.EN_US, EN_US]
])

export default function Seo() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(Seo.name, SEO_TEXTS), [])
  const componentStrings = localeManager.componentStrings(Seo.name) as SeoFields

  return (
    <Helmet>
      <html lang={localeManager.locale.substring(0, 2)} />
      <meta charSet="utf-8" />
      <title>{componentStrings.title}</title>
      <link rel="canonical" href={`https://vioara-cu-susanna.ro/?hl=${localeManager.locale}`} />
      <meta name="description" content={componentStrings.description} />
      <meta property="og:title" content={componentStrings.title} />
      <meta
        property="og:url"
        content={`https://vioara-cu-susanna.ro/?hl=${localeManager.locale}`}
      />
      <meta property="og:description" content={componentStrings.description} />
      <meta name="twitter:title" content={componentStrings.title} />
      <meta name="twitter:description" content={componentStrings.description} />
    </Helmet>
  )
}
