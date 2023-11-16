import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Link,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { Unsubscribe, get, onValue, ref } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { User, UserRole } from '../util/User'
import { scrollToTop } from '../util/window'

interface TeachersPageTexts {
  homework: string
  violin: string
  computerScience: string
}

const EN_US: TeachersPageTexts = {
  homework: 'Homework',
  violin: 'Violin',
  computerScience: 'Computer Science'
}

const RO_RO: TeachersPageTexts = {
  homework: 'Teme pe acasă',
  violin: 'Vioară',
  computerScience: 'Informatică'
}

const TEACHERS_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface TeachersPageProps {}

export default function SubjectsPage({}: TeachersPageProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(SubjectsPage.name, TEACHERS_PAGE_TEXTS), [])
  const componentStrings = localeManager.componentStrings(SubjectsPage.name) as TeachersPageTexts

  const { user } = useUser()
  const navigate = useNavigate()

  const teachersUnsubscriberRef = useRef<Unsubscribe>()

  async function getTeacherInfo(teacherId: string): Promise<User | undefined> {
    try {
      const snapshot = await get(ref(database, `users/${teacherId}`))
      const { email, name, subject } = snapshot.val()

      return new User({ email, name, subject })
    } catch (e) {
      console.error(`Could not retrieve name of teacher id ${teacherId}: ${e}`)
      return undefined
    }
  }

  const teacherCache = useRef<Map<string, User>>(new Map())
  const [teachers, setTeachers] = useState<User[]>([])

  useEffect(() => {
    if (teachersUnsubscriberRef.current) {
      teachersUnsubscriberRef.current()
    }

    if (user.loading) {
      return
    }
    if (!user.uid) {
      navigate('/login')
      return
    }

    if (user.role !== UserRole.STUDENT) {
      navigate('/')
      return
    }

    teachersUnsubscriberRef.current = onValue(
      ref(database, `students/${user.uid}/teachers`),
      async (snapshot) => {
        const teacherIds = Object.keys(snapshot.val())
        const teachers: User[] = []

        const teacherNamePromises = new Map<string, Promise<User | undefined>>()
        for (const teacherId of teacherIds) {
          const teacher = teacherCache.current.get(teacherId)
          if (!teacher) {
            teacherNamePromises.set(teacherId, getTeacherInfo(teacherId))
            continue
          }
          teachers.push(teacher)
        }
        for (const p of teacherNamePromises) {
          const teacher = await p[1]
          if (teacher) {
            teacher.uid = p[0]
            teacherCache.current.set(p[0], teacher)
            teachers.push(teacher)
          }
        }
        setTeachers(teachers)
      },
      (error) => {
        console.error(`Could not fetch teachers: ${error}`)
        setTeachers([])
      }
    )
  }, [user])

  const [value, setValue] = useState('')
  const valueChanged = (v: any) => {
    setValue(v)
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        {teachers.map((teacher) => (
          <Grid2 xs={12} sm={6} md={4} key={teacher.uid}>
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header">
                <Stack direction="column" spacing={0.5}>
                  <Typography>{(componentStrings as any)[teacher.subject ?? '']}</Typography>
                  <Typography variant="subtitle2">{teacher.name}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Link
                  underline="hover"
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/homework/${teacher.uid}/${user.uid}`)
                    scrollToTop()
                  }}>
                  <Typography variant="body1" gutterBottom component="h2">
                    {componentStrings.homework}
                  </Typography>
                </Link>
              </AccordionDetails>
            </Accordion>
          </Grid2>
        ))}
      </Grid2>
    </Container>
  )
}
