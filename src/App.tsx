import React from 'react'
import './App.css'
import DrawerAppBar from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'
import HomePage from './pages/HomePage'
import Grid2 from '@mui/material/Unstable_Grid2'
import CustomThemeProvider from './theme/CustomThemeProvider'

function App() {
  return (
    <CustomThemeProvider>
      <LocaleProvider>
        {/*<CssBaseline />*/}
        <DrawerAppBar />
        <Grid2 container display="flex" alignItems="center" height="100%">
          <Grid2 xs={12}>
            <HomePage />
          </Grid2>
        </Grid2>
      </LocaleProvider>
    </CustomThemeProvider>
  )
}

export default App
