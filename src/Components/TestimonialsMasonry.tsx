import React, { useContext } from 'react'
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Collapse,
  IconButtonProps,
  Link,
  Rating,
  styled
} from '@mui/material'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'
import { Masonry } from '@mui/lab'
import Grid2 from '@mui/material/Unstable_Grid2'
import { LocaleContext, LocaleManager, Testimonial } from '../store/LocaleProvider'

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props
  return <IconButton {...other} />
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest
  })
}))

interface TestimonialCardProps {
  testimonial: Testimonial
}

const TestimonialCard = React.memo(({ testimonial }: TestimonialCardProps) => {
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  const maxTextLength = 150
  const needsExpansion = (testimonial?.content ?? '').length > maxTextLength
  return (
    <Card>
      <CardHeader title={testimonial.title} subheader={testimonial.subtitle ?? ''} sx={{ pb: 0 }} />
      {testimonial.image && <CardMedia component="img" image={testimonial.image} />}
      {testimonial.content && (
        <Collapse in={expanded} timeout="auto" collapsedSize={100}>
          <CardContent>
            {testimonial.rating && testimonial.ratingUrl && (
              <Link href={testimonial.ratingUrl}>
                <Rating name="read-only" value={testimonial.rating} readOnly size="small" />
              </Link>
            )}
            {testimonial.rating && !testimonial.ratingUrl && (
              <Rating name="read-only" value={testimonial.rating} readOnly size="small" />
            )}
            <Typography variant="body2" color="text.secondary">
              {testimonial.content}
            </Typography>
          </CardContent>
        </Collapse>
      )}
      {!testimonial.content && testimonial.rating && testimonial.ratingUrl && (
        <CardContent>
          <Link href={testimonial.ratingUrl}>
            <Rating name="read-only" value={testimonial.rating} readOnly size="small" />
          </Link>
        </CardContent>
      )}
      {!testimonial.content && testimonial.rating && !testimonial.ratingUrl && (
        <CardContent>
          <Rating name="read-only" value={testimonial.rating} readOnly size="small" />
        </CardContent>
      )}
      {needsExpansion && (
        <CardActions disableSpacing>
          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more">
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActions>
      )}
    </Card>
  )
})

export default function TestimonialsMasonry() {
  const strings = useContext<LocaleManager>(LocaleContext).stringList
  return (
    <>
      <Grid2 container>
        <Grid2 xs={12} display="flex" justifyContent="center" textAlign="center" sx={{ pb: 0 }}>
          <Typography variant="button" gutterBottom>
            {strings.testimonials}
          </Typography>
        </Grid2>
        <Grid2 xs={12}>
          <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2} sx={{ m: 0, p: 0 }}>
            {strings.testimonialList.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} />
            ))}
          </Masonry>
        </Grid2>
      </Grid2>
    </>
  )
}
