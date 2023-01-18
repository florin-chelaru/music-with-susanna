import LocaleInfo from '../util/LocaleInfo'
import React from 'react'
import { withBaseURL } from '../util/string'

export interface CountryFlagIconProps {
  language: LocaleInfo
}

export default function CountryFlagIcon({ language }: CountryFlagIconProps) {
  return <img src={withBaseURL(language.icon)} alt={language.label} />
}
