import React from 'react'
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Collapse,
  IconButtonProps,
  styled
} from '@mui/material'
import Typography from '@mui/material/Typography'
import { shortenText } from '../util/string'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'
import { Masonry } from '@mui/lab'

interface Testimonial {
  title: string
  subtitle?: string
  content?: string
  image?: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    title: 'Ariel Roth',
    subtitle: 'Father of Savi, age nine',
    content:
      'Ms. Susanna, as she was known in our house, was our son\'s first violin teacher - and she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who could tailor her teaching to his attentional needs and to what he would find interesting. Susanna was firm when she needed to be, but engaged with him on the subjects that he was interested in, like Star Wars and Harry Potter, even making up a "Darth Vader" song for him to play on the violin as a way of motivating him.\n' +
      '\n' +
      'As a parent, we loved Susanna because she kept us informed of what was happening in the lessons and took time at the end of each lesson to show us what she taught him and what he needed to practice and how so that we could help him develop his skills.\n' +
      '\n' +
      'The payoff to working with Susanna was huge. In his school recital at the end of the year, Savi was the best string player in the bunch and his joy in playing the violin is clear. He just got back from a month at sleep away camp and the first thing he did when he got home was reach for his violin and play Song with the Wind.\n' +
      '\n' +
      "I would recommend Susanna without hesitation! If Savi's future teacher's are half as good, I'll consider myself truly fortunate."
  },
  {
    title: 'Evelyn',
    subtitle: 'Student, age five',
    image: '/static/img/evelyn-letter-square-bw-large.jpeg'
  },
  {
    title: 'Ariel Roth',
    subtitle: 'Father of Savi, age nine',
    content:
      'Ms. Susanna, as she was known in our house, was our son\'s first violin teacher - and she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who could tailor her teaching to his attentional needs and to what he would find interesting. Susanna was firm when she needed to be, but engaged with him on the subjects that he was interested in, like Star Wars and Harry Potter, even making up a "Darth Vader" song for him to play on the violin as a way of motivating him.\n' +
      '\n' +
      'As a parent, we loved Susanna because she kept us informed of what was happening in the lessons and took time at the end of each lesson to show us what she taught him and what he needed to practice and how so that we could help him develop his skills.\n' +
      '\n' +
      'The payoff to working with Susanna was huge. In his school recital at the end of the year, Savi was the best string player in the bunch and his joy in playing the violin is clear. He just got back from a month at sleep away camp and the first thing he did when he got home was reach for his violin and play Song with the Wind.\n' +
      '\n' +
      "I would recommend Susanna without hesitation! If Savi's future teacher's are half as good, I'll consider myself truly fortunate."
  },
  {
    title: 'Ariel Roth',
    subtitle: 'Father of Savi, age nine',
    content:
      'Ms. Susanna, as she was known in our house, was our son\'s first violin teacher - and she was outstanding. Savi, who has some learning issues, needed a patient teacher, one who could tailor her teaching to his attentional needs and to what he would find interesting. Susanna was firm when she needed to be, but engaged with him on the subjects that he was interested in, like Star Wars and Harry Potter, even making up a "Darth Vader" song for him to play on the violin as a way of motivating him.\n' +
      '\n' +
      'As a parent, we loved Susanna because she kept us informed of what was happening in the lessons and took time at the end of each lesson to show us what she taught him and what he needed to practice and how so that we could help him develop his skills.\n' +
      '\n' +
      'The payoff to working with Susanna was huge. In his school recital at the end of the year, Savi was the best string player in the bunch and his joy in playing the violin is clear. He just got back from a month at sleep away camp and the first thing he did when he got home was reach for his violin and play Song with the Wind.\n' +
      '\n' +
      "I would recommend Susanna without hesitation! If Savi's future teacher's are half as good, I'll consider myself truly fortunate."
  }
]

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
      <CardHeader title={testimonial.title} subheader={testimonial.subtitle ?? ''} />
      {testimonial.content && (
        <Collapse in={expanded} timeout="auto" collapsedSize={100}>
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {testimonial.content}
            </Typography>
          </CardContent>
        </Collapse>
      )}
      {testimonial.image && <CardMedia component="img" image={testimonial.image} />}
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
  return (
    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2} sx={{ m: 0, p: 0 }}>
      {TESTIMONIALS.map((t, i) => (
        <TestimonialCard key={i} testimonial={t} />
      ))}
    </Masonry>
  )
}
