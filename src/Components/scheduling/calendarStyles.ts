import { Theme } from '@mui/material'

// Shared react-big-calendar styling for the scheduling calendars.
//
// Three components render a calendar — availability, lessons, and the editable suggested
// schedule — and each had grown its own copy of these rules, so they drifted apart visually.
// The blocks below are composed with object spread, so their keys are kept disjoint: the
// shell owns the container and the event chrome, the time grid owns everything inside a
// week view, and the month/agenda block owns those two views. The navigation bar is not here:
// it is a real component, CalendarToolbar, rather than library markup dressed up with CSS.

/**
 * Container chrome, base typography, headers and events. Every calendar uses this.
 *
 * `minHeight` keeps a month grid from collapsing when a month holds few lessons. It is a
 * per-calendar layout choice rather than a shared constant, so each caller passes its own.
 */
export function calendarShellSx(theme: Theme, options: { minHeight?: number } = {}) {
  const d = theme.palette.divider
  const paper = theme.palette.background.paper

  return {
    // Outer shell: rounded corners + theme border
    border: `1px solid ${d}`,
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: paper,

    '& .rbc-calendar': {
      backgroundColor: paper,
      color: theme.palette.text.primary,
      fontFamily: theme.typography.fontFamily,
      fontSize: '0.8125rem',
      ...(options.minHeight !== undefined && { minHeight: options.minHeight })
    },

    '& .rbc-header': { border: 'none', backgroundColor: paper },

    // Today column tint
    '& .rbc-today': { backgroundColor: theme.palette.action.hover },

    // Events: reset library defaults; actual colours come from each eventPropGetter
    '& .rbc-event': {
      // No `!important` here on purpose. It would also override the inline border-left each
      // calendar's eventPropGetter sets, so the 3 px accent bar the padding below makes room
      // for never actually rendered. This rule is specific enough to beat the library's own
      // `.rbc-event` border on its own, while still losing to an inline style — which is
      // exactly the precedence we want.
      border: 'none',
      borderRadius: '4px !important',
      // Extra left padding so text sits clear of the 3 px accent bar
      padding: '1px 6px 1px 8px !important',
      fontSize: '0.75rem',
      fontWeight: 500,
      boxShadow: 'none !important',
      '&:focus': { outline: 'none' }
    },
    '& .rbc-event.rbc-selected': { boxShadow: 'none !important' },
    '& .rbc-event-label': { fontSize: '0.625rem', opacity: 0.85 },
    '& .rbc-event-content': { fontSize: '0.75rem' }
  }
}

/** Everything inside a week or day time grid. Used by the availability and editing views. */
export function timeGridSx(theme: Theme) {
  const d = theme.palette.divider
  const paper = theme.palette.background.paper
  const primary = theme.palette.primary.main

  return {
    '& .rbc-time-view': { border: 'none' },

    // Header row
    '& .rbc-time-header': { borderBottom: `1px solid ${d}` },
    // No borderRight on the gutter — it has an inline width set by the library, and a
    // border would make it 1 px narrower than the time-gutter below, misaligning columns.
    '& .rbc-time-header-gutter': { backgroundColor: paper },
    // The separator between gutter and day headers comes from the content side instead.
    '& .rbc-time-header-content': { borderLeft: 'none' },

    // Hide the empty all-day row (only timed blocks are used)
    '& .rbc-allday-cell': { display: 'none' },

    '& .rbc-time-content': { borderTop: `1px solid ${d}`, backgroundColor: paper },

    // Time gutter (left column with hour labels)
    '& .rbc-time-gutter': { backgroundColor: paper },
    '& .rbc-label': {
      fontSize: '0.6875rem',
      color: theme.palette.text.secondary,
      paddingRight: '8px',
      lineHeight: 1
    },

    '& .rbc-timeslot-group': { border: 'none', minHeight: '36px' },
    // All day columns carry borderLeft — the first one provides the gutter separator,
    // which aligns with rbc-time-header-content's borderLeft above.
    '& .rbc-day-slot': { borderLeft: `1px solid ${d}` },
    // Remove finer slot borders within each group (keep only hour boundaries)
    '& .rbc-day-slot .rbc-time-slot': { border: 'none' },

    // Drag-to-create selection box
    '& .rbc-slot-selection': {
      backgroundColor: theme.palette.action.selected,
      border: `2px solid ${primary}`,
      borderRadius: '4px'
    },

    // Current-time indicator with leading dot
    '& .rbc-current-time-indicator': {
      height: '2px',
      backgroundColor: primary,
      '&::before': {
        content: '""',
        position: 'absolute',
        left: '-4px',
        top: '-3px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: primary
      }
    },

    // DnD drag ghost
    '& .rbc-addons-dnd-drag-preview': { opacity: 0.75, borderRadius: '4px' }
  }
}

/** The month grid and the agenda table. Used by any calendar offering more than a week view. */
export function monthAgendaSx(theme: Theme) {
  const d = theme.palette.divider

  return {
    '& .rbc-month-view, & .rbc-agenda-view': {
      border: `1px solid ${d}`,
      borderRadius: '6px',
      overflow: 'hidden'
    },
    '& .rbc-month-row + .rbc-month-row': { borderTop: `1px solid ${d}` },
    '& .rbc-day-bg + .rbc-day-bg': { borderLeft: `1px solid ${d}` },
    '& .rbc-off-range-bg': { backgroundColor: theme.palette.action.hover },
    '& .rbc-show-more': { color: theme.palette.primary.main, fontSize: '0.6875rem' },
    // The agenda table's borders are hardcoded to #ddd by the library, on selectors carrying a
    // class as well as the element (`table.rbc-agenda-table`). A rule written against `table`
    // alone loses on specificity and the light grey survives into dark mode, where it glares.
    // These match the library's own selectors so the theme divider actually wins.
    '& .rbc-agenda-view table.rbc-agenda-table': { borderColor: d },
    '& .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td': { borderLeftColor: d },
    '& .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr': { borderTopColor: d },
    '& .rbc-agenda-view table.rbc-agenda-table thead > tr > th': { borderBottomColor: d }
  }
}
