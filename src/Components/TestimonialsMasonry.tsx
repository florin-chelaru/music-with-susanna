import React, { useContext, useMemo } from 'react'
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Collapse,
  Link,
  Rating
} from '@mui/material'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Masonry } from '@mui/lab'
import Grid2 from '@mui/material/Unstable_Grid2'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import ExpandMoreButton from './ExpandMoreButton'
import { SupportedLocale } from '../util/SupportedLocale'
import { Testimonial, TESTIMONIALS } from '../data/Testimonials'
import { withBaseURL } from '../util/string'

interface TestimonialCardProps {
  testimonial: Testimonial
}

const TestimonialCard = React.memo(({ testimonial }: TestimonialCardProps) => {
  const [expanded, setExpanded] = React.useState(false)
  const handleExpandClick = () => {
    setExpanded(!expanded)
  }
  const maxTextLength = 150
  const needsExpansion =
    testimonial.expandable ??
    (typeof testimonial.content === 'string' && testimonial.content.length > maxTextLength)
  return (
    <Card>
      <CardHeader title={testimonial.title} subheader={testimonial.subtitle ?? ''} sx={{ pb: 0 }} />
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
            {typeof testimonial.content === 'string' ? (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {testimonial.content}
              </Typography>
            ) : (
              testimonial.content
            )}
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
          <ExpandMoreButton
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more">
            <ExpandMoreIcon />
          </ExpandMoreButton>
        </CardActions>
      )}
      {testimonial.image && typeof testimonial.image === 'string' && (
        <CardMedia component="img" image={withBaseURL(testimonial.image)} />
      )}
      {testimonial.image &&
        Array.isArray(testimonial.image) &&
        testimonial.image.map((img, i) => (
          <CardMedia component="img" image={withBaseURL(img)} key={i} />
        ))}
    </Card>
  )
})

interface TestimonialInfo {
  card: React.ReactNode
  testimonial: Testimonial
}

export interface TestimonialsMasonryProps {
  showFeaturedTestimonials?: boolean
}

export default function TestimonialsMasonry({
  showFeaturedTestimonials
}: TestimonialsMasonryProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => {
    const enUS = TESTIMONIALS.reduce(
      (map: { [key: string]: TestimonialInfo }, t, i) =>
        Object.defineProperty(map, `${i}`, {
          get: (): TestimonialInfo => {
            return {
              card: <TestimonialCard key={i} testimonial={t[SupportedLocale.EN_US]} />,
              testimonial: t[SupportedLocale.EN_US]
            }
          }
        }),
      {}
    )

    const roRO = TESTIMONIALS.reduce(
      (map: { [key: string]: TestimonialInfo }, t, i) =>
        Object.defineProperty(map, `${i}`, {
          get: (): TestimonialInfo => {
            return {
              card: <TestimonialCard key={i} testimonial={t[SupportedLocale.RO_RO]} />,
              testimonial: t[SupportedLocale.RO_RO]
            }
          }
        }),
      {}
    )

    localeManager.registerComponentStrings(
      TestimonialsMasonry.name,
      new Map<SupportedLocale, LocalizedData>([
        [SupportedLocale.EN_US, enUS],
        [SupportedLocale.RO_RO, roRO]
      ])
    )
  }, [])

  const componentStrings = localeManager.componentStrings(TestimonialsMasonry.name)
  const testimonials: TestimonialInfo[] = TESTIMONIALS.map((_, i) => componentStrings[`${i}`])

  return (
    <>
      <Grid2 container>
        {showFeaturedTestimonials &&
          testimonials
            .filter((t) => t.testimonial.featured)
            .map((t, i) => (
              <Grid2 xs={12} key={i}>
                {t.card}
              </Grid2>
            ))}
        <Grid2 xs={12} sx={{ p: 0 }}>
          <Masonry columns={{ xs: 1, sm: 2, md: 2 }} spacing={2} sx={{ m: 0, p: 0 }}>
            {testimonials
              .filter((t) => !showFeaturedTestimonials || !t.testimonial.featured)
              .map((t) => t.card)}
          </Masonry>
        </Grid2>
      </Grid2>
    </>
  )
}
