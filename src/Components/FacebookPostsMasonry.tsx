import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Masonry } from '@mui/lab'
import {
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Checkbox,
  Collapse,
  IconButton,
  ImageList,
  ImageListItem,
  Link,
  Typography
} from '@mui/material'
import Fab from '@mui/material/Fab'
import React, { useContext } from 'react'
import FACEBOOK_POSTS, { FACEBOOK_AVATAR } from '../data/FacebookPosts'
import { LocaleContext, LocaleHandler } from '../store/LocaleProvider'
import { AttachmentType } from '../util/AttachmentType'
import { PrettyAttachment, PrettyPost } from '../util/PrettyPost'
import { withBaseURL } from '../util/string'
import ExpandMoreButton from './ExpandMoreButton'
import TextWithLinks from './TextWithLinks'

export interface FacebookPostCardProps {
  post: PrettyPost
  onSelectToggle?: (post: PrettyPost, selected: boolean) => void
  onDelete?: (post: PrettyPost) => void
}

export interface PostMediaProps {
  attachments?: PrettyAttachment[]
}

export function PostMedia({ attachments }: PostMediaProps) {
  if (!attachments?.length) {
    return <></>
  }
  if (attachments.length === 1) {
    const attachment = attachments[0]
    const isVideo = attachment.type === AttachmentType.VIDEO

    return (
      <>
        <Link rel="noreferrer" target="_blank" href={attachment.url}>
          <Box
            // For getting the image to stretch to the available space.
            // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
            sx={{
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
            <img
              src={withBaseURL(attachment.thumbnailUrl ?? attachment.url)}
              alt="Photo from the post"
              // For getting the image to stretch to the available space.
              // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
              style={{
                flexShrink: 0,
                minWidth: '100%',
                minHeight: '100%',
                maxHeight: attachment.width >= attachment.height ? '450px' : ''
              }}
            />
            {isVideo && (
              <Fab
                aria-label="play"
                sx={{ position: 'absolute', top: 'calc(50% - 28px)', left: 'calc(50% - 28px)' }}>
                <PlayArrowIcon />
              </Fab>
            )}
          </Box>
        </Link>
      </>
    )
  }

  attachments = attachments.filter((a) => a.type !== AttachmentType.ALBUM)

  return (
    <ImageList variant="masonry" cols={2}>
      {attachments.map((attachment, i) => (
        <ImageListItem
          key={i}
          component={Link}
          rel="noreferrer"
          target="_blank"
          href={attachment.url}>
          <img
            src={withBaseURL(attachment.thumbnailUrl ?? attachment.url)}
            loading="lazy"
            alt="Photo from the post"
          />
        </ImageListItem>
      ))}
    </ImageList>
  )
}

export function FacebookPostCard({ post, onSelectToggle, onDelete }: FacebookPostCardProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  const mediaCollapsedSize = 300
  const textCollapsedSize = 100
  const attachments = post.attachments ?? []
  const mediaNeedsExpansion = attachments.length > 4
  const textNeedsExpansion = (post.message ?? '').length > 150
  const needsExpansion = mediaNeedsExpansion || textNeedsExpansion

  const media = <CardMedia component={PostMedia} attachments={post.attachments} />
  const message = post.message && (
    <CardContent>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
        <TextWithLinks text={post.message} />
      </Typography>
    </CardContent>
  )

  return (
    <Card>
      <CardHeader
        avatar={
          <Link href="https://www.facebook.com/MusicwithMsJohnson" rel="noreferrer" target="_blank">
            <Avatar
              alt={post.userName}
              src={withBaseURL(FACEBOOK_AVATAR)}
              aria-label={post.userName}
            />
          </Link>
        }
        title={
          <Link
            href="https://www.facebook.com/MusicwithMsJohnson"
            rel="noreferrer"
            target="_blank"
            color="inherit"
            underline="hover">
            {post.userName}
          </Link>
        }
        subheader={
          <Link href={post.url} rel="noreferrer" target="_blank" color="inherit" underline="hover">
            {localeManager.formatLongDate(post.creationTime)}
          </Link>
        }
      />
      {mediaNeedsExpansion ? (
        <Collapse in={expanded} timeout="auto" collapsedSize={mediaCollapsedSize}>
          {media}
        </Collapse>
      ) : (
        media
      )}
      {textNeedsExpansion ? (
        <Collapse in={expanded} timeout="auto" collapsedSize={textCollapsedSize}>
          {message}
        </Collapse>
      ) : (
        message
      )}
      <CardActions disableSpacing>
        {onSelectToggle && <Checkbox onChange={(e) => onSelectToggle(post, e.target.checked)} />}
        {onDelete && (
          <IconButton aria-label="delete" onClick={() => onDelete(post)}>
            <DeleteIcon />
          </IconButton>
        )}

        {needsExpansion && (
          <ExpandMoreButton
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more">
            <ExpandMoreIcon />
          </ExpandMoreButton>
        )}
      </CardActions>
    </Card>
  )
}

export interface FacebookPostsMasonryProps {
  posts?: PrettyPost[]
  onPostSelectToggle?: (post: PrettyPost, selected: boolean) => void
  onPostDelete?: (post: PrettyPost) => void
}

export default function FacebookPostsMasonry({
  posts = FACEBOOK_POSTS,
  onPostSelectToggle,
  onPostDelete
}: FacebookPostsMasonryProps) {
  return (
    <Masonry columns={{ xs: 1, sm: 2, md: 2 }} spacing={1} sx={{ m: 0, p: 0 }}>
      {posts.map((p) => (
        <FacebookPostCard
          key={p.id}
          post={p}
          onDelete={onPostDelete}
          onSelectToggle={onPostSelectToggle}
        />
      ))}
    </Masonry>
  )
}
