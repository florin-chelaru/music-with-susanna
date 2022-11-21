import LocaleInfo from '../util/LocaleInfo'
import IconButton from '@mui/material/IconButton'
import * as React from 'react'
import CountryFlagIcon from './CountryFlagIcon'

interface CountryFlagButtonProps {
  language: LocaleInfo
}

export default function CountryFlagButton({ language }: CountryFlagButtonProps) {
  return (
    <IconButton
      sx={{
        padding: 0,
        width: 44,
        height: 44
      }}>
      <CountryFlagIcon language={language} />
    </IconButton>
  )
}
