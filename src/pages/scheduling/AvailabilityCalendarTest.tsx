import { Box, Container, ThemeProvider, Toolbar, Typography } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { useState } from 'react'
import AvailabilityCalendar from '../../Components/scheduling/AvailabilityCalendar'
import { GREY } from '../../theme/palette'
import { shadows } from '../../theme/shadows'
import { AvailabilityBlock } from '../../util/scheduling'
import { MOCK_TEACHER_AVAILABILITY } from '../../data/schedulingMocks'

// Mirror CustomThemeProvider's theme settings so the preview is accurate.
const lightTheme = createTheme({
  shape: { borderRadius: 8 },
  palette: { mode: 'light', background: { default: GREY[300] } },
  shadows
})

const darkTheme = createTheme({
  shape: { borderRadius: 8 },
  palette: { mode: 'dark', background: { paper: '#2B2D3E', default: '#343E59' } }
})

export default function AvailabilityCalendarTest() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(
    MOCK_TEACHER_AVAILABILITY.weeklyTemplate.blocks
  )

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />

      <Typography variant="overline" color="text.secondary">
        Light mode
      </Typography>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Availability Calendar — editable
      </Typography>
      <ThemeProvider theme={lightTheme}>
        <Box sx={{ backgroundColor: 'background.default', borderRadius: 2 }}>
          <AvailabilityCalendar blocks={blocks} onChange={setBlocks} />
        </Box>
      </ThemeProvider>

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 5 }}>
        Dark mode
      </Typography>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Availability Calendar — editable
      </Typography>
      <ThemeProvider theme={darkTheme}>
        <Box sx={{ backgroundColor: 'background.default', borderRadius: 2 }}>
          <AvailabilityCalendar blocks={blocks} onChange={setBlocks} />
        </Box>
      </ThemeProvider>
    </Container>
  )
}
