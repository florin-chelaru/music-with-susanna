import LocaleInfo from '../util/LocaleInfo'
import ListItemButton from '@mui/material/ListItemButton'
import { Collapse, ListItemIcon } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import ListItemText from '@mui/material/ListItemText'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import List from '@mui/material/List'
import * as React from 'react'
import { useContext } from 'react'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import CountryFlagButton from './CountryFlagButton'

export interface LanguageListItemProps {
  languages: LocaleInfo[]
  onChange?: (language: LocaleInfo) => void
}

export default function LanguageListItem({ languages, onChange }: LanguageListItemProps) {
  const [open, setOpen] = React.useState(true)

  const localeManager = useContext<LocaleHandler>(LocaleContext)

  const handleClick = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    setOpen(!open)
  }
  return (
    <>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <LanguageIcon />
        </ListItemIcon>
        <ListItemText primary={localeManager.globalStringList.language} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {languages.map((lang) => (
            <ListItemButton
              sx={{ pl: 4 }}
              key={lang.locale}
              selected={lang.locale === localeManager.locale}
              onClick={() => {
                onChange?.(lang)
              }}>
              <CountryFlagButton language={lang} />
              <ListItemText primary={lang.label} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </>
  )
}
