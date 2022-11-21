import LocaleInfo from '../util/LocaleInfo'
import React from 'react'

export interface CountryFlagIconProps {
  language: LocaleInfo
}

export default function CountryFlagIcon({ language }: CountryFlagIconProps) {
  return <img src={language.icon} alt={language.label} />
}
