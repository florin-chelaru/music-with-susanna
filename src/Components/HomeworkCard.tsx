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
import React from 'react'
import ExpandMoreButton from '../Components/ExpandMoreButton'
import HomeworkInfo from '../util/HomeworkInfo'
import { dateStringToPrettyDate } from '../util/date'

interface HomeworkCardProps {
  homework: HomeworkInfo
  onEdit?(): void
  onDelete?(): void
  defaultExpanded?: boolean
  readonly?: boolean
}

const HomeworkCard = React.memo(
  ({ homework, onEdit, onDelete, defaultExpanded = false, readonly }: HomeworkCardProps) => {
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
            subheader={dateStringToPrettyDate(homework.createdAt)}
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
                dangerouslySetInnerHTML={{ __html: homework.content ?? '' }}
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
              Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose()
                onDelete?.()
              }}>
              <ListItemIcon>
                <DeleteForeverIcon fontSize="small" />
              </ListItemIcon>
              Trash
            </MenuItem>
          </Menu>
        )}
      </>
    )
  }
)

export default HomeworkCard
