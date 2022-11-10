import * as React from 'react'
import { useContext } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuIcon from '@mui/icons-material/Menu'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import LanguagePopover from './LanguagePopover'
import { ListItemIcon } from '@mui/material'
import LocaleInfo from '../util/LocaleInfo'
import LanguageListItem from './LanguageListItem'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import ContactMailIcon from '@mui/icons-material/ContactMail'
import {
  LocaleContext,
  LocaleManager,
  LocalizedStringList,
  SUPPORTED_LOCALES
} from '../store/LocaleProvider'

const drawerWidth = 240

interface NavItemInfo {
  key: string
  label: (strings: LocalizedStringList) => string
  icon: React.ReactNode
}

const navItems: NavItemInfo[] = [
  {
    key: 'home',
    label: (strings) => strings.home,
    icon: <HomeIcon />
  },
  {
    key: 'about',
    label: (strings) => strings.aboutMe,
    icon: <InfoIcon />
  },
  {
    key: 'contact',
    label: (strings) => strings.contact,
    icon: <ContactMailIcon />
  }
]

export default function DrawerAppBar() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const localeManager = useContext<LocaleManager>(LocaleContext)
  const strings = localeManager.stringList

  const onLocaleChange = (l: LocaleInfo) => localeManager.changeLocale(l.locale)

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <List>
        {navItems.map((item) => (
          <ListItemButton key={`listitem-${item.key}`}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label(strings)} />
          </ListItemButton>
        ))}
        <LanguageListItem languages={SUPPORTED_LOCALES} onChange={onLocaleChange} />
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar component="nav">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'block', sm: 'block' } }}>
            {strings.musicWithMsJohnson}
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {navItems.map((item) => (
              <Button key={`button-${item.key}`} sx={{ color: '#fff' }}>
                {item.label(strings)}
              </Button>
            ))}
            <LanguagePopover languages={SUPPORTED_LOCALES} onChange={onLocaleChange} />
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}>
          {drawer}
        </Drawer>
      </Box>
    </Box>
  )
}
