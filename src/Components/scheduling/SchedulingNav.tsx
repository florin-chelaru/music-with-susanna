import { Breadcrumbs, Button, Link, Typography, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocaleContext, LocaleHandler } from '../../store/LocaleProvider'

export interface SchedulingCrumb {
  label: string
  /** Where this crumb navigates. Omit on the last one — the current page is not a link. */
  to?: string
}

export interface SchedulingNavProps {
  /**
   * Crumbs below the root. The root "Scheduling" entry is always prepended, and becomes a
   * link as soon as anything follows it.
   */
  items?: SchedulingCrumb[]
}

/**
 * Upward navigation for the scheduling pages.
 *
 * The section nests three levels deep (section → semester → round) and the app bar offers no
 * way back up, so every page in it renders this.
 *
 * On a phone a full trail is too wide to be useful, so it collapses to a single back button
 * pointing at the nearest ancestor — the same destination the last clickable crumb would have.
 */
export default function SchedulingNav({ items = [] }: SchedulingNavProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  // Two separate useMediaQuery calls, never OR'd inline — hooks must not short-circuit.
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobile = isTouch || isSmallScreen
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList

  const crumbs: SchedulingCrumb[] = [
    { label: strings.scheduling, to: items.length > 0 ? '/scheduling' : undefined },
    ...items
  ]

  if (isMobile) {
    // Nearest ancestor that is actually a link; undefined on the section root, which has no parent.
    const parent = [...crumbs].reverse().find((crumb) => crumb.to)
    if (!parent) return null
    return (
      <Button
        size="small"
        startIcon={<ArrowBackIcon />}
        onClick={() => {
          navigate(parent.to as string)
        }}
        sx={{ mb: 1.5, ml: -1 }}>
        {parent.label}
      </Button>
    )
  }

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb"
      sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { mx: 0.5, color: 'text.disabled' } }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        if (isLast || !crumb.to) {
          return (
            <Typography key={crumb.label} variant="body2" color="text.primary" fontWeight={500}>
              {crumb.label}
            </Typography>
          )
        }
        return (
          <Link
            key={crumb.label}
            component="button"
            variant="body2"
            underline="hover"
            color="text.secondary"
            onClick={() => {
              navigate(crumb.to as string)
            }}>
            {crumb.label}
          </Link>
        )
      })}
    </Breadcrumbs>
  )
}
