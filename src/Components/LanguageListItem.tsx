import LocaleInfo from '../util/LocaleInfo'
import ListItemButton from '@mui/material/ListItemButton'
import { Collapse, ListItemIcon } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import ListItemText from '@mui/material/ListItemText'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import List from '@mui/material/List'
import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import { useContext } from 'react'
import { LocaleManager, LocaleContext } from '../store/LocaleProvider'

interface CountryFlagIconProps {
  language: LocaleInfo
}

const CountryFlagIcon = ({ language }: CountryFlagIconProps) => (
  <IconButton
    sx={{
      padding: 0,
      width: 44,
      height: 44
    }}>
    <img src={language.icon} alt={language.label} />
  </IconButton>
)

export interface LanguageListItemProps {
  languages: LocaleInfo[]
  onChange?: (language: LocaleInfo) => void
}

export default function LanguageListItem({ languages, onChange }: LanguageListItemProps) {
  const [open, setOpen] = React.useState(true)

  const localeManager = useContext<LocaleManager>(LocaleContext)

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
        <ListItemText primary={localeManager.stringList.language} />
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
              <CountryFlagIcon language={lang} />
              <ListItemText primary={lang.label} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </>
  )
}
