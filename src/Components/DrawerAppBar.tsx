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
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { SUPPORTED_LOCALES } from '../store/LocaleSettings'
import { Link as DomLink, useLocation } from 'react-router-dom'
import UserPopover from './UserPopover'
import { RouteInfo } from '../data/RouteInfo'

const drawerWidth = 240

export interface DrawerAppBarProps {
  navItems: RouteInfo[]
}

export default function DrawerAppBar({ navItems }: DrawerAppBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const strings = localeManager.globalStringList

  const location = useLocation()
  const pageTitle =
    navItems
      .find((item) => location.pathname.startsWith(item.path) && item.path !== '/')
      ?.label(strings) ?? strings.musicWithMsJohnson

  const onLocaleChange = (l: LocaleInfo) => localeManager.changeLocale(l.locale)

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <List>
        {navItems
          .filter((item) => !item.hiddenFromAppBar)
          .map((item) => (
            <ListItemButton key={`listitem-${item.key}`} component={DomLink} to={item.path}>
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
            sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'block', sm: 'block' } }}>
            {pageTitle}
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {navItems
              .filter((item) => !item.hiddenFromAppBar)
              .map((item) => (
                <Button
                  key={`button-${item.key}`}
                  sx={{ color: '#fff' }}
                  component={DomLink}
                  to={item.path}>
                  {item.label(strings)}
                </Button>
              ))}
            <LanguagePopover languages={SUPPORTED_LOCALES} onChange={onLocaleChange} />
            <UserPopover />
          </Box>
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <UserPopover />
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
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}>
          {drawer}
        </Drawer>
      </Box>
    </Box>
  )
}
