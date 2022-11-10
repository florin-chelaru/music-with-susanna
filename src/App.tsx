import React from 'react'
import './App.css'
import { Button, CssBaseline, TablePagination } from '@mui/material'
import DrawerAppBar from './Components/DrawerAppBar'
import LocaleProvider from './store/LocaleProvider'

function App() {
  return (
    <>
      <LocaleProvider>
        <CssBaseline />
        <DrawerAppBar />
        <Button variant="contained">Hello World</Button>
        <TablePagination
          count={2000}
          rowsPerPage={10}
          page={1}
          component="div"
          onPageChange={() => {}}
        />
      </LocaleProvider>
    </>
  )
}

export default App
