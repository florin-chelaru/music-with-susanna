import {
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { ToolbarProps, View } from 'react-big-calendar'

/**
 * Navigation bar for the scheduling calendars, in place of react-big-calendar's own.
 *
 * Its default renders "Back" and "Next" as words, which read as commands rather than direction
 * and take more room than the month they are moving through. Arrows say the same thing in a
 * glance. "Today" stays a word — it is a destination, not a direction, and no arrow means it.
 *
 * Replacing the toolbar rather than restyling it also brings the buttons into MUI, so they pick
 * up the app's theme instead of needing a parallel set of CSS rules to imitate it.
 */
export default function CalendarToolbar<TEvent extends object>({
  label,
  view,
  views,
  localizer,
  onNavigate,
  onView
}: ToolbarProps<TEvent>) {
  const messages = localizer.messages as unknown as Record<string, string>
  const available = (Array.isArray(views) ? views : Object.keys(views)) as View[]
  // The agenda lists everything at once rather than a page of it, so there is nothing to step
  // backwards or forwards through — and a date label would describe a range the list ignores.
  const navigable = view !== 'agenda'

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
      {navigable && (
        <IconButton
          size="small"
          aria-label={messages.previous}
          onClick={() => {
            onNavigate('PREV')
          }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      {navigable && (
        <IconButton
          size="small"
          aria-label={messages.next}
          onClick={() => {
            onNavigate('NEXT')
          }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
      {navigable && (
        <Button
          size="small"
          onClick={() => {
            onNavigate('TODAY')
          }}>
          {messages.today}
        </Button>
      )}

      <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, px: 1 }}>
        {navigable ? label : ''}
      </Typography>

      {available.length > 1 && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next: View | null) => {
            // null arrives when the active view is clicked again; staying put is right.
            if (next) onView(next)
          }}>
          {available.map((name) => (
            <ToggleButton key={name} value={name} sx={{ textTransform: 'none', py: 0.25, px: 1 }}>
              {messages[name] ?? name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    </Stack>
  )
}
