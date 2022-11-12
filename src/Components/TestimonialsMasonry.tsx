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

export interface Testimonial {
  title: string
  subtitle?: string
  content?: string | React.ReactNode
  image?: string
  rating?: number
  ratingUrl?: string
  /** Only used if content is a node */
  expandable?: boolean
}

const TESTIMONIALS_EN_US: Testimonial[] = [
  {
    title: 'Ariel Roth',
    subtitle: 'Parent of Savi, age nine',
    content: (
      <>
        <Typography variant="body2" color="text.secondary" paragraph>
          Ms. Susanna, as she was known in our house, was our son&apos;s first violin teacher - and
          she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who
          could tailor her teaching to his attentional needs and to what he would find interesting.
          Susanna was firm when she needed to be, but engaged with him on the subjects that he was
          interested in, like Star Wars and Harry Potter, even making up a &quot;Darth Vader&quot;
          song for him to play on the violin as a way of motivating him.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          As a parent, we loved Susanna because she kept us informed of what was happening in the
          lessons and took time at the end of each lesson to show us what she taught him and what he
          needed to practice and how so that we could help him develop his skills.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          The payoff to working with Susanna was huge. In his school recital at the end of the year,
          Savi was the best string player in the bunch and his joy in playing the violin is clear.
          He just got back from a month at sleep away camp and the first thing he did when he got
          home was reach for his violin and play Song with the Wind.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          I would recommend Susanna without hesitation! If Savi&apos;s future teacher&apos;s are
          half as good, I&apos;ll consider myself truly fortunate.
        </Typography>
      </>
    ),
    rating: 5,
    expandable: true
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-letter-square-bw-large.jpeg'
  },
  {
    title: 'Hari',
    subtitle: 'Parent',
    content:
      'Susanna has been teaching my daughter viola for 2 years. She is a fantastic teacher and my daughter is thriving under her tutelage. She knows exactly the pace at which to teach and what pieces to use, and her teaching of technique is very good. The most important endorsement I can make is that my daughter is so eager to go to her weekly lessons!',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Rawi S.',
    subtitle: 'Student',
    content:
      'Susanna is a very thoughtful and innovative instructor. I have learned a lot from her and am now able to play the viola piece within months after so many years of struggling with other instructors. The sadness that struck me as the months I have spent learning from her drew to a close derives from the fact that she has been one of my best instructors ever! It is sad to see her move to Boston but my loss is your gain. Highly recommended.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Gracie',
    subtitle: 'Student',
    image: '/static/img/gracie-letter-bw-small.webp'
  },
  {
    title: 'Mariana',
    subtitle: 'Parent of middle school/high school student',
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 4,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Andreea Teleche',
    subtitle: 'Parent of Tudor, age seven',
    // TODO
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 5,
    image: '/static/img/tudor-large.jpeg'
  },
  {
    title: 'Joanna',
    subtitle: 'Parent of five year old student',
    content:
      'Susanna is an amazinging patient instructor with my wiggly five year old. Children have short attention spans, but Susanna is able to refocus my daughters attention to keep her engaged in the lesson. So happy to have been able to give my daughter a positive introduction to music.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-small.webp'
  }
]

const TESTIMONIALS_RO_RO: Testimonial[] = [
  {
    title: 'Ariel Roth',
    subtitle: 'Tatăl lui Savi, băiat de nouă ani',
    content: (
      <>
        <Typography variant="body2" color="text.secondary" paragraph>
          Ms. Susanna, as she was known in our house, was our son&apos;s first violin teacher - and
          she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who
          could tailor her teaching to his attentional needs and to what he would find interesting.
          Susanna was firm when she needed to be, but engaged with him on the subjects that he was
          interested in, like Star Wars and Harry Potter, even making up a &quot;Darth Vader&quot;
          song for him to play on the violin as a way of motivating him.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          As a parent, we loved Susanna because she kept us informed of what was happening in the
          lessons and took time at the end of each lesson to show us what she taught him and what he
          needed to practice and how so that we could help him develop his skills.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          The payoff to working with Susanna was huge. In his school recital at the end of the year,
          Savi was the best string player in the bunch and his joy in playing the violin is clear.
          He just got back from a month at sleep away camp and the first thing he did when he got
          home was reach for his violin and play Song with the Wind.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          I would recommend Susanna without hesitation! If Savi&apos;s future teacher&apos;s are
          half as good, I&apos;ll consider myself truly fortunate.
        </Typography>
      </>
    ),
    rating: 5,
    expandable: true
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-letter-square-bw-large.jpeg'
  },
  {
    title: 'Hari',
    subtitle: 'Parent',
    content:
      'Susanna has been teaching my daughter viola for 2 years. She is a fantastic teacher and my daughter is thriving under her tutelage. She knows exactly the pace at which to teach and what pieces to use, and her teaching of technique is very good. The most important endorsement I can make is that my daughter is so eager to go to her weekly lessons!',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Rawi S.',
    subtitle: 'Student',
    content:
      'Susanna is a very thoughtful and innovative instructor. I have learned a lot from her and am now able to play the viola piece within months after so many years of struggling with other instructors. The sadness that struck me as the months I have spent learning from her drew to a close derives from the fact that she has been one of my best instructors ever! It is sad to see her move to Boston but my loss is your gain. Highly recommended.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Gracie',
    subtitle: 'Student',
    image: '/static/img/gracie-letter-bw-small.webp'
  },
  {
    title: 'Mariana',
    subtitle: 'Parent of middle school/high school student',
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 4,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Andreea Teleche',
    subtitle: 'Parent of Tudor, age seven',
    // TODO
    content:
      'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the forth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Bosotn area.',
    rating: 5,
    image: '/static/img/tudor-large.jpeg'
  },
  {
    title: 'Joanna',
    subtitle: 'Parent of five year old student',
    content:
      'Susanna is an amazinging patient instructor with my wiggly five year old. Children have short attention spans, but Susanna is able to refocus my daughters attention to keep her engaged in the lesson. So happy to have been able to give my daughter a positive introduction to music.',
    rating: 5,
    ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-small.webp'
  }
]

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
            {typeof testimonial.content === 'string' ? (
              <Typography variant="body2" color="text.secondary">
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
    </Card>
  )
})

export default function TestimonialsMasonry() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => {
    const enUS = TESTIMONIALS_EN_US.reduce(
      (map, t, i) =>
        Object.defineProperty(map, `${i}`, {
          get: () => <TestimonialCard key={i} testimonial={t} />
        }),
      {}
    )

    const roRO = TESTIMONIALS_RO_RO.reduce(
      (map, t, i) =>
        Object.defineProperty(map, `${i}`, {
          get: () => <TestimonialCard key={i} testimonial={t} />
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
  return (
    <>
      <Grid2 container>
        <Grid2 xs={12}>
          <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2} sx={{ m: 0, p: 0 }}>
            {TESTIMONIALS_EN_US.map((_, i) => componentStrings[`${i}`])}
          </Masonry>
        </Grid2>
      </Grid2>
    </>
  )
}
