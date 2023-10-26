import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem
} from '@mui/material'
import React, { useContext, useMemo } from 'react'
import ExpandMoreButton from '../Components/ExpandMoreButton'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import HomeworkInfo from '../util/HomeworkInfo'
import { SupportedLocale } from '../util/SupportedLocale'

interface HomeworkCardTexts {
  edit: string
  trash: string
}

const EN_US: HomeworkCardTexts = {
  edit: 'Edit',
  trash: 'Trash'
}

const RO_RO: HomeworkCardTexts = {
  edit: 'Editează',
  trash: 'La gunoi'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

interface HomeworkCardProps {
  homework: HomeworkInfo
  onEdit?(): void
  onDelete?(): void
  defaultExpanded?: boolean
  readonly?: boolean
}

const HomeworkCard = React.memo(
  ({ homework, onEdit, onDelete, defaultExpanded = false, readonly }: HomeworkCardProps) => {
    const localeManager = useContext<LocaleHandler>(LocaleContext)
    useMemo(() => localeManager.registerComponentStrings(HomeworkCard.name, TEXTS), [])
    const componentStrings = localeManager.componentStrings(HomeworkCard.name) as HomeworkCardTexts

    const [expanded, setExpanded] = React.useState(defaultExpanded)
    const handleExpandClick = () => {
      setExpanded(!expanded)
    }
    const maxTextLength = 150
    const needsExpansion = (homework.content?.length ?? 0) > maxTextLength

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
      setAnchorEl(null)
    }

    return (
      <>
        <Card>
          <CardHeader
            title={homework.title}
            subheader={localeManager.formatLongDate(homework.createdAt, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            action={
              !readonly && (
                <IconButton aria-label="settings" onClick={handleClick}>
                  <MoreVertIcon />
                </IconButton>
              )
            }
            sx={{ pb: 0 }}
          />
          <Collapse in={expanded} timeout="auto" collapsedSize={100}>
            <CardContent sx={{ paddingTop: 0 }} className="ql-snow">
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{
                  __html: (homework.content ?? '').replace(/style="cursor: \w+-resize;"/g, '')
                }}
              />
            </CardContent>
          </Collapse>
          {needsExpansion && (
            <CardActions disableSpacing>
              <ExpandMoreButton
                expand={expanded}
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more">
                <ExpandMoreIcon />
              </ExpandMoreButton>
            </CardActions>
          )}
        </Card>
        {!readonly && (
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            // This is used for the little triangle attached to the menu
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0
                }
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
            <MenuItem
              onClick={() => {
                handleClose()
                onEdit?.()
              }}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              {componentStrings.edit}
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose()
                onDelete?.()
              }}>
              <ListItemIcon>
                <DeleteForeverIcon fontSize="small" />
              </ListItemIcon>
              {componentStrings.trash}
            </MenuItem>
          </Menu>
        )}
      </>
    )
  }
)

export default HomeworkCard
